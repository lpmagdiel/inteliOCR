# inteliOCR

REST API for OCR on **receipts and invoices**, powered by the **MiniMax Vision API**. Stateless, no auth, no DB, no dashboard — just two endpoints and a browser demo.

- Upload an image (JPG / PNG / WebP) or a PDF → get structured JSON back (MiniMax Vision) or raw text (tesseract.js).
- No image content is ever written to disk.
- Basic bot protection: User-Agent filter + per-IP rate limit.
- Designed to run on **Dockploy** (or any Docker host) with a single `docker compose up`.

---

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET`  | `/health`     | Liveness probe |
| `POST` | `/ocr`        | MiniMax Vision — structured JSON |
| `POST` | `/basic`      | tesseract.js — raw text per page |
| `GET`  | `/`           | Service info |
| `GET`  | `/example/`   | Browser demo UI |

No API key required. The upstream MiniMax API key is read from `.env` (`MINIMAX_API_KEY`).

---

## Quick start

### A) Local (Node 20+)

```bash
git clone <your-fork-url> inteliocr
cd inteliocr
cp .env.example .env
# Edit .env and fill in MINIMAX_API_KEY

npm install
npm run dev
```

The server listens on `http://localhost:3000`.

Open `http://localhost:3000/example/` for the browser demo.

### B) Docker

```bash
docker build -t inteliocr:latest .
docker run -d --name inteliocr --restart unless-stopped -p 3000:3000 \
  --env-file .env inteliocr:latest
```

Or with the bundled compose file:

```bash
docker compose up -d
```

### C) Health check

```bash
curl http://localhost:3000/health
```

---

## Environment variables

| Var | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `3000` | HTTP port |
| `NODE_ENV` | no | `production` | `development` enables pretty logs |
| `TRUST_PROXY` | no | `1` | Trust X-Forwarded-* behind Traefik/Caddy |
| `LOG_LEVEL` | no | `info` | pino log level |
| `PUBLIC_URL` | no | _(empty)_ | Public URL of this instance (only used in `/` info) |
| `MINIMAX_API_KEY` | **yes (prod)** | — | MiniMax API key |
| `MINIMAX_API_BASE` | no | `https://api.minimaxi.chat/v1` | MiniMax API base URL |
| `MINIMAX_MODEL` | no | `MiniMax-M3` | Vision-capable model |
| `MINIMAX_TIMEOUT_MS` | no | `30000` | Upstream request timeout |
| `MAX_UPLOAD_IMAGE_MB` | no | `10` | Max image upload size |
| `MAX_UPLOAD_PDF_MB` | no | `15` | Max PDF upload size |
| `RATE_LIMIT_WINDOW_MS` | no | `60000` | Rate-limit window |
| `RATE_LIMIT_IP_PER_MIN` | no | `30` | Per-IP request limit |
| `IMG_MAX_DIMENSION` | no | `1600` | Largest side after preprocessing |
| `IMG_QUALITY` | no | `82` | JPEG quality (1–100) |
| `CORS_ORIGINS` | no | `*` | Comma-separated allowlist, `*` allows any origin |
| `BLOCKED_UA_EXTRA` | no | _(empty)_ | Additional UA substrings to block |

---

## API reference

### `POST /ocr`

Process a receipt or invoice image/PDF and return structured JSON via MiniMax Vision.

**Request**

```
POST /ocr
Content-Type: multipart/form-data
Body (multipart fields):
  file: <binary>          # required — JPG, PNG, WebP or PDF
  type: "receipt" | "invoice"   # optional hint, defaults to auto-detect
```

**Example with curl**

```bash
curl -X POST http://localhost:3000/ocr \
  -F "file=@./receipt.jpg" \
  -F "type=receipt"
```

**Example with fetch (browser / Node 20+)**

```js
const fd = new FormData();
fd.append('file', fileInput.files[0]);
fd.append('type', 'receipt');

const res = await fetch('/ocr', { method: 'POST', body: fd });
const json = await res.json();
console.log(json.data.total, json.data.currency);
```

**Example with Python**

```python
import requests
with open('receipt.jpg', 'rb') as f:
    r = requests.post(
        'https://your.host/ocr',
        files={'file': ('receipt.jpg', f, 'image/jpeg')},
        data={'type': 'receipt'},
        timeout=60,
    )
r.raise_for_status()
print(r.json()['data'])
```

**Successful response (200)**

```json
{
  "success": true,
  "data": {
    "document_type": "receipt",
    "merchant": "Coffee Shop SL",
    "date": "2025-09-26",
    "total": 12.45,
    "currency": "EUR",
    "subtotal": 10.37,
    "tax": 2.08,
    "tip": null,
    "invoice_number": null,
    "vendor_tax_id": "B12345678",
    "payment_method": "card",
    "items": [
      { "description": "Espresso", "quantity": 2, "unit_price": 2.50, "total": 5.00 },
      { "description": "Croissant", "quantity": 1, "unit_price": 3.50, "total": 3.50 }
    ],
    "extra": {}
  },
  "meta": {
    "request_id": "9f8b...",
    "timestamp": "2025-09-26T12:34:56.789Z",
    "latency_ms": 1834,
    "model": "MiniMax-M3",
    "pages": 1,
    "finish_reason": "stop",
    "engine": "minimax"
  }
}
```

### `POST /basic`

Process a receipt or invoice image/PDF with tesseract.js and return raw text per page.

**Request**

```
POST /basic
Content-Type: multipart/form-data
Body (multipart fields):
  file: <binary>          # required — JPG, PNG, WebP or PDF
  lang: "eng" | "spa"     # optional, default "eng"
  pages: "1,3"            # optional, 1-indexed pages to process (PDF only)
```

