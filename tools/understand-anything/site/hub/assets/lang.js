/* Sprachumschaltung für die Understand-Seiten.
   Setzt nur data-lang auf <html>; das Ein- und Ausblenden macht hub.css.
   Läuft blockierend im <head>, damit beim Laden nichts flackert. */
(function () {
  var KEY = 'oriso-understand-lang';
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* privater Modus */ }
  var initial = (saved === 'de' || saved === 'en') ? saved
    : ((navigator.language || 'de').toLowerCase().indexOf('de') === 0 ? 'de' : 'en');

  function apply(lang, store) {
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);
    if (store) { try { localStorage.setItem(KEY, lang); } catch (e) {} }
    var buttons = document.querySelectorAll('.langswitch button');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', String(buttons[i].getAttribute('data-lang') === lang));
    }
  }

  apply(initial, false);

  document.addEventListener('DOMContentLoaded', function () {
    apply(root.getAttribute('data-lang'), false);
    document.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('.langswitch button') : null;
      if (!button) return;
      apply(button.getAttribute('data-lang'), true);
    });
  });
})();
