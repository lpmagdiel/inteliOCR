'use strict';

(function () {
  const $ = (id) => document.getElementById(id);
  const runBtn = $('run');
  const statusEl = $('status');

  function refresh() {
    runBtn.disabled = !($('apiKey').value.trim() && $('file').files[0]);
  }
  $('apiKey').addEventListener('input', refresh);
  $('file').addEventListener('change', refresh);

  runBtn.addEventListener('click', async () => {
    const file = $('file').files[0];
    const apiKey = $('apiKey').value.trim();
    const type = $('type').value;
    const resultPanel = $('resultPanel');
    const resultEl = $('result');

    runBtn.disabled = true;
    statusEl.textContent = 'Uploading…';
    statusEl.className = 'sub';
    resultPanel.style.display = 'none';

    const client = new InteliOCR({ apiKey });
    try {
      const { data, meta } = await client.ocr(file, { type });
      statusEl.textContent = `Done in ${meta.latency_ms} ms`;
      statusEl.className = 'ok';
      resultEl.textContent = JSON.stringify({ data, meta }, null, 2);
      resultPanel.style.display = 'block';
    } catch (e) {
      statusEl.textContent = `[${e.code}] ${e.message}`;
      statusEl.className = 'err';
      resultEl.textContent = JSON.stringify({ code: e.code, message: e.message, details: e.details }, null, 2);
      resultPanel.style.display = 'block';
    } finally {
      runBtn.disabled = false;
    }
  });
})();