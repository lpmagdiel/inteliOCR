'use strict';

/**
 * inteliOCR — minimal JavaScript client.
 *
 * Works in:
 *   - Node.js 18+  (native fetch, native FormData, native Blob)
 *   - Modern browsers (native fetch, native FormData, native Blob)
 *
 * Usage:
 *   const { InteliOCR } = require('./javascript-usage');
 *   const client = new InteliOCR({ apiKey: 'ioc_xxxx_yyyy' });
 *   const { data, meta } = await client.ocr(fileBlob, { type: 'receipt' });
 *
 * In the browser, either include this file with a <script> tag (it exposes
 * window.InteliOCR) or import it as ESM:
 *   import { InteliOCR } from './javascript-usage.js';
 */

const DEFAULT_ENDPOINT = 'https://inteliapi-inteliocr-api-f1bso8-15ce77-186-240-153-209.sslip.io';

class InteliOCR {
  /**
   * @param {Object} opts
   * @param {string} opts.apiKey    - API key in the form `ioc_<prefix>_<secret>`
   * @param {string} [opts.endpoint] - Base URL. Defaults to the public instance.
   * @param {number} [opts.timeoutMs] - Request timeout in ms (default 60000).
   */
  constructor({ apiKey, endpoint = DEFAULT_ENDPOINT, timeoutMs = 60_000 } = {}) {
    if (!apiKey) throw new Error('InteliOCR: apiKey is required');
    this.apiKey = apiKey;
    this.endpoint = endpoint.replace(/\/+$/, '');
    this.timeoutMs = timeoutMs;
  }

  /** GET /v1/health — liveness probe. */
  async health() {
    return this._request('GET', '/v1/health');
  }

  /**
   * POST /v1/ocr — process a receipt or invoice.
   * @param {Blob|File|Buffer} file - JPG, PNG, WebP or PDF (≤ 10 MB images / 15 MB PDF).
   * @param {Object} [opts]
   * @param {'receipt'|'invoice'} [opts.type] - Optional hint for the extractor.
   * @param {AbortSignal} [opts.signal] - Forwarded to fetch().
   * @returns {Promise<{success:true, data:object, meta:object}>}
   */
  async ocr(file, opts = {}) {
    const fd = new FormData();
    fd.append('file', this._toBlob(file), this._filename(file));
    if (opts.type) fd.append('type', opts.type);

    return this._request('POST', '/v1/ocr', {
      body: fd,
      signal: opts.signal,
    });
  }

  // ---------- internals ----------

  async _request(method, path, { body, signal } = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new Error('timeout')), this.timeoutMs);
    if (signal) {
      if (signal.aborted) ctrl.abort(signal.reason);
      else signal.addEventListener('abort', () => ctrl.abort(signal.reason), { once: true });
    }

    let res;
    try {
      res = await fetch(`${this.endpoint}${path}`, {
        method,
        headers: {
          'X-API-Key': this.apiKey,
          ...(body ? {} : { Accept: 'application/json' }),
        },
        body,
        signal: ctrl.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      if (e.name === 'AbortError') {
        const err = new Error(`InteliOCR: request aborted (${e.message || 'timeout'})`);
        err.code = 'ABORTED';
        throw err;
      }
      throw new Error(`InteliOCR: network error — ${e.message}`);
    }
    clearTimeout(timer);

    let payload = null;
    try { payload = await res.json(); } catch (_) { /* non-JSON body */ }

    if (!res.ok) {
      const err = new Error(payload?.error?.message || `HTTP ${res.status}`);
      err.code = payload?.error?.code || `HTTP_${res.status}`;
      err.status = res.status;
      err.details = payload?.error?.details || null;
      err.requestId = payload?.meta?.request_id || null;
      throw err;
    }

    return payload;
  }

  _toBlob(file) {
    if (typeof Blob !== 'undefined' && file instanceof Blob) return file;
    // Node.js Buffer (legacy environments). Wrap as a Blob with explicit type.
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
      return new Blob([file], { type: 'application/octet-stream' });
    }
    throw new Error('InteliOCR: file must be a Blob, File or Buffer');
  }

  _filename(file) {
    if (typeof File !== 'undefined' && file instanceof File && file.name) return file.name;
    return 'upload';
  }
}

// Dual export: CommonJS (Node) + globals (browser) + ESM compatibility.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { InteliOCR };
}
if (typeof window !== 'undefined') {
  window.InteliOCR = InteliOCR;
}
