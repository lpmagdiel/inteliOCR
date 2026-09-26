# inteliOCR

REST API for OCR on **receipts and invoices**, powered by the **MiniMax Vision API**.

- Upload an image (JPG / PNG / WebP) or a PDF → get structured JSON back.
- No image content is ever written to disk. Only request metadata (timestamp, status, latency, byte counts, hashed IP) is stored in SQLite.
- Dashboard for usage metrics & API-key management, login with email + password.
- Bot/abuse protection built-in: rate limiting, progressive slow-down, UA filter, helmet headers, HPP.
- Designed to run on **Dockploy** (or any Docker host) with a single `docker compose up`.

---

## Table of contents

1. [Quick start](#quick-start)
2. [Environment variables](#environment-variables)
3. [API reference](#api-reference)
4. [Response format](#response-format)
5. [Error codes](#error-codes)
6. [Dashboard](#dashboard)
7. [Privacy & storage](#privacy--storage)
8. [Deploy on Dockploy](#deploy-on-dockploy)
9. [Project structure](#project-structure)
10. [Development](#development)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

---

## Quick start

### A) Local (Node 20+)

```bash
git clone <your-fork-url> inteliocr
cd inteliocr
cp .env.example .env
# Edit .env and fill in MINIMAX_API_KEY, JWT_SECRET, HASH_PEPPER, DASHBOARD_PASSWORD_HASH

# Generate the dashboard password hash:
node -e "console.log(require('bcrypt').hashSync('your-password', 12))"

npm install
npm run dev
```

The server listens on `http://localhost:3000`.

### B) Docker (recommended for production)

```bash
# 1. Build
docker build -t inteliocr:latest .

# 2. Run with persistent SQLite volume
docker run -d \
  --name inteliocr \
  --restart unless-stopped \
  -p 3000:3000 \
  -v inteliocr-data:/data \
  --env-file .env \
  inteliocr:latest
```

Or with the bundled compose file:

```bash
docker compose up -d
```

### C) Health check

```bash
curl http://localhost:3000/v1/health
```

```json
{ "success": true, "data": { "status": "ok", "uptime": 12.4, "timestamp": "..." }, "meta": { ... } }
```

---

## Environment variables

All variables live in `.env` (see `.env.example` for the full list). The most important ones:

| Var | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `3000` | HTTP port |
| `NODE_ENV` | no | `production` | `development` enables pretty logs |
| `DATA_DIR` | no | `./data` | Where SQLite lives (mount a volume here) |
| `TRUST_PROXY` | no | `1` | Trust X-Forwarded-* (set to `1` behind Traefik/Caddy) |
| `LOG_LEVEL` | no | `info` | pino log level |
| `DASHBOARD_EMAIL` | no | `lpzcode@yahoo.com` | Login email for the dashboard |
| `DASHBOARD_PASSWORD_HASH` | **yes (prod)** | — | bcrypt hash of the dashboard password |
| `JWT_SECRET` | **yes (prod)** | — | Min. 32 random chars. Used to sign session cookies. |
| `JWT_EXPIRES_IN` | no | `12h` | Dashboard session lifetime |
| `MINIMAX_API_KEY` | **yes (prod)** | — | MiniMax API key |
| `MINIMAX_API_BASE` | no | `https://api.minimaxi.chat/v1` | MiniMax API base URL |
| `MINIMAX_MODEL` | no | `MiniMax-VL` | Vision model to call |
| `MINIMAX_TIMEOUT_MS` | no | `30000` | Upstream request timeout |
| `MAX_UPLOAD_IMAGE_MB` | no | `10` | Max size for image uploads |
| `MAX_UPLOAD_PDF_MB` | no | `15` | Max size for PDF uploads |
| `RATE_LIMIT_IP_PER_MIN` | no | `30` | Per-IP limit |
| `RATE_LIMIT_KEY_PER_MIN` | no | `120` | Per-API-key limit |
| `IMG_MAX_DIMENSION` | no | `1600` | Largest side after preprocessing |
| `IMG_QUALITY` | no | `82` | JPEG quality (1–100) |
| `CORS_ORIGINS` | no | _(empty)_ | Comma-separated allowlist |
| `BLOCKED_UA_EXTRA` | no | _(empty)_ | Additional UA substrings to block |
| `HASH_PEPPER` | **yes (prod)** | dev | Pepper for hashing IPs and API keys |

Generate the dashboard password hash:

```bash
node -e "console.log(require('bcrypt').hashSync('your-password', 12))"
```

Generate a strong `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## API reference

### `POST /v1/ocr`

Process a receipt or invoice image/PDF and return structured JSON.

**Request**

```
POST /v1/ocr
Headers:
  X-API-Key: ioc_<prefix>_<secret>
  Content-Type: multipart/form-data
Body (multipart fields):
  file: <binary>          # required — JPG, PNG, WebP or PDF
  type: "receipt" | "invoice"   # optional hint, defaults to auto-detect
```

**Example with curl**

```bash
curl -X POST http://localhost:3000/v1/ocr \
  -H "X-API-Key: ioc_a1b2c3d4_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -F "file=@./receipt.jpg" \
  -F "type=receipt"
```

**Example with fetch (browser / Node 20+)**

```js
const fd = new FormData();
fd.append('file', fileInput.files[0]);
fd.append('type', 'receipt');

const res = await fetch('https://your.host/v1/ocr', {
  method: 'POST',
  headers: { 'X-API-Key': 'ioc_...' },
  body: fd,
});
const json = await res.json();
console.log(json.data.total, json.data.currency);
```

**Example with Python**

```python
import requests
with open('receipt.jpg', 'rb') as f:
    r = requests.post(
        'https://your.host/v1/ocr',
        headers={'X-API-Key': 'ioc_...'},
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
    "model": "MiniMax-VL",
    "pages": 1,
    "finish_reason": "stop"
  }
}
```

### `GET /v1/health`

Liveness probe (used by Docker `HEALTHCHECK`). No auth.

### `GET /`

Service info.

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
| 401 | `MISSING_API_KEY` | `X-API-Key` header not present |
| 401 | `INVALID_API_KEY` | Key is unknown or revoked |
| 403 | `BLOCKED_UA` | User-Agent is empty or matches the blocklist |
| 413 | `FILE_TOO_LARGE` | Upload exceeds the per-format limit |
| 415 | `UNSUPPORTED_FORMAT` | Not one of JPG / PNG / WebP / PDF |
| 429 | `RATE_LIMITED` | Too many requests from this IP/key |
| 429 | `QUOTA_EXCEEDED` | Monthly quota reached |
| 502 | `OCR_PROVIDER_ERROR` | Upstream provider returned an error or non-JSON |
| 504 | `OCR_TIMEOUT` | Upstream provider did not respond in time |
| 500 | `INTERNAL_ERROR` | Unhandled exception (see logs) |
| 404 | `NOT_FOUND` | Route does not exist |

---

## Dashboard

The dashboard is a small server-rendered UI for managing API keys and reading usage metrics.

- Login at `https://your.host/dashboard/login`
- Default email: `lpzcode@yahoo.com` (change via `DASHBOARD_EMAIL`)
- Password is verified against `DASHBOARD_PASSWORD_HASH`
- Session is a JWT stored in an `httpOnly`, `SameSite=Strict`, `Secure` cookie (12 h)

Pages:

- **Overview** — totals, success rate, avg latency, avg input size, requests/day chart, status pie, per-key table.
- **API Keys** — list, create (returns the raw key **once**), revoke.
- **Usage** — paginated recent-request log.

Nothing about uploaded receipts/invoices ever reaches the dashboard — only request metadata.

---

## Privacy & storage

inteliOCR is designed to be privacy-respecting:

- **No OCR content is ever persisted.** Uploaded files are buffered in RAM (`multer.memoryStorage`), preprocessed in-memory with `sharp`, sent to the OCR provider, and dropped. They are not written to disk under any code path.
- **Only metadata is stored** in SQLite (`/data/usage.db`):
  - API key id (hashed, never the raw key)
  - timestamp
  - IP hash (`sha256(ip + HASH_PEPPER)`)
  - endpoint, status, latency, byte counts, error code
- API keys are stored as `sha256(rawKey + HASH_PEPPER)`. The raw key is shown **once** at creation and never again.
- Logs (`pino`) redact `Authorization`, `X-API-Key`, passwords and cookies.

If you want to clear history, delete `/data/usage.db` (and the WAL files) — the schema will be recreated automatically on the next request.

---

## Deploy on Dockploy

1. In Dockploy, create a new **Service**.
2. Point the **Source** to your Git repo (or upload a tarball).
3. **Build method**: `Dockerfile`.
4. **Port**: `3000` (TCP).
5. Mount a persistent volume at `/data` so SQLite survives restarts.
6. Add the environment variables from [Environment variables](#environment-variables). At minimum:
   - `MINIMAX_API_KEY`
   - `JWT_SECRET` (generate with the command in the table above)
   - `DASHBOARD_PASSWORD_HASH` (generate with the command in the table above)
   - `HASH_PEPPER` (any random string)
7. (Optional) Configure a **Domain** with HTTPS; Dockploy's Traefik will terminate TLS and forward to the container.
8. Deploy. Visit `https://your.host/v1/health` to verify.

A complete `docker-compose.yml` is included in the repo — you can use it as-is locally.

---

## Project structure

```
inteliocr/
├── src/
│   ├── config/        # env loading + validation
│   ├── db/            # better-sqlite3 client + migrations
│   ├── middleware/    # security, rate limit, auth, upload, usage log
│   ├── services/      # image/pdf/minimax/key/usage services
│   ├── controllers/   # request handlers
│   ├── routes/        # api + dashboard routers
│   ├── utils/         # response envelope, logger, hashing, flash
│   ├── views/         # EJS templates for the dashboard
│   ├── public/        # CSS, dashboard.js, Chart.js (local copy)
│   ├── app.js         # buildApp()
│   └── server.js      # listen + graceful shutdown
├── tests/             # jest + supertest + nock
├── Dockerfile
├── docker-compose.yml
├── package.json
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

- API key authentication & quota enforcement
- File-type validation (size, MIME, magic bytes)
- Rate limiting (per IP and per key)
- MiniMax provider mocking (success, error, timeout)
- PDF handling
- Dashboard login/logout/key management

No real MiniMax API calls are made during tests — outbound HTTP is mocked with `nock`.

---

## Troubleshooting

**`/v1/health` returns 200 but `/v1/ocr` fails with `OCR_PROVIDER_ERROR`.**
→ Check `MINIMAX_API_KEY` is valid and that the container has internet access to `api.minimaxi.chat`.

**Dashboard login fails with "Invalid credentials".**
→ The hash in `DASHBOARD_PASSWORD_HASH` doesn't match the password. Re-generate:
```bash
node -e "console.log(require('bcrypt').hashSync('the-password', 12))"
```

**Rate-limited too aggressively from your own IP.**
→ Raise `RATE_LIMIT_IP_PER_MIN` (default 30/min).

**Sharp install fails in Docker.**
→ The Dockerfile installs `vips-dev` and other build deps in the deps stage and only runtime libs in the final image. If you customize the Dockerfile, keep these system packages.

**Container won't start with "Invalid configuration".**
→ The app refuses to boot in production if `DASHBOARD_PASSWORD_HASH`, `JWT_SECRET`, `MINIMAX_API_KEY`, or `HASH_PEPPER` are missing/weak. Set them.

**PDF parsing returns only one page.**
→ The current implementation renders pages sequentially with a 20-page safety cap. For longer receipts/invoices, raise the cap in `src/services/pdfService.js`.

---

## License

MIT