**Example with curl**

```bash
curl -X POST http://localhost:3000/basic \
  -F "file=@./factura.jpg" \
  -F "lang=spa"
```

**Successful response (200)**

```json
{
  "success": true,
  "data": {
    "engine": "tesseract.js",
    "language": "eng",
    "pages": 1,
    "text": "STARBUCKS COFFEE\n2x Espresso   $5.00\n...",
    "results": [
      { "page": 1, "text": "...", "confidence": 92.3, "lines": 14, "words": 87 }
    ]
  },
  "meta": { "latency_ms": 612, "model": "tesseract:eng", "pages_total": 1, "pages_processed": 1 }
}
```

### `GET /health`

Liveness probe (used by Docker `HEALTHCHECK`). No auth.

### `GET /example/`

Static browser demo UI (`examples/browser.html`). Lets you pick a file, engine, language and see the JSON result without writing code.

### `GET /`

Service info (endpoints, public URL).

---

## Response format

All responses use a single envelope:

**Success**

```json
{
  "success": true,
  "data": { /* endpoint-specific payload */ },
  "meta": { "request_id": "...", "timestamp": "..." }
}
```

**Error**

```json
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Monthly quota exceeded for this API key.",
    "details": { /* endpoint-specific */ }
  },
  "meta": { "request_id": "...", "timestamp": "..." }
}
```

`X-Request-Id` is always echoed back in the response headers (and can be sent in by the client for tracing).

---

## Error codes

| HTTP | Code | When |
|---|---|---|
| 400 | `MISSING_FILE` | `file` field missing in multipart body |
| 400 | `INVALID_FILE` | File could not be preprocessed |
| 403 | `BLOCKED_UA` | User-Agent is empty or matches the blocklist |
| 413 | `FILE_TOO_LARGE` | Upload exceeds the per-format limit |
| 415 | `UNSUPPORTED_FORMAT` | Not one of JPG / PNG / WebP / PDF |
| 429 | `RATE_LIMITED` | Too many requests from this IP |
| 502 | `OCR_PROVIDER_ERROR` | Upstream provider returned an error or non-JSON |
| 504 | `OCR_TIMEOUT` | Upstream provider did not respond in time |
| 500 | `INTERNAL_ERROR` | Unhandled exception (see logs) |
| 404 | `NOT_FOUND` | Route does not exist |

---

## Bot protection

- **User-Agent filter**: requests with no UA or a known scraping UA (`python-requests`, `wget`, `scrapy`, etc.) are rejected with `403 BLOCKED_UA`. Extend via `BLOCKED_UA_EXTRA`.
- **Per-IP rate limit**: `RATE_LIMIT_IP_PER_MIN` requests per minute per IP (default 30). Returns `429 RATE_LIMITED`.
- **Upload limits**: per-format MB cap on multipart bodies (multer + a magic-byte sniff, so the extension can't lie).

---

## Deploy on Dockploy

1. Create a new **Service**.
2. Point **Source** to your Git repo.
3. **Build method**: `Dockerfile`.
4. **Port**: `3000` (TCP).
5. Add the env vars from [Environment variables](#environment-variables). Minimum: `MINIMAX_API_KEY`.
6. (Optional) Configure a **Domain** with HTTPS; Traefik will terminate TLS.
7. Deploy. Visit `https://your.host/health` to verify.

---

## Project structure

```
inteliocr/
├── src/
│   ├── config/        # env loading + validation
│   ├── controllers/   # ocrController (MiniMax), basicController (tesseract)
│   ├── middleware/    # security, rate limiter, upload validation
│   ├── routes/        # api router (POST /ocr, POST /basic, GET /health)
│   ├── services/      # image, pdf, minimax
│   ├── utils/         # response envelope, logger, async handler
│   ├── app.js         # buildApp()
│   └── server.js      # listen + shutdown
├── examples/          # browser demo + JS client + Node CLI
├── tests/             # jest + supertest + nock
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Development

```bash
npm run dev      # nodemon, pretty logs
npm run lint     # eslint
npm run lint:fix # eslint --fix
npm test         # full test suite
```

Hot-reload on save (watches `src/`).

---

## Testing

```bash
npm test
```

The suite covers:

- Health check and service info
- File-type validation (size, MIME, magic bytes)
- Rate limiting (per IP)
- UA filter (bot blocking)
- MiniMax provider mocking (success, error, timeout)
- PDF handling
- CORS

No real MiniMax API calls are made during tests — outbound HTTP is mocked with `nock`.

---

## Troubleshooting

**`/health` returns 200 but `/ocr` fails with `OCR_PROVIDER_ERROR`.**
→ Check `MINIMAX_API_KEY` is valid and that the container has internet access to `api.minimaxi.chat`.

**`/example/` returns 404.**
→ Make sure the `examples/` folder is included in your Docker build (it is, by default). If you customized the Dockerfile, copy `examples/` next to `src/`.

**Rate-limited too aggressively from your own IP.**
→ Raise `RATE_LIMIT_IP_PER_MIN` (default 30/min).

**Sharp install fails in Docker.**
→ The Dockerfile installs `vips-dev` and other build deps in the deps stage and only runtime libs in the final image. If you customize the Dockerfile, keep these system packages.

**Container won't start with "Invalid configuration".**
→ The app refuses to boot in production if `MINIMAX_API_KEY` is missing. Set it.

**PDF parsing returns only one page.**
→ The current implementation renders pages sequentially with a 20-page safety cap. For longer receipts/invoices, raise the cap in `src/services/pdfService.js`.

---

## License

MIT