# SPHEREx ATLAS — Explore the Infrared Universe

**SPHEREx ATLAS** is a scientific astronomical exploration and research platform built for the NASA Space Apps Challenge. It connects directly to **NASA/IPAC IRSA TAP (`spherex.obscore`)**, **IVOA DataLink**, and **CDS Sesame** to search, retrieve, parse, and visualize SPHEREx near-infrared observations with strict scientific provenance tracking.

---

## Key Features & Scientific Provenance

Every dataset, image, spectrum, and export in SPHEREx ATLAS is tagged with an explicit provenance status:
- **`REAL ARCHIVE DATA` / `REAL SPHEREx ARCHIVE DATA`**: Retrieved live from NASA/IPAC IRSA (`spherex.obscore` / IVOA DataLink) and validated (`SIMPLE  =` FITS header).
- **`EXTERNAL CATALOG DATA`**: Resolved from external astronomical catalogs (e.g., CDS Sesame / SIMBAD).
- **`SIMULATED DEMO DATA`**: Synthetic FITS buffers or educational 102-band spectral models, isolated from real archive results.
- **`UNAVAILABLE DATA`**: Honest state when no SPHEREx observations exist for a sky region or an upstream service is unreachable.

---

## Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, HTML5 Canvas FITS renderer (`src/services/fitsEngine.ts`).
- **Backend**: Express + Vite middleware (`server.ts`) running on port `3000`, providing:
  - `GET /api/archive/status` — Live IRSA TAP connectivity & `TAP_SCHEMA.tables` verification.
  - `POST /api/archive/search` — ADQL spatial cone search (`CONTAINS(POINT('ICRS', s_ra, s_dec), CIRCLE(...))`) against `spherex.obscore`.
  - `GET /api/archive/fits?url=...` — SSRF-protected FITS proxy with IVOA DataLink VOTable resolution, HTTPS-only host allowlisting, `100 MB` size limit, and `SIMPLE  =` header validation.
  - `GET /api/astronomy/resolve?target=...` — CDS Sesame target name resolver.
  - `GET /api/archive/benchmark-simulation` — Isolated educational benchmark endpoint.

---

## Installation & Running Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Configure environment variables** (copy `.env.example` to `.env` if using Gemini AI):
   ```bash
   cp .env.example .env
   ```
3. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application runs at `http://localhost:3000`.

4. **Build & Type-Check**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```

5. **Run Automated Tests**:
   ```bash
   npm test
   ```

---

## Scientific Limitations

- **2D Spectral-Image Products**: `spherex.obscore` provides 2D spectral-image/cutout FITS products (`2040 × 2040`, `BITPIX = -32`, `RA---TAN-SIP` / `DEC--TAN-SIP` WCS) rather than pre-extracted 1D 102-channel spectral tables. `SpectralStudio` therefore retains its `SIMULATED DEMO DATA` 102-band model.
- **Image Comparison**: `ImageComparison` defaults to `SIMULATED DEMO DATA` pairs and enforces WCS, dimension, filter, and unit compatibility checks before subtraction.
