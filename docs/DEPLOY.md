# Deploy guide

## GitHub Pages (zero install)

Production builds use Vite `base: '/gtaclone/'` so the site loads at
[https://cardiobrad.github.io/gtaclone/](https://cardiobrad.github.io/gtaclone/).
Map, gang, and asset data are bundled by Vite, so they share that prefix.
Root hosts (Netlify) set `VITE_BASE=/` at build time.

Pushing to `main` runs `.github/workflows/pages.yml`, which builds with
`npm ci && npm run build` and deploys `dist/` using
`actions/upload-pages-artifact` and `actions/deploy-pages`.

**One-time setup** (repo admin, after the workflow is on `main`):

1. Open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

Until that source is selected, the workflow can succeed and still not publish.

## GitHub (public reference repo)

This project must live in its **own** git repository (not inside a parent folder that tracks other projects).

```bash
cd path/to/fableGTA
git init
git add .
git commit -m "Initial public release of Anywhere City Web"
gh auth login
gh repo create anywhere-city-web --public --source=. --remote=origin --push
```

Replace the repo name with whatever you prefer.

## Netlify (free demo hosting)

### Option A — Connect GitHub (recommended)

1. Push the repo to GitHub (see above).
2. In [Netlify](https://app.netlify.com): **Add new site → Import an existing project**.
3. Select the repo. Netlify reads `netlify.toml` automatically:
   - Build: `npm run build`
   - Publish: `dist`
   - SPA redirect included
4. Deploy. Your live URL will look like `https://something.netlify.app`.

### Option B — Netlify CLI (manual deploy)

```bash
npm install
npm run build
netlify login
netlify init    # link or create a site
netlify deploy --prod --dir=dist
```

## Verify locally before deploy

```bash
npm install
npm run build
npm run preview   # http://localhost:4173/gtaclone/
```
