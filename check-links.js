#!/usr/bin/env node
'use strict';
/**
 * check-links.js — proves every local link, stylesheet, script, image and
 * anchor target on the marketing site actually exists.
 *
 *   node site/check-links.js            # check, print, exit 0 or 1
 *   node site/check-links.js --help
 *
 * It is deliberately dumb: regex over the HTML, resolve the path, stat it.
 * No dependencies, no build step, no network. Exits non-zero on the first
 * run that finds a problem so it can sit in front of a deploy.
 *
 * Things it knows about this site specifically:
 *  - 404.html uses root-absolute links prefixed with the GitHub Pages project
 *    path (/tradie-office-site/...), because a 404 can be served from any
 *    depth. Those are rewritten to the site root before checking.
 *  - mailto:, tel:, https:, // and #-only links are skipped as external or
 *    in-page (in-page anchors are still checked against ids in the file).
 */

const fs = require('fs');
const path = require('path');

const SITE = __dirname;
const PAGES_PREFIX = '/tradie-office-site/';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('check-links.js — verify every local href/src/anchor in site/ resolves.');
  console.log('Usage: node site/check-links.js');
  console.log('Exit code 0 = all good, 1 = at least one broken reference.');
  process.exit(0);
}

/** Every .html file directly inside site/. */
function htmlFiles() {
  return fs.readdirSync(SITE)
    .filter((f) => f.toLowerCase().endsWith('.html'))
    .sort();
}

/** Pull href="..." and src="..." values out of the markup. */
function references(html) {
  const out = [];
  const re = /(?:href|src)\s*=\s*"([^"]*)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1].trim());
  return out;
}

/** Pull id="..." values so in-page anchors can be verified. */
function ids(html) {
  const out = new Set();
  const re = /\sid\s*=\s*"([^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) out.add(m[1]);
  return out;
}

function isExternal(ref) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref);
}

const problems = [];
const checked = { pages: 0, links: 0, external: 0, anchors: 0 };

for (const file of htmlFiles()) {
  const full = path.join(SITE, file);
  const html = fs.readFileSync(full, 'utf8');
  const pageIds = ids(html);
  checked.pages += 1;

  for (const ref of references(html)) {
    if (ref === '') {
      problems.push(`${file}: empty href/src`);
      continue;
    }

    if (isExternal(ref)) { checked.external += 1; continue; }

    // Pure in-page anchor.
    if (ref.startsWith('#')) {
      checked.anchors += 1;
      const id = ref.slice(1);
      if (id && !pageIds.has(id)) problems.push(`${file}: anchor ${ref} has no matching id`);
      continue;
    }

    // Split off any #fragment / ?query.
    const [rawPath, fragment] = ref.split('#');
    const cleanPath = rawPath.split('?')[0];
    if (!cleanPath) { checked.anchors += 1; continue; }

    let target;
    if (cleanPath.startsWith(PAGES_PREFIX)) {
      target = path.join(SITE, cleanPath.slice(PAGES_PREFIX.length));
    } else if (cleanPath.startsWith('/')) {
      problems.push(`${file}: root-absolute link "${ref}" will 404 on a project Pages site`);
      continue;
    } else {
      target = path.resolve(path.dirname(full), cleanPath);
    }

    checked.links += 1;

    if (!fs.existsSync(target)) {
      problems.push(`${file}: ${ref} -> missing ${path.relative(SITE, target)}`);
      continue;
    }

    // Fragment into another page: confirm that page has the id.
    if (fragment && target.toLowerCase().endsWith('.html')) {
      const otherIds = ids(fs.readFileSync(target, 'utf8'));
      if (!otherIds.has(fragment)) {
        problems.push(`${file}: ${ref} -> ${path.basename(target)} has no id "${fragment}"`);
      }
    }
  }
}

// Non-HTML files that must exist for the site to be complete.
for (const required of ['assets/site.css', 'assets/logo.svg', 'assets/mark.svg',
                        'assets/apply.js', 'robots.txt', 'sitemap.xml', '404.html']) {
  if (!fs.existsSync(path.join(SITE, required))) problems.push(`missing required file: ${required}`);
}

// A site.css with an inline <style> block anywhere is a contract breach.
for (const file of htmlFiles()) {
  const html = fs.readFileSync(path.join(SITE, file), 'utf8');
  if (/<style[\s>]/i.test(html)) problems.push(`${file}: contains an inline <style> block`);
}

console.log(`checked ${checked.pages} pages, ${checked.links} local links, ` +
            `${checked.anchors} in-page anchors, skipped ${checked.external} external`);

if (problems.length) {
  console.error(`\nBROKEN (${problems.length}):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}

console.log('OK — every local link resolves.');
