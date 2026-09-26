(function () {
  'use strict';
  var data = window.__chartData || { perDay: [], status: [] };

  function fmtDay(s) { return s.slice(5); }

  var text = '#e6e9f2';
  var muted = '#7d849b';
  var border = '#232a3d';
  var ok = '#34d399';
  var danger = '#f87171';
  var accent = '#6366f1';
  var info = '#60a5fa';
  var warn = '#fbbf24';

  Chart.defaults.color = text;
  Chart.defaults.borderColor = border;
  Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  var c1 = document.getElementById('chartRequests');
  if (c1) {
    new Chart(c1, {
      type: 'bar',
      data: {
        labels: data.perDay.map(function (r) { return fmtDay(r.day); }),
        datasets: [
          { label: 'OK', data: data.perDay.map(function (r) { return r.ok; }), backgroundColor: ok, borderRadius: 4, barPercentage: 0.7, categoryPercentage: 0.8 },
          { label: 'Errors', data: data.perDay.map(function (r) { return r.n - r.ok; }), backgroundColor: danger, borderRadius: 4, barPercentage: 0.7, categoryPercentage: 0.8 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', align: 'end', labels: { boxWidth: 12, boxHeight: 12, padding: 14, color: text } },
          tooltip: { backgroundColor: '#141926', borderColor: border, borderWidth: 1, padding: 10, titleColor: text, bodyColor: text }
        },
        scales: {
          x: { stacked: true, ticks: { color: muted, font: { size: 11 } }, grid: { display: false, drawBorder: false } },
          y: { stacked: true, beginAtZero: true, ticks: { color: muted, font: { size: 11 }, precision: 0 }, grid: { color: border, drawBorder: false } }
        }
      }
    });
  }

  var c2 = document.getElementById('chartStatus');
  if (c2) {
    var palette = [ok, accent, info, warn, danger, muted];
    var labels = data.status.map(function (s) {
      var st = s.status;
      if (st >= 200 && st < 300) return st + ' OK';
      if (st >= 300 && st < 400) return st + ' Redirect';
      if (st >= 400 && st < 500) return st + ' Client';
      return st + ' Server';
    });
    new Chart(c2, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data.status.map(function (s) { return s.n; }),
          backgroundColor: data.status.map(function (_, i) { return palette[i % palette.length]; }),
          borderColor: '#141926',
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 10, boxHeight: 10, padding: 10, color: text } },
          tooltip: { backgroundColor: '#141926', borderColor: border, borderWidth: 1, padding: 10, titleColor: text, bodyColor: text }
        }
      }
    });
  }
})();
