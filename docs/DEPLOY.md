# Deploy guide

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
npm run preview   # http://localhost:4173
```
