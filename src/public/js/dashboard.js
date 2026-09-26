(function () {
  'use strict';
  var data = window.__chartData || { perDay: [], status: [] };

  function fmtDay(s) { return s.slice(5); }

  var c1 = document.getElementById('chartRequests');
  if (c1) {
    new Chart(c1, {
      type: 'bar',
      data: {
        labels: data.perDay.map(function (r) { return fmtDay(r.day); }),
        datasets: [
          { label: 'OK', data: data.perDay.map(function (r) { return r.ok; }), backgroundColor: '#3ddc84' },
          { label: 'Errors', data: data.perDay.map(function (r) { return r.n - r.ok; }), backgroundColor: '#ff6b6b' }
        ]
      },
      options: {
        plugins: { legend: { labels: { color: '#e6e8ee' } } },
        scales: {
          x: { stacked: true, ticks: { color: '#8a91a3' }, grid: { color: '#262c39' } },
          y: { stacked: true, beginAtZero: true, ticks: { color: '#8a91a3' }, grid: { color: '#262c39' } }
        }
      }
    });
  }

  var c2 = document.getElementById('chartStatus');
  if (c2) {
    new Chart(c2, {
      type: 'doughnut',
      data: {
        labels: data.status.map(function (s) { return 'HTTP ' + s.status; }),
        datasets: [{ data: data.status.map(function (s) { return s.n; }),
          backgroundColor: ['#3ddc84', '#5b8cff', '#ffc857', '#ff6b6b', '#8a91a3'] }]
      },
      options: { plugins: { legend: { labels: { color: '#e6e8ee' } } } }
    });
  }
})();
