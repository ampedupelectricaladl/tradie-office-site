/* config.js — the only file with a contact detail or an endpoint in it.
 *
 * Every page loads this before anything else, and nothing else in the site
 * hard-codes an email address, a form endpoint or a social handle.
 *
 *   applyEndpoint  URL the application form POSTs to. Empty = no endpoint yet;
 *                  the form shows a copyable block instead of failing.
 *   contactEmail   Public contact address. Empty = the footer contact line and
 *                  every "email us" link are not rendered at all.
 *                  DO NOT put an @tradieoffice.com.au address here — that
 *                  domain is registered to someone else (docs/RESEARCH.md §3),
 *                  so mail to it does not reach us.
 *   instagram      Handle including the @, e.g. "@tradieoffice". Empty = the
 *                  "send it to us on Instagram" line names no handle.
 *   tiktok         Same, for TikTok.
 *
 * All four are deliberately empty. Fill one in only when it is real.
 */
window.TO_CONFIG = {
  applyEndpoint: "",
  contactEmail: "",
  instagram: "",
  tiktok: ""
};
