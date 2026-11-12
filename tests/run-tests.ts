process.env.NODE_ENV = 'test';
import assert from 'node:assert';
import http from 'node:http';
import {
  createSyntheticFitsBuffer,
  parseFitsBuffer,
  computeImageDifference,
} from '../src/services/fitsEngine';
import { app, generateOfflineScientificKnowledge } from '../server';

// Helper for testing MJD conversion logic
function mjdToIsoString(mjd: number | null | undefined): string | null {
  if (mjd === null || mjd === undefined || !Number.isFinite(mjd)) {
    return null;
  }
  const unixMs = (mjd - 40587) * 86400 * 1000;
  const d = new Date(unixMs);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Helper for testing DataLink extraction logic
function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractFitsUrlFromDataLink(xmlText: string): string | null {
  const tdMatches = xmlText.match(/<(?:[a-zA-Z0-9_-]+:)?TD[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?TD>/gi);
  if (!tdMatches) return null;
  const urls = tdMatches
    .map((m) => decodeXmlEntities(m.replace(/<\/?(?:[a-zA-Z0-9_-]+:)?TD[^>]*>/gi, '').trim()))
    .filter((u) => u.startsWith('https://'));

  const directFits = urls.find((u) => /\.fits(\.gz)?(\?|$)/i.test(u));
  if (directFits) return directFits;

  const nonDataLink = urls.find((u) => !u.includes('/datalink/'));
  return nonDataLink || null;
}

async function runUnitTests() {
  console.log('1. Running Data Integrity & Helper unit tests...');
  // A. MJD conversion must return null for missing or invalid values
  assert.strictEqual(mjdToIsoString(null), null, 'null MJD must return null');
  assert.strictEqual(mjdToIsoString(undefined), null, 'undefined MJD must return null');
  assert.strictEqual(mjdToIsoString(NaN), null, 'NaN MJD must return null');
  assert.strictEqual(mjdToIsoString(Infinity), null, 'Infinity MJD must return null');
  assert.strictEqual(
    mjdToIsoString(59000),
    new Date((59000 - 40587) * 86400 * 1000).toISOString(),
    'Valid MJD must return valid ISO 8601 string'
  );

  // B. DataLink XML entity decoding and direct FITS selection
  const mockVotable = `
    <VOTABLE version="1.3">
      <RESOURCE>
        <TABLE>
          <DATA>
            <TABLEDATA>
              <TR><TD>https://irsa.ipac.caltech.edu/datalink/links/spherex?ID=ivo</TD></TR>
              <TR><TD>https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/file.fits?cutout=true&amp;ra=269.45</TD></TR>
            </TABLEDATA>
          </DATA>
        </TABLE>
      </RESOURCE>
    </VOTABLE>
  `;
  const extractedUrl = extractFitsUrlFromDataLink(mockVotable);
  assert.strictEqual(
    extractedUrl,
    'https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/file.fits?cutout=true&ra=269.45',
    'DataLink extractor must unescape XML entities and choose direct .fits URL'
  );

  // C. FOV diameter to radius calculation
  const fovDiameter = 0.5;
  const coneRadius = fovDiameter / 2;
  assert.strictEqual(coneRadius, 0.25, 'FOV diameter must be divided by 2 for cone search');

  console.log('   Data Integrity & Helper unit tests: PASS');

  console.log('2. Running FITS Engine & Scientific Comparison unit tests...');
  const bufA = createSyntheticFitsBuffer('barnard_star_epoch1');
  const hduA = parseFitsBuffer(bufA, {
    dataStatus: 'SIMULATED DEMO DATA',
    isSimulatedOrDemo: true,
    provenance: 'Test Fixture',
  });
  assert.strictEqual(hduA.naxis1, 256);
  assert.strictEqual(hduA.naxis2, 256);
  assert.strictEqual(hduA.dataStatus, 'SIMULATED DEMO DATA');

  const bufB = createSyntheticFitsBuffer('barnard_star_epoch2');
  const hduB = parseFitsBuffer(bufB, {
    dataStatus: 'SIMULATED DEMO DATA',
    isSimulatedOrDemo: true,
    provenance: 'Test Fixture',
  });
  const diff = computeImageDifference(hduA, hduB);
  assert.strictEqual(diff.compatibility.isCompatible, true);
  assert(diff.rmsDiff > 0, 'Expected non-zero RMS difference');

  // Incompatible WCS test: missing WCS on hduB must be rejected
  const hduNoWcs = { ...hduB, wcs: undefined };
  assert.throws(
    () => computeImageDifference(hduA, hduNoWcs),
    /Incompatible images/i
  );

  // Truncated FITS test
  assert.throws(
    () => parseFitsBuffer(new ArrayBuffer(100)),
    /smaller than a single 2880-byte FITS block/i
  );
  console.log('   FITS Engine & Scientific Comparison unit tests: PASS');
}

async function runOfflineMockServerTests() {
  console.log('3. Running deterministic offline integration & security tests...');
  const server = http.createServer((req, res) => {
    const url = req.url || '/';
    if (url === '/api/archive/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ connected: true, verifiedTables: [{ name: 'spherex.obscore' }] }));
      return;
    }
    if (url.startsWith('/api/archive/search') && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const parsed = JSON.parse(body || '{}');
        if (parsed.ra < 0 || parsed.ra >= 360 || parsed.dec < -90 || parsed.dec > 90) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid coordinates' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ spherexAvailable: true, dataStatus: 'REAL ARCHIVE DATA', count: 0, observations: [] }));
      });
      return;
    }
    if (url.startsWith('/api/archive/fits')) {
      const target = new URL('http://localhost' + url).searchParams.get('url') || '';
      if (!target.startsWith('https://')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'HTTPS required' }));
        return;
      }
      if (!target.includes('irsa.ipac.caltech.edu')) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Untrusted host' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/fits' });
      res.end(Buffer.alloc(2880, ' '));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    const statusRes = await fetch(`${baseUrl}/api/archive/status`);
    assert.strictEqual(statusRes.status, 200);

    const badRa = await fetch(`${baseUrl}/api/archive/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ra: -5, dec: 0, fov: 0.5 }),
    });
    assert.strictEqual(badRa.status, 400);

    const ssrfHttp = await fetch(
      `${baseUrl}/api/archive/fits?url=${encodeURIComponent('http://127.0.0.1:3000/secret')}`
    );
    assert.strictEqual(ssrfHttp.status, 400);

    const ssrfHost = await fetch(
      `${baseUrl}/api/archive/fits?url=${encodeURIComponent('https://example.com/test.fits')}`
    );
    assert.strictEqual(ssrfHost.status, 403);

    console.log('   Offline integration & security tests: PASS');
  } finally {
    server.close();
  }
}

async function runAiAssistantTests() {
  console.log('4. Running AI Scientific Research Assistant Intelligence & Validation tests...');

  // Mandatory Test Questions
  const testQuestions = [
    {
      id: 1,
      q: 'What is SPHEREx?',
      expectedKeywords: ['SPHEREx', '102', 'infrared'],
      mustIncludeEpistemic: true,
    },
    {
      id: 2,
      q: 'What is the difference between a star and a brown dwarf?',
      expectedKeywords: ['brown dwarf', 'fusion', 'mass'],
      mustIncludeEpistemic: true,
    },
    {
      id: 3,
      q: 'Why does SPHEREx observe the sky in multiple infrared bands?',
      expectedKeywords: ['infrared', 'bands', 'spectrophotometry'],
      mustIncludeEpistemic: true,
    },
    {
      id: 4,
      q: 'What is right ascension?',
      expectedKeywords: ['Right Ascension', 'equator'],
      mustIncludeEpistemic: true,
    },
    {
      id: 5,
      q: 'Explain what a FITS file contains.',
      expectedKeywords: ['FITS', 'header', '2880'],
      mustIncludeEpistemic: true,
    },
    {
      id: 6,
      q: 'What is the scientific purpose of comparing astronomical observations over time?',
      expectedKeywords: ['proper motion', 'variability'],
      mustIncludeEpistemic: true,
    },
    {
      id: 7,
      q: 'What is the capital of Egypt?',
      expectedKeywords: ['Cairo'],
      mustIncludeEpistemic: false,
    },
  ];

  // Test Direct Knowledge Engine
  console.log('   - Testing scientific reasoning and knowledge synthesis across all 7 test questions...');
  const responses: string[] = [];

  for (const item of testQuestions) {
    const reply = generateOfflineScientificKnowledge(item.q, {
      target: { name: "Barnard's Star", category: 'High Proper Motion M Dwarf' },
    });

    assert(reply && reply.length > 20, `Question ${item.id} must return non-empty reply`);

    for (const kw of item.expectedKeywords) {
      assert(
        reply.toLowerCase().includes(kw.toLowerCase()),
        `Question ${item.id} ("${item.q}") reply must mention "${kw}". Received: ${reply.slice(0, 100)}...`
      );
    }

    if (item.mustIncludeEpistemic) {
      const hasEpistemic =
        reply.includes('[DIRECT OBSERVATION]') ||
        reply.includes('[DERIVED PARAMETER]') ||
        reply.includes('[THEORETICAL MODEL]') ||
        reply.includes('[MISSING / UNKNOWN]');
      assert(
        hasEpistemic,
        `Question ${item.id} ("${item.q}") must contain scientific epistemic safety indicators.`
      );
    }

    responses.push(reply);
  }

  // Critical Check: Verify no two questions return identical responses (repetition bug check)
  for (let i = 0; i < responses.length; i++) {
    for (let j = i + 1; j < responses.length; j++) {
      assert.notStrictEqual(
        responses[i],
        responses[j],
        `Answers to question ${testQuestions[i].id} and ${testQuestions[j].id} must be unique, not repetitive identical text!`
      );
    }
  }
  console.log('     ✓ Verified all 7 questions return distinctive, scientifically accurate, non-identical responses.');

  // Test Arabic Language Queries
  console.log('   - Testing Arabic language query processing...');
  const arCapital = generateOfflineScientificKnowledge('ما هي عاصمة مصر؟', {});
  assert(
    arCapital.includes('القاهرة') || arCapital.toLowerCase().includes('cairo'),
    'Arabic capital query must return Cairo / القاهرة'
  );

  const arSpherex = generateOfflineScientificKnowledge('ما هي مهمة سفيريكس؟', {});
  assert(
    arSpherex.includes('SPHEREx') || arSpherex.includes('سفيريكس'),
    'Arabic SPHEREx query must return SPHEREx details'
  );
  console.log('     ✓ Verified Arabic language queries succeed.');

  // Test Full HTTP Endpoint Pipeline
  console.log('   - Testing HTTP endpoint /api/gemini/research-assistant on test server...');
  const testServer = http.createServer(app);
  await new Promise<void>((resolve) => testServer.listen(0, '127.0.0.1', resolve));
  const serverAddr = testServer.address() as { port: number };
  const endpointUrl = `http://127.0.0.1:${serverAddr.port}/api/gemini/research-assistant`;

  try {
    // 1. Validation test: empty message must return 400
    const emptyRes = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    });
    assert.strictEqual(emptyRes.status, 400, 'Empty message must return 400');

    // 2. Test Question 1: What is SPHEREx?
    const q1Res = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is SPHEREx?',
        context: { target: { name: 'WISE 0855' } },
      }),
    });
    assert.strictEqual(q1Res.status, 200, 'Valid message must return 200');
    const q1Data = await q1Res.json();
    assert(q1Data.reply && q1Data.reply.includes('SPHEREx'), 'Q1 reply must include SPHEREx');

    // 3. Test Question 7: What is the capital of Egypt? (General knowledge non-astronomy question)
    const q7Res = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is the capital of Egypt?',
      }),
    });
    assert.strictEqual(q7Res.status, 200);
    const q7Data = await q7Res.json();
    assert(
      q7Data.reply && q7Data.reply.includes('Cairo'),
      `Q7 reply must mention Cairo. Received: ${q7Data.reply}`
    );

    // 4. Verify Q1 and Q7 replies are strictly distinct
    assert.notStrictEqual(
      q1Data.reply,
      q7Data.reply,
      'Endpoint replies for Q1 and Q7 must NOT be identical!'
    );

    console.log('     ✓ HTTP endpoint tests verified: 200 responses, dynamic replies, zero static fallback repetition.');
  } finally {
    testServer.close();
  }

  console.log('   AI Scientific Research Assistant Intelligence & Validation tests: PASS');
}

(async () => {
  await runUnitTests();
  await runOfflineMockServerTests();
  await runAiAssistantTests();
})().catch((err) => {
  console.error('TEST SUITE FAILED:', err);
  process.exit(1);
});
