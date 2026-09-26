'use strict';

const axios = require('axios');
const { config } = require('../config');
const logger = require('../utils/logger');

const http = axios.create({
  baseURL: config.minimax.apiBase,
  timeout: config.minimax.timeoutMs,
  httpAgent: new (require('http').Agent)({ keepAlive: true }),
  httpsAgent: new (require('https').Agent)({ keepAlive: true }),
  headers: {
    Authorization: `Bearer ${config.minimax.apiKey}`,
    'Content-Type': 'application/json',
  },
});

const SYSTEM_PROMPT = `You are an expert OCR assistant specialized in receipts and invoices.
Extract structured data from the provided image(s). Always respond with strict JSON matching this schema:

{
  "document_type": "receipt" | "invoice" | "unknown",
  "merchant": string | null,
  "date": string | null,             // ISO 8601 date if possible
  "total": number | null,            // final amount paid
  "currency": string | null,         // ISO 4217 (USD, EUR, MXN, ARS, COP, ...)
  "subtotal": number | null,
  "tax": number | null,
  "tip": number | null,
  "invoice_number": string | null,
  "vendor_tax_id": string | null,    // RFC, NIF, EIN, CUIT, etc.
  "payment_method": string | null,
  "items": [
    { "description": string, "quantity": number | null, "unit_price": number | null, "total": number | null }
  ],
  "extra": object                    // any other relevant fields
}

Rules:
- Use null for missing values; never invent data.
- Numbers without currency symbol.
- If multiple pages, merge items; totals come from the last page if any.
- Output ONLY the JSON object, no commentary, no markdown fences.`;

function buildUserPrompt(pages, type) {
  const content = [
    {
      type: 'text',
      text:
        type && (type === 'receipt' || type === 'invoice')
          ? `Document type hint: ${type}. Extract the fields accordingly.`
          : 'Auto-detect the document type and extract the fields.',
    },
  ];
  for (const p of pages) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${p.mime};base64,${p.buffer.toString('base64')}` },
    });
  }
  return content;
}

function extractJson(text) {
  if (!text) return null;
  const trimmed = text.trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first === -1 || last === -1) return null;
  const candidate = trimmed.slice(first, last + 1);
  try {
    return JSON.parse(candidate);
  } catch (_e) {
    return null;
  }
}

async function callMinimaxVision(pages, type) {
  if (!config.minimax.apiKey) {
    throw Object.assign(new Error('MiniMax API key not configured'), {
      status: 503,
      code: 'OCR_PROVIDER_ERROR',
    });
  }
  const payload = {
    model: config.minimax.model,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(pages, type) },
    ],
  };

  try {
    const { data } = await http.post('/chat/completions', payload);
    const choice = data.choices && data.choices[0];
    const raw = choice && choice.message && choice.message.content;
    const parsed = typeof raw === 'string' ? extractJson(raw) : raw;
    if (!parsed) {
      throw Object.assign(new Error('Provider returned non-JSON response'), {
        status: 502,
        code: 'OCR_PROVIDER_ERROR',
      });
    }
    return {
      data: parsed,
      meta: {
        model: data.model || config.minimax.model,
        usage: data.usage || null,
        finish_reason: choice.finish_reason || null,
      },
    };
  } catch (err) {
    // Re-throw our own ApiError-shaped errors untouched
    if (err && err.code && ['OCR_TIMEOUT', 'OCR_PROVIDER_ERROR'].includes(err.code)) {
      throw err;
    }
    if (err && err.code === 'ECONNABORTED') {
      throw Object.assign(new Error('OCR provider timeout'), {
        status: 504,
        code: 'OCR_TIMEOUT',
      });
    }
    logger.error({ err: err.message, status: err.response && err.response.status }, 'MiniMax call failed');
    throw Object.assign(new Error('OCR provider error'), {
      status: 502,
      code: 'OCR_PROVIDER_ERROR',
      details: { provider: 'minimax', upstream_status: err.response && err.response.status },
    });
  }
}

module.exports = { callMinimaxVision };
