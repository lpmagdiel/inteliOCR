#!/usr/bin/env node
'use strict';

/**
 * Example: process a receipt from the command line.
 *
 *   INTELIOCR_API_KEY=ioc_xxx_yyy node examples/node-cli.js ./receipt.jpg
 *   INTELIOCR_API_KEY=ioc_xxx_yyy node examples/node-cli.js ./invoice.pdf --type=invoice
 *
 * Exit code: 0 on success, 1 on error.
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const { InteliOCR } = require('./javascript-usage');

function parseArgs(argv) {
  const out = { type: 'receipt', endpoint: process.env.INTELIOCR_API_URL || 'http://localhost:3000' };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--type=')) out.type = a.slice('--type='.length);
    else if (a.startsWith('--endpoint=')) out.endpoint = a.slice('--endpoint='.length);
    else if (a === '--help' || a === '-h') out.help = true;
    else if (!out.file) out.file = a;
  }
  return out;
}

(async () => {
  const { file, type, endpoint, help } = parseArgs(process.argv);
  if (help) {
    console.log('Usage: INTELIOCR_API_KEY=<key> node examples/node-cli.js <file> [--type=receipt|invoice] [--endpoint=http://localhost:3000]');
    process.exit(0);
  }
  if (!file) {
    console.error('Usage: INTELIOCR_API_KEY=<key> node examples/node-cli.js <file> [--type=receipt|invoice] [--endpoint=http://localhost:3000]');
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
    const { data, meta } = await client.ocr(buf, { type });
    const ms = Date.now() - t0;

    console.log('─────────── Result ───────────');
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
    console.log('request_id    :', meta.request_id);
    console.log('latency_ms    :', meta.latency_ms, `(round-trip ${ms}ms)`);
    console.log('model         :', meta.model);
    console.log('pages         :', meta.pages);
  } catch (e) {
    console.error(`\n[${e.code}] ${e.message}`);
    if (e.details) console.error('details:', JSON.stringify(e.details, null, 2));
    if (e.requestId) console.error('request_id:', e.requestId);
    process.exit(1);
  }
})();
