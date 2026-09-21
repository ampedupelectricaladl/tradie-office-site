/* apply.js — Tradie Office application form.
 *
 * No libraries, no network calls except the POST to the configured endpoint.
 *
 * Behaviour:
 *   1. Read the endpoint from window.TO_CONFIG.applyEndpoint (assets/config.js).
 *   2. If it is empty, go straight to the copy-block fallback. No pointless
 *      failed request, and no mailto: to an address we do not own.
 *   3. Otherwise POST the fields as JSON. On any failure (network, non-2xx,
 *      timeout) show the same copy block, so an application is never lost.
 *   4. The fallback shows every answer as one selectable block of text with
 *      instructions to send it to us on Instagram. The handle is only named if
 *      TO_CONFIG.instagram is set — we never print a contact detail we have
 *      not been given.
 */
(function () {
  'use strict';

  var TIMEOUT_MS = 12000;

  var cfg = window.TO_CONFIG || {};
  var form = document.getElementById('apply-form');
  var statusEl = document.getElementById('apply-status');
  var copyBox = document.getElementById('apply-copy');
  var copyNote = document.getElementById('apply-copy-note');
  var copyText = document.getElementById('apply-copy-text');
  if (!form) return;

  var LABELS = {
    business: 'Business name',
    trade: 'Trade',
    name: 'Your name',
    mobile: 'Mobile',
    email: 'Email',
    city: 'City or town',
    team: 'Team size',
    headache: 'Biggest headache'
  };
  var ORDER = ['business', 'trade', 'name', 'mobile', 'email', 'city', 'team', 'headache'];

  function say(message, kind) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = 'form-status ' + (kind || 'ok');
    statusEl.hidden = false;
  }

  function values() {
    var out = {};
    for (var i = 0; i < ORDER.length; i++) {
      var el = form.elements[ORDER[i]];
      out[ORDER[i]] = el && el.value ? String(el.value).trim() : '';
    }
    return out;
  }

  function endpoint() {
    return (cfg.applyEndpoint || '').trim() || null;
  }

  /** Show the answers as one copyable block instead of sending them anywhere. */
  function copyFallback(data, why) {
    var lines = ['Tradie Office application', ''];
    for (var i = 0; i < ORDER.length; i++) {
      lines.push(LABELS[ORDER[i]] + ': ' + data[ORDER[i]]);
    }

    var handle = (cfg.instagram || '').trim();
    var note = 'Applications open shortly — copy this and send it to us on Instagram';
    note += handle ? ' (' + handle + ').' : '.';
    if (why) note += ' (' + why + ')';

    if (copyText) copyText.value = lines.join('\n');
    if (copyNote) copyNote.textContent = note;
    if (copyBox) copyBox.hidden = false;

    say(note, 'err');

    if (copyText && copyText.focus) {
      copyText.focus();
      if (copyText.select) copyText.select();
    }
  }

  /** Returns the index of the first empty required field, or -1. */
  function firstEmpty(data) {
    for (var i = 0; i < ORDER.length; i++) {
      if (!data[ORDER[i]]) return i;
    }
    return -1;
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();

    var data = values();
    var gap = firstEmpty(data);
    if (gap !== -1) {
      say('Almost there — "' + LABELS[ORDER[gap]] + '" is still empty.', 'err');
      var el = form.elements[ORDER[gap]];
      if (el && el.focus) el.focus();
      return;
    }

    var url = endpoint();
    if (!url) { copyFallback(data, null); return; }

    var button = form.querySelector('button[type="submit"]');
    if (button) { button.disabled = true; button.textContent = 'Sending...'; }
    say('Sending your application...', 'ok');

    var done = false;
    var timer = setTimeout(function () {
      if (done) return;
      done = true;
      if (button) { button.disabled = false; button.textContent = 'Send my application'; }
      copyFallback(data, 'the form took too long');
    }, TIMEOUT_MS);

    function fail(why) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (button) { button.disabled = false; button.textContent = 'Send my application'; }
      copyFallback(data, why);
    }

    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (done) return;
        if (!res || !res.ok) { fail('the form could not be delivered'); return; }
        done = true;
        clearTimeout(timer);
        form.hidden = true;
        say('Got it. We read every application and we will reply either way, usually the same day.', 'ok');
      })['catch'](function () { fail('the form could not be delivered'); });
    } catch (e) {
      fail('the form could not be delivered');
    }
  });
})();
