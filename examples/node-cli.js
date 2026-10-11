#!/usr/bin/env node
'use strict';

/**
 * Example: process a receipt from the command line.
 *
 *   INTELIOCR_API_KEY=ioc_xxx_yyy node examples/node-cli.js ./receipt.jpg
 *   INTELIOCR_API_KEY=ioc_xxx_yyy node examples/node-cli.js ./invoice.pdf --type=invoice
 *   INTELIOCR_API_KEY=ioc_xxx_yyy node examples/node-cli.js ./receipt.jpg --engine=basic
 *   INTELIOCR_API_KEY=ioc_xxx_yyy node examples/node-cli.js ./invoice.pdf --engine=basic --lang=eng --pages=1,2
 *
 * Engines:
 *   - 'ia'    (default) → POST /api/ia    — MiniMax Vision
 *   - 'basic'            → POST /api/basic — tesseract.js (raw text)
 *   - 'v1'               → POST /v1/ocr    — alias of 'ia'
 *
 * Exit code: 0 on success, 1 on error.
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const { InteliOCR } = require('./javascript-usage');

function parseArgs(argv) {
  const out = {
    engine: process.env.INTELIOCR_ENGINE || 'ia',
    type: 'receipt',
    lang: process.env.BASIC_OCR_LANG || 'eng',
    pages: null,
    endpoint: process.env.INTELIOCR_API_URL || 'http://localhost:3000',
  };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--engine=')) out.engine = a.slice('--engine='.length);
    else if (a.startsWith('--type=')) out.type = a.slice('--type='.length);
    else if (a.startsWith('--lang=')) out.lang = a.slice('--lang='.length);
    else if (a.startsWith('--pages=')) out.pages = a.slice('--pages='.length);
    else if (a.startsWith('--endpoint=')) out.endpoint = a.slice('--endpoint='.length);
    else if (a === '--help' || a === '-h') out.help = true;
    else if (!out.file) out.file = a;
  }
  return out;
}

function printIa(data, meta) {
  console.log('─────────── Result (MiniMax) ───────────');
  console.log('Document type :', data.document_type);
  console.log('Merchant      :', data.merchant);
  console.log('Date          :', data.date);
  console.log('Subtotal      :', data.subtotal, data.currency || '');
  console.log('Tax           :', data.tax, data.currency || '');
  console.log('Total         :', data.total, data.currency || '');
  console.log('Invoice #     :', data.invoice_number);
  console.log('Vendor tax ID :', data.vendor_tax_id);
  console.log('Items         :', Array.isArray(data.items) ? data.items.length : 0);
  if (Array.isArray(data.items)) {
    for (const it of data.items) {
      console.log(`  · ${it.description} × ${it.quantity ?? '-'} = ${it.total ?? it.unit_price ?? '-'}`);
    }
  }
  console.log('─────────── Meta ───────────');
  console.log('engine        :', meta.engine || 'minimax');
  console.log('model         :', meta.model);
  console.log('request_id    :', meta.request_id);
  console.log('latency_ms    :', meta.latency_ms);
  console.log('pages         :', meta.pages);
  console.log('finish_reason :', meta.finish_reason);
}

function printBasic(data, meta) {
  console.log('─────────── Result (tesseract.js) ───────────');
  console.log('language      :', data.language);
  console.log('pages         :', data.pages, '/', meta.pages_total);
  console.log('─────────── Text ───────────');
  console.log(data.text || '(no text recognized)');
  if (Array.isArray(data.results)) {
    console.log('─────────── Per-page ───────────');
    for (const r of data.results) {
      console.log(`page ${r.page}  confidence=${r.confidence ?? '-'}  words=${r.words ?? '-'}  lines=${r.lines ?? '-'}`);
      if (r.error) console.log(`  ! error: ${r.error}`);
    }
  }
  console.log('─────────── Meta ───────────');
  console.log('engine        :', data.engine);
  console.log('model         :', meta.model);
  console.log('request_id    :', meta.request_id);
  console.log('latency_ms    :', meta.latency_ms);
  console.log('finish_reason :', meta.finish_reason);
}

(async () => {
  const { file, engine, type, lang, pages, endpoint, help } = parseArgs(process.argv);
  if (help) {
    console.log('Usage: INTELIOCR_API_KEY=<key> node examples/node-cli.js <file> [--engine=ia|basic|v1] [--type=receipt|invoice] [--lang=eng] [--pages=1,2] [--endpoint=http://localhost:3000]');
    process.exit(0);
  }
  if (!file) {
    console.error('Usage: INTELIOCR_API_KEY=<key> node examples/node-cli.js <file> [--engine=ia|basic|v1] [--type=receipt|invoice] [--lang=eng] [--pages=1,2] [--endpoint=http://localhost:3000]');
    process.exit(2);
  }
  const apiKey = process.env.INTELIOCR_API_KEY;
  if (!apiKey) {
    console.error('Set INTELIOCR_API_KEY in your environment.');
    process.exit(2);
  }

  let buf;
  try {
    buf = await fs.readFile(path.resolve(file));
  } catch (e) {
    console.error(`Could not read file "${file}": ${e.message}`);
    process.exit(2);
  }
  const client = new InteliOCR({ apiKey, endpoint });

  const t0 = Date.now();
  try {
    const opts = { type };
    if (engine === 'basic') {
      opts.lang = lang;
      if (pages) opts.pages = pages.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n));
    }
    const { data, meta } = await client.run(engine, buf, opts);
    const ms = Date.now() - t0;

    if (engine === 'basic') printBasic(data, { ...meta, pages_total: meta.pages_total ?? meta.pages });
    else printIa(data, meta);
    console.log(`round-trip    : ${ms}ms`);
  } catch (e) {
    console.error(`\n[${e.code}] ${e.message}`);
    if (e.details) console.error('details:', JSON.stringify(e.details, null, 2));
    if (e.requestId) console.error('request_id:', e.requestId);
    process.exit(1);
  }
})();