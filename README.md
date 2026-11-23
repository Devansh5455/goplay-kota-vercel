# Go Play Kota — website

The new multi-page website for Go Play Sports Club & Academy, Kota. It is a static site (HTML, CSS and JavaScript), so there is no build step.

Designed by peaknpixel.

## What's inside

| Path | What it is |
|---|---|
| `index.html` | Home (Design 1), with the playable pickleball court |
| `court.html` | Design 1 with the light "court" hero (not indexed by Google) |
| `pickleball.html`, `badminton.html`, `swimming.html`, `turf.html`, `fitness.html` | Sport pages |
| `academy.html`, `membership.html`, `visit.html` | Academy, plans and prices, visit and map |
| `classic/` | Design 2 (Classic), a full copy for comparing designs (not indexed by Google) |
| `assets/` | CSS, JavaScript, photos, Blender renders, 3D court plates |
| `sitemap.xml`, `robots.txt`, `llms.txt` | SEO, plus a plain-text price sheet for AI assistants |
| `vercel.json` | Clean URLs (`/pickleball` instead of `/pickleball.html`), caching and security headers |
| `404.html` | "Page not found" page |

## Deploy on Vercel, the GitHub way (same as GRONE)

1. Create a new **empty** repository on GitHub, for example `goplay-kota`.
2. Put the contents of this folder in that repository. Either:
   - **GitHub website:** open the repo, click **Add file → Upload files**, drag in everything in this folder (including `assets` and `classic`), then click **Commit**.
   - **Terminal:** run these inside this folder:
     ```
     git init
     git add .
     git commit -m "Go Play website"
     git branch -M main
     git remote add origin https://github.com/Devansh5455/goplay-kota.git
     git push -u origin main
     ```
3. On vercel.com, click **Add New → Project**, then **Import** the `goplay-kota` repo.
4. Set **Framework Preset** to **Other**. Leave **Build Command** and **Output Directory** empty. **Root Directory** is the folder that holds `index.html`.
5. Click **Deploy**. Every time you push changes to GitHub, Vercel updates the site by itself.

## Deploy on Vercel without GitHub

Run `npx vercel` inside this folder, or drag the folder onto vercel.com/new.

## Before going live on goplaykota.com

- The site is written for **https://goplaykota.com**: canonical links, the sitemap and structured data all use that address. Add the domain in Vercel under **Project → Settings → Domains**.
- On the free `*.vercel.app` address everything works, and Google still credits the real domain.
- **To launch with one design only:**
  - Delete the `classic/` folder and `court.html`.
  - In each HTML file, delete the line that starts with `<nav class="dswitch"`. That removes the "Compare" bar at the bottom of the page.
- Submit `https://goplaykota.com/sitemap.xml` in Google Search Console.
- Prices come from goplaykota.com/book and goplaykota.com/plans (GST included, as of November 2026). Update them in the HTML if Go Play changes them.
- Three.js (the 3D court) and Google Fonts load from public CDNs, so the visitor needs an internet connection (normal for a website).
