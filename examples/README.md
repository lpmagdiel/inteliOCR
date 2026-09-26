# JavaScript usage examples

Three ways to call the API from JavaScript.

## 1. Reusable client — `javascript-usage.js`

A 100-line wrapper around `fetch` that handles auth, timeouts, AbortSignal, and uniform error mapping. Works in **Node 18+** and **modern browsers**.

```js
// Node
const { InteliOCR } = require('./javascript-usage');
const client = new InteliOCR({ apiKey: process.env.INTELIOCR_API_KEY });
const { data, meta } = await client.ocr(fileBuffer, { type: 'receipt' });
console.log(data.merchant, data.total, data.currency);
```

```html
<!-- Browser -->
<script src="./javascript-usage.js"></script>
<script>
  const client = new InteliOCR({ apiKey: 'ioc_…' });
  const { data, meta } = await client.ocr(fileInput.files[0]);
</script>
```

Methods:

| Method | Description |
|---|---|
| `ocr(file, { type, signal })` | POST `/v1/ocr`. Returns `{ data, meta }`. |
| `health()` | GET `/v1/health`. Returns `{ data: { status, uptime, timestamp } }`. |

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
INTELIOCR_API_KEY=ioc_xxx_yyy node examples/node-cli.js ./receipt.jpg
INTELIOCR_API_KEY=ioc_xxx_yyy node examples/node-cli.js ./invoice.pdf --type=invoice
```

Prints merchant, totals, items, latency. Exits non-zero on error.

## 3. Browser demo — `browser.html`

Open `examples/browser.html` in a browser (after serving the directory — file:// works too for testing). It renders a tiny dark UI where you paste your API key, pick a file, and see the JSON result. **Do not ship this file to production**: it embeds the key client-side.

## Configuration

Both `InteliOCR` constructor and the CLI read from the same env var:

```bash
export INTELIOCR_API_KEY=ioc_<8 hex chars>_<48 hex chars>
```

You can also pass `endpoint` to point to a self-hosted instance:

```js
new InteliOCR({
  apiKey: 'ioc_…',
  endpoint: 'https://your-host.example.com',
});
```

## Cancellation

Both `ocr()` and the CLI pass an `AbortSignal` if you provide one — useful for long PDFs:

```js
const ctrl = new AbortController();
setTimeout(() => ctrl.abort(), 5_000);
await client.ocr(file, { signal: ctrl.signal });
```

## Security note

The API key gives full access to your quota and (by extension) billing. **Never embed it in client-side code that ships to users.** Run the client from your backend, or proxy requests through your own server.
