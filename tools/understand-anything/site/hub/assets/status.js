// Fills the start page's date, counts and state from /status.json, which
// ua-site-sync.sh writes each time it installs a published graph generation.
// Nothing on the page is typed in by hand any more (ORISO-Docs#129).
(function () {

  function set(selector, text) {
    document.querySelectorAll(selector).forEach(function (el) { el.textContent = text; });
  }

  function state(ok, missing) {
    var el = document.querySelector('[data-ua="state"]');
    if (!el) return;
    el.className = 'status ' + (ok ? 'ok' : 'warn');
    el.innerHTML = ok
      ? '<span lang="de">Release gebunden</span><span lang="en">Release bound</span>'
      : missing ? '<span lang="de">Status fehlt</span><span lang="en">Status unavailable</span>' : '<span lang="de">Vorschau oder abweichende Quellen</span><span lang="en">Preview or differing sources</span>';
    var badge = document.querySelector('[data-ua="badge"]');
    if (badge) badge.className = 'badge ' + (ok ? 'ok' : 'warn');
  }

  // Call coverage under each repository card: confirmed, possible (not type-checked) and
  // unresolved calls, so an empty caller list is not read as "no callers" (ORISO-Docs#167).
  function calls(source, format, formatEn) {
    var c = source.calls;
    if (!c || !(c.confirmed + c.possible + (c.unresolved || 0))) return;
    var known = c.unresolved !== null && c.unresolved !== undefined;
    var text = {
      de: 'Aufrufe: ' + format.format(c.confirmed) + ' bestätigt · ' + format.format(c.possible) + ' möglich · ' + (known ? format.format(c.unresolved) + ' nicht aufgelöst' : 'nicht aufgelöst: unbekannt'),
      en: 'Calls: ' + formatEn.format(c.confirmed) + ' confirmed · ' + formatEn.format(c.possible) + ' possible · ' + (known ? formatEn.format(c.unresolved) + ' unresolved' : 'unresolved: unknown')
    };
    document.querySelectorAll('[data-ua-nodes="' + source.name + '"]').forEach(function (el) {
      var card = el.closest && el.closest('.card');
      if (!card || card.querySelector('[data-ua-calls]')) return;
      var line = document.createElement('div');
      line.className = 'calls';
      line.setAttribute('data-ua-calls', source.name);
      ['de', 'en'].forEach(function (lang) {
        var span = document.createElement('span');
        span.setAttribute('lang', lang);
        span.textContent = text[lang];
        line.appendChild(span);
      });
      card.appendChild(line);
    });
  }


  function bilingual(el, de, en) {
    el.textContent = '';
    [de, en].forEach(function (text, index) { var span = document.createElement('span'); span.setAttribute('lang', index ? 'en' : 'de'); span.textContent = text; el.appendChild(span); });
  }

  function sourceList(status) {
    var target = document.querySelector('[data-ua="source-list"]');
    if (!target) return;
    target.textContent = '';
    (status.sources || []).forEach(function (source) {
      if (!/^ORISO-[A-Za-z0-9_-]+$/.test(source.repository) || !/^[a-f0-9]{40}$/.test(source.sourceSHA)) throw new Error('Invalid source revision');
      var row = document.createElement('tr');
      [source.repository, source.sourceSHA, source.ref, status.generatedAt].forEach(function (value, index) {
        var cell = document.createElement('td');
        if (index < 2) {
          var link = document.createElement('a');
          link.setAttribute('href', 'https://github.com/OpenResilienceInitiative/' + encodeURIComponent(source.repository) + '/tree/' + source.sourceSHA);
          link.textContent = value;
          cell.appendChild(link);
        } else cell.textContent = value;
        row.appendChild(cell);
      });
      target.appendChild(row);
    });
  }

  function attempt(status) {
    var el = document.querySelector('[data-ua="attempt"]');
    if (!el) return;
    fetch('/refresh-attempt.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('No receipt'); return r.json(); })
      .then(function (receipt) {
        var codes = {preflight: 'PREFLIGHT_FAILED', generation: 'GENERATION_FAILED', installation: 'INSTALLATION_FAILED', readback: 'READBACK_FAILED', complete: 'NONE'};
        if (receipt.schemaVersion !== 'oriso.refresh-attempt/v1' || !Number.isFinite(new Date(receipt.attemptedAt).getTime()) || !/^[a-zA-Z0-9_.-]{1,120}$/.test(receipt.attemptId) || !codes[receipt.phase] || receipt.errorCode !== codes[receipt.phase] || !['failed', 'succeeded'].includes(receipt.state) || (receipt.state === 'succeeded') !== (receipt.phase === 'complete')) throw new Error('Invalid receipt');
        var attempted = receipt.releaseVersion && /^v?\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/.test(receipt.releaseVersion) ? receipt.releaseVersion : '–';
        var installed = status.releaseVersion || '–';
        el.className = receipt.state === 'failed' ? 'note' : 'src';
        bilingual(el,
          (receipt.state === 'failed' ? 'Aktualisierung fehlgeschlagen: ' + attempted + ' · ' + receipt.attemptedAt + ' · ' + receipt.errorCode : 'Letzte Aktualisierung geprüft: ' + receipt.attemptedAt) + '. Installiert: ' + installed + ' · ' + status.generationId,
          (receipt.state === 'failed' ? 'Refresh failed: ' + attempted + ' · ' + receipt.attemptedAt + ' · ' + receipt.errorCode : 'Latest refresh verified: ' + receipt.attemptedAt) + '. Installed: ' + installed + ' · ' + status.generationId);
      })
      .catch(function () { el.className = 'src'; bilingual(el, 'Aktualisierungsnachweis nicht verfügbar. Installiert: ' + (status.releaseVersion || '–'), 'Refresh receipt unavailable. Installed: ' + (status.releaseVersion || '–')); });
  }

  fetch('/status.json', { cache: 'no-store' })
    .then(function (response) { if (!response.ok) throw new Error(response.status); return response.json(); })
    .then(function (status) {
      var built = new Date(status.generatedAt);
      if (!Number.isFinite(built.getTime()) || built.getTime() > Date.now() || !status.branch) throw new Error('Invalid status');
      set('[data-ua="branch"]', status.branch);
      set('[data-ua="release"]', status.releaseVersion || '–');
      set('[data-ua="released"]', status.releasedAt || '–');
      var de = new Intl.NumberFormat('de-DE');
      set('[data-ua="date-de"]', built.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }));
      set('[data-ua="date-en"]', built.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
      set('[data-ua="built"]', built.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
      set('[data-ua="repositories"]', String(status.repositories));
      set('[data-ua="nodes"]', de.format(status.nodes));
      (status.sources || []).forEach(function (source) {
        set('[data-ua-nodes="' + source.name + '"]', de.format(source.nodes));
        calls(source, de, new Intl.NumberFormat('en-GB'));
      });
      (status.aggregates || []).forEach(function (aggregate) {
        set('[data-ua-nodes="' + aggregate.name + '"]', de.format(aggregate.nodes));
        var coverage = aggregate.coverage || [];
        var included = coverage.filter(function (s) { return s.status === 'included' && /^[a-f0-9]{40}$/.test(s.sourceCommit) && aggregate.sourceCommits && aggregate.sourceCommits[s.repository] === s.sourceCommit; }).map(function (s) { return s.repository; });
        var unavailable = coverage.filter(function (s) { return s.status === 'unavailable'; }).map(function (s) { return s.repository; });
        document.querySelectorAll('[data-ua-coverage="' + aggregate.name + '"]').forEach(function (el) {
          bilingual(el, 'Enthalten: ' + (included.join(', ') || '–') + '. Nicht verfügbar: ' + (unavailable.join(', ') || '–'), 'Included: ' + (included.join(', ') || '–') + '. Unavailable: ' + (unavailable.join(', ') || '–'));
        });
      });
      sourceList(status);
      attempt(status);
      // Age describes the generation; releases are not scheduled daily.
      var locked = status.releaseSources || [];
      var sources = status.sources || [];
      state(Boolean(status.releaseVersion && status.releasedAt && locked.length && locked.length === sources.length && new Set(locked.map(function (s) { return s.repository; })).size === locked.length && sources.every(function (source) {
        return locked.some(function (s) { return s.repository === source.repository && s.ref === source.ref && s.sourceSHA === source.sourceSHA; });
      })));
    })
    .catch(function () {
      set('[data-ua="built"]', '–');
      set('[data-ua="release"]', '–');
      set('[data-ua="released"]', '–');
      set('[data-ua="branch"]', '–');
      state(false, true);
      var attemptState = document.querySelector('[data-ua="attempt"]'); if (attemptState) bilingual(attemptState, 'Installierter Status nicht verfügbar; ein Aktualisierungsnachweis bestätigt keinen Release.', 'Installed status unavailable; a refresh receipt does not establish the installed release.');
    });
})();
