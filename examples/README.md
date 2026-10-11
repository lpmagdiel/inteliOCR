# JavaScript usage examples

Three ways to call the API from JavaScript.

> The `X-API-Key` header is **optional**. The upstream MiniMax API key is
> configured server-side in `.env` (`MINIMAX_API_KEY`). Sending an API key
> enables per-key quota tracking and per-key rate limiting; without one
> only the per-IP rate limit applies.

## 1. Reusable client — `javascript-usage.js`

A 100-line wrapper around `fetch` that handles auth, timeouts, AbortSignal, and uniform error mapping. Works in **Node 18+** and **modern browsers**.

```js
// Node
const { InteliOCR } = require('./javascript-usage');
const client = new InteliOCR();                                    // anonymous
const client = new InteliOCR({ apiKey: process.env.INTELIOCR_API_KEY }); // per-key

// Structured extraction via MiniMax Vision
const { data, meta } = await client.ia(fileBuffer, { type: 'receipt' });
console.log(data.merchant, data.total, data.currency);

// Raw text via tesseract.js (offline)
const { data: txt } = await client.basic(fileBuffer, { lang: 'eng' });
console.log(txt.text);
```

```html
<!-- Browser -->
<script src="./javascript-usage.js"></script>
<script>
  const client = new InteliOCR();                       // anonymous
  const { data, meta } = await client.ia(fileInput.files[0]);
</script>
```

Methods:

| Method | Endpoint | Description |
|---|---|---|
| `ocr(file, opts)` | — | Convenience alias of `run('v1', file, opts)`. |
| `run(engine, file, opts)` | varies | Generic dispatcher (see Engines). |
| `ia(file, opts)` | `POST /api/ia` | MiniMax Vision (structured JSON). |
| `basic(file, opts)` | `POST /api/basic` | tesseract.js (raw text, per-page confidence). |
| `health()` | `GET /v1/health` | Liveness probe. |

Engines for `run()` / `client.<method>()`:

| Engine | Path | Notes |
|---|---|---|
| `'ia'` | `/api/ia` | MiniMax Vision. Returns structured receipt/invoice JSON. |
| `'basic'` | `/api/basic` | tesseract.js. Returns `{ engine, language, pages, text, results:[{page,text,confidence,lines,words}] }`. |
| `'v1'` | `/v1/ocr` | Legacy alias of `'ia'`. |

Common options:

| Opt | Engines | Description |
|---|---|---|
| `type: 'receipt'\|'invoice'` | `ia`, `v1` | Hint for the extractor. |
| `lang: string` | `basic` | Tesseract language code (default `'eng'`). |
| `pages: number[]` | `basic` | 1-indexed pages to process (PDF only). |
| `signal: AbortSignal` | all | Forwards to `fetch()` for cancellation. |

Errors are thrown as `Error` with extra fields:

```ts
{
  message: string,
  code: 'QUOTA_EXCEEDED' | 'INVALID_API_KEY' | 'OCR_PROVIDER_ERROR' | …,
  status: 400 | 401 | 403 | 413 | 415 | 429 | 502 | 504,
  details: object | null,
  requestId: string | null
}
```

## 2. CLI script — `node-cli.js`

```bash
node examples/node-cli.js ./receipt.jpg                                              # anonymous
INTELIOCR_API_KEY=ioc_xxx_yyy node examples/node-cli.js ./invoice.pdf --type=invoice # per-key
node examples/node-cli.js ./receipt.jpg --engine=basic                               # tesseract raw text
node examples/node-cli.js ./invoice.pdf --engine=basic --lang=eng --pages=1,2
```

The CLI targets `http://localhost:3000` by default, or reads `INTELIOCR_API_URL`. Override it with `--endpoint=…`. The default engine is `ia` (override with `INTELIOCR_ENGINE` or `--engine=`). Exit code is non-zero on error. Run `node examples/node-cli.js --help` to see the full usage.

### Quick local API test

1. Start the API with `npm run dev` (configure the required server values in `.env`).
2. Check that the server is responding:

  ```bash
  curl http://localhost:3000/v1/health
  ```

3. Send a supported image or PDF (no API key needed):

  ```bash
  # MiniMax Vision (structured)
  node examples/node-cli.js ./receipt.jpg --type=receipt

  # tesseract.js (raw text, offline)
  node examples/node-cli.js ./receipt.jpg --engine=basic
  ```

For a deployed API, set `INTELIOCR_API_URL` or pass `--endpoint`:

```bash
node examples/node-cli.js ./invoice.pdf --type=invoice --endpoint=https://your-host.example.com
```

## 3. Browser demo — `browser.html`

Open `http://localhost:3000/example/` after starting the server (the `examples/` folder is mounted there). It renders a tiny dark UI where you pick the engine (`ia`, `basic`, `v1`), pick a file, and see the JSON result. The API key field is optional: leave it blank for anonymous usage, or paste a key from the dashboard to track usage under that key. You can also open `examples/browser.html` directly (`file://`) — the script paths are relative. If you do paste a key client-side, **do not ship this file to production**.

## Configuration

The `InteliOCR` constructor and the CLI read from the same env vars:

```bash
export INTELIOCR_API_KEY=ioc_<8 hex chars>_<48 hex chars>  # optional
export INTELIOCR_API_URL=https://your-host.example.com    # optional, defaults to localhost:3000
export INTELIOCR_ENGINE=ia                                 # optional, default engine
export BASIC_OCR_LANG=eng                                  # optional, default Tesseract language
```

You can also pass `endpoint` to point to a self-hosted instance:

```js
new InteliOCR({
  apiKey: 'ioc_…',                                    // optional
  endpoint: 'https://your-host.example.com',
});
```

## Cancellation

All engines accept an `AbortSignal` — useful for long PDFs:

```js
const ctrl = new AbortController();
setTimeout(() => ctrl.abort(), 5_000);
await client.ia(file, { signal: ctrl.signal });
```

## Security note

The API key (when used) is associated with your dashboard usage and quota. If you do use a key, **never embed it in client-side code that ships to users.** Run the client from your backend, or proxy requests through your own server. Anonymous usage (no key) is allowed; in that case only the per-IP rate limit applies.