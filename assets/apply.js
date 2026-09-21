/* apply.js — Tradie Office application form.
 *
 * No libraries, no network calls except the POST to the configured endpoint.
 *
 * Behaviour:
 *   1. Read the endpoint from the form's data-endpoint attribute.
 *   2. If the endpoint is missing, empty, or still the REPLACE-ME placeholder,
 *      go straight to the mailto fallback. No pointless failed request.
 *   3. Otherwise POST the fields as JSON. On any failure (network, non-2xx,
 *      timeout) fall back to mailto as well, so an application is never lost.
 *   4. The form also has a plain action= so that with JS off the browser does
 *      something sensible; the <noscript> block gives the email address.
 */
(function () {
  'use strict';

  var MAILTO = 'hello@tradieoffice.com.au';
  var PLACEHOLDER = 'REPLACE-ME';
  var TIMEOUT_MS = 12000;

  var form = document.getElementById('apply-form');
  var statusEl = document.getElementById('apply-status');
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
    var url = (form.getAttribute('data-endpoint') || '').trim();
    if (!url) return null;
    if (url.indexOf(PLACEHOLDER) !== -1) return null;
    return url;
  }

  function mailtoFallback(data, why) {
    var lines = [];
    for (var i = 0; i < ORDER.length; i++) {
      var k = ORDER[i];
      lines.push(LABELS[k] + ': ' + data[k]);
    }
    lines.push('');
    lines.push('Sent from the Tradie Office application form.');

    var href = 'mailto:' + MAILTO +
      '?subject=' + encodeURIComponent('Tradie Office application - ' + (data.business || data.name || 'new')) +
      '&body=' + encodeURIComponent(lines.join('\n'));

    say('Opening your email app with the answers filled in. Just press send. ' +
        'If nothing opens, email them to ' + MAILTO + '.' + (why ? ' (' + why + ')' : ''), 'err');

    window.location.href = href;
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
    if (!url) { mailtoFallback(data, 'form endpoint not set up yet'); return; }

    var button = form.querySelector('button[type="submit"]');
    if (button) { button.disabled = true; button.textContent = 'Sending...'; }
    say('Sending your application...', 'ok');

    var done = false;
    var timer = setTimeout(function () {
      if (done) return;
      done = true;
      if (button) { button.disabled = false; button.textContent = 'Send my application'; }
      mailtoFallback(data, 'the form took too long');
    }, TIMEOUT_MS);

    function fail(why) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (button) { button.disabled = false; button.textContent = 'Send my application'; }
      mailtoFallback(data, why);
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
