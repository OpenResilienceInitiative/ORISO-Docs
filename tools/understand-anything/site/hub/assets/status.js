// Fills the start page's date, counts and state from /status.json, which
// ua-site-sync.sh writes each time it installs a published graph generation.
// Nothing on the page is typed in by hand any more (ORISO-Docs#129).
(function () {
  var STALE_HOURS = 36; // one daily build plus slack

  function set(selector, text) {
    document.querySelectorAll(selector).forEach(function (el) { el.textContent = text; });
  }

  function state(ok) {
    var el = document.querySelector('[data-ua="state"]');
    if (!el) return;
    el.className = 'status ' + (ok ? 'ok' : 'warn');
    el.innerHTML = ok
      ? '<span lang="de">aktuell</span><span lang="en">current</span>'
      : '<span lang="de">älter als ein Tag</span><span lang="en">older than a day</span>';
    var badge = document.querySelector('[data-ua="badge"]');
    if (badge) badge.className = 'badge ' + (ok ? 'ok' : 'warn');
  }

  fetch('/status.json', { cache: 'no-store' })
    .then(function (response) { if (!response.ok) throw new Error(response.status); return response.json(); })
    .then(function (status) {
      var built = new Date(status.generatedAt);
      var de = new Intl.NumberFormat('de-DE');
      set('[data-ua="date-de"]', built.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }));
      set('[data-ua="date-en"]', built.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
      set('[data-ua="built"]', built.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
      set('[data-ua="repositories"]', String(status.repositories));
      set('[data-ua="nodes"]', de.format(status.nodes));
      (status.sources || []).forEach(function (source) {
        set('[data-ua-nodes="' + source.name + '"]', de.format(source.nodes));
      });
      state((Date.now() - built.getTime()) / 36e5 <= STALE_HOURS);
    })
    .catch(function () {
      set('[data-ua="built"]', '–');
      state(false);
    });
})();
