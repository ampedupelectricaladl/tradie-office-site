# Deploying the Tradie Office marketing site

The site is plain HTML/CSS/JS. There is no build step. Deploying is copying
files into a second folder that is its own public git repo, and pushing.

- **Source of truth:** `C:\Users\derba\tradie-office\site\`
- **Deploy repo (public):** `C:\Users\derba\tradie-office-site\`
- **GitHub repo:** `ampedupelectricaladl/tradie-office-site`
- **Live URL:** https://ampedupelectricaladl.github.io/tradie-office-site/

Two repos on purpose: the product repo is private and has tenant folders and
secrets in it. The deploy repo has nothing but the site.

## Redeploy — the two commands

Run from PowerShell.

```powershell
# 1. Copy the site over the deploy repo (overwrites, keeps .git)
robocopy C:\Users\derba\tradie-office\site C:\Users\derba\tradie-office-site /MIR /XD .git

# 2. Commit and push
cd C:\Users\derba\tradie-office-site; git add -A; git commit -m "Site update"; git push
```

`robocopy` exits with code 1 on a successful copy-with-changes. That is normal
and not an error. Anything 8 or above is a real failure.

GitHub Pages rebuilds within about a minute of the push.

## Before you push

```powershell
node C:\Users\derba\tradie-office\site\check-links.js
```

Exit code 0 means every local link, stylesheet, script and anchor resolves.
Non-zero means do not push. The checker also fails the build if an inline
`<style>` block has crept into a page — all styling lives in
`assets/site.css`.

## First-time setup (already done — here for the record)

```powershell
cd C:\Users\derba\tradie-office-site
git init; git add -A; git commit -m "Tradie Office marketing site"
gh repo create ampedupelectricaladl/tradie-office-site --public --source . --push
gh api -X POST repos/ampedupelectricaladl/tradie-office-site/pages `
  -f build_type=legacy -f "source[branch]=main" -f "source[path]=/"
```

If Pages already exists, the POST returns 409. Use `PUT` on the same path to
change the source instead.

## Deliberately not done

- **No CNAME file.** The site serves from the `github.io` project path. Adding
  a custom domain later means adding a `CNAME` file *and* DNS records, and the
  absolute URLs in `sitemap.xml`, `robots.txt`, the `canonical` tags, the `og:`
  tags and the root-absolute links in `404.html` all need updating at the same
  time. Do it as one change, not piecemeal.
- **No analytics, no external fonts, no third-party scripts.** The only
  JavaScript is `assets/apply.js`, served from the same origin.

## The apply form endpoint

`apply.html` carries `data-endpoint="https://REPLACE-ME/apply"`. While that
placeholder is in place, `assets/apply.js` skips the network entirely and opens
a `mailto:` to `hello@tradieoffice.com.au` with every field in the body. The
same fallback fires if a real endpoint is set but times out or errors, so an
application is never silently lost.

To point it at the real endpoint, change that one attribute in `apply.html`
(both `data-endpoint` and the `action` attribute) and redeploy.
