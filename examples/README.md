# JavaScript usage examples

Three ways to call the API from JavaScript.

> The API has **no authentication**. The upstream MiniMax API key is
> configured server-side in `.env` (`MINIMAX_API_KEY`). Requests are rate-
> limited per IP.

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/ocr`   | MiniMax Vision — structured JSON |
| `POST` | `/basic` | tesseract.js — raw text per page |
| `GET`  | `/health` | Liveness probe |

## 1. Reusable client — `javascript-usage.js`

A wrapper around `fetch` that handles timeouts, AbortSignal, and uniform error mapping. Works in **Node 18+** and **modern browsers**.

```js
// Node
const { InteliOCR } = require('./javascript-usage');
const client = new InteliOCR();                                   // http://localhost:3000
const client = new InteliOCR({ endpoint: 'https://your.host' });  // remote

// Structured extraction via MiniMax Vision
const { data, meta } = await client.ocr(fileBuffer, { type: 'receipt' });
console.log(data.merchant, data.total, data.currency);

// Raw text via tesseract.js (offline)
const { data: txt } = await client.basic(fileBuffer, { lang: 'spa' });
console.log(txt.text);
```

```html
<!-- Browser (same-origin: the page must be served from the API host) -->
<script src="./javascript-usage.js"></script>
<script>
  const client = new InteliOCR();                       // window.location.origin
  const { data, meta } = await client.ocr(fileInput.files[0]);
</script>
```

Methods:

| Method | Endpoint | Description |
|---|---|---|
| `ocr(file, opts)` | `POST /ocr` | MiniMax Vision (structured JSON). |
| `basic(file, opts)` | `POST /basic` | tesseract.js (raw text, per-page confidence). |
| `health()` | `GET /health` | Liveness probe. |

Common options:

| Opt | Engines | Description |
|---|---|---|
| `type: 'receipt'\|'invoice'` | `ocr` | Hint for the extractor. |
| `lang: 'eng'\|'spa'` | `basic` | Tesseract language code (default `'eng'`). |
| `pages: number[]` | `basic` | 1-indexed pages to process (PDF only). |
| `signal: AbortSignal` | all | Forwards to `fetch()` for cancellation. |

Errors are thrown as `Error` with extra fields:

```ts
{
  message: string,
  code: 'OCR_PROVIDER_ERROR' | 'RATE_LIMITED' | 'BLOCKED_UA' | …,
  status: 400 | 403 | 413 | 415 | 429 | 502 | 504,
  details: object | null,
  requestId: string | null
}
```

## 2. CLI script — `node-cli.js`

```bash
node examples/node-cli.js ./receipt.jpg                                       # MiniMax Vision (default)
node examples/node-cli.js ./invoice.pdf --type=invoice                        # ia + invoice hint
node examples/node-cli.js ./factura.jpg --engine=basic --lang=spa             # tesseract raw text
node examples/node-cli.js ./invoice.pdf --engine=basic --lang=eng --pages=1,2
```

The CLI targets `http://localhost:3000` by default, or reads `INTELIOCR_API_URL`. Override it with `--endpoint=…`. The default engine is `ocr` (override with `INTELIOCR_ENGINE` or `--engine=`). Exit code is non-zero on error. Run `node examples/node-cli.js --help` to see the full usage.

### Quick local API test

1. Start the API with `npm run dev` (configure the upstream key in `.env`).
2. Check that the server is responding:

  ```bash
  curl http://localhost:3000/health
  ```

3. Send a supported image or PDF:

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

Open `http://localhost:3000/example/` after starting the server (the `examples/` folder is mounted there). It renders a tiny dark UI where you pick the engine (`ocr` or `basic`), pick a file, and see the JSON result. You can also open `examples/browser.html` directly (`file://`) — the script paths are relative.

## Configuration

The CLI reads from these env vars:

```bash
export INTELIOCR_API_URL=https://your-host.example.com   # optional, defaults to localhost:3000
export INTELIOCR_ENGINE=ocr                              # optional, default engine
export BASIC_OCR_LANG=eng                                # optional, default Tesseract language
```

You can also pass `endpoint` to point to a self-hosted instance:

```js
new InteliOCR({
  endpoint: 'https://your-host.example.com',
});
```

## Cancellation

Both engines accept an `AbortSignal` — useful for long PDFs:

```js
const ctrl = new AbortController();
setTimeout(() => ctrl.abort(), 5_000);
await client.ocr(file, { signal: ctrl.signal });
```