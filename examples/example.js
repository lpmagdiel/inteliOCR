'use strict';

(function () {
  const $ = (id) => document.getElementById(id);
  const runBtn = $('run');
  const statusEl = $('status');
  const engineSel = $('engine');
  const typeSel = $('type');
  const langField = $('langField');
  const langInput = $('lang');

  function syncLangVisibility() {
    langField.style.display = engineSel.value === 'basic' ? '' : 'none';
  }

  function refresh() {
    runBtn.disabled = !$('file').files[0];
  }
  $('file').addEventListener('change', refresh);
  engineSel.addEventListener('change', syncLangVisibility);
  syncLangVisibility();

  runBtn.addEventListener('click', async () => {
    const file = $('file').files[0];
    const engine = engineSel.value;
    const type = typeSel.value;
    const lang = langInput.value;
    const resultPanel = $('resultPanel');
    const resultEl = $('result');

    runBtn.disabled = true;
    statusEl.textContent = engine === 'basic' ? 'Recognizing text (tesseract)…' : 'Uploading…';
    statusEl.className = 'sub';
    resultPanel.style.display = 'none';

    const client = new InteliOCR();
    const opts = engine === 'basic' ? { lang } : { type };
    try {
      const { data, meta } = await client.run(engine, file, opts);
      const ms = meta.latency_ms != null ? meta.latency_ms : 0;
      statusEl.textContent = `Done in ${ms} ms · ${meta.engine || engine}`;
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