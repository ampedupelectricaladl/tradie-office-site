/* site.js — renders the few bits of the page that depend on assets/config.js.
 *
 * Runs on every page. Today that is one thing: the footer contact line, which
 * only appears if a real contact email has been configured. If TO_CONFIG is
 * missing or contactEmail is empty, the line stays hidden and the page reads
 * fine without it — no dead mailto: link is ever shown.
 */
(function () {
  'use strict';

  var cfg = window.TO_CONFIG || {};
  var email = (cfg.contactEmail || '').trim();

  var slots = document.querySelectorAll('[data-contact-line]');
  for (var i = 0; i < slots.length; i++) {
    var slot = slots[i];
    if (!email) { slot.hidden = true; continue; }

    while (slot.firstChild) slot.removeChild(slot.firstChild);
    slot.appendChild(document.createTextNode('Questions: '));
    var a = document.createElement('a');
    a.href = 'mailto:' + email;
    a.textContent = email;
    slot.appendChild(a);
    slot.hidden = false;
  }
})();
