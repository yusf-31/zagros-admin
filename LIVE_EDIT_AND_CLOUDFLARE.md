# Live updates while editing + Admin on your Cloudflare domain

## What you get

1. **Admin panel on your domain** (e.g. `https://admin.zagross.com`) via Cloudflare Pages.
2. **Live updates when we edit** – run the app locally; every code change refreshes in the browser automatically.

---

## Part 1: Connect admin panel to your domain (Cloudflare)

Full steps are in **CLOUDFLARE_DEPLOYMENT.md**. Short version:

1. **Push the project to GitHub** (if not already).
2. In **Cloudflare Dashboard** → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Select the repo, set:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. In **Settings → Environment variables** add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   (same values as in your local `.env`)
5. After the first deploy, go to **Custom domains** → **Set up a custom domain** → e.g. `admin.zagross.com`.

After that, the admin panel is live on your domain. Every push to `main` will auto-deploy.

---

## Part 2: See live updates when editing with me

While we’re changing code together, use the **local dev server**. Then every save will update the app in the browser (Vite hot reload).

### Steps

1. **Open a terminal** in the admin panel folder:
   ```bash
   cd C:\Users\dell\Downloads\zagross-admin-panel\zagross-admin-panel
   ```

2. **Start the dev server:**
   ```bash
   npm run dev
   ```

3. **Open in your browser:**  
   **http://localhost:3000**

4. **Keep that tab open** while we edit. When we change and save a file:
   - The page will **reload or hot-update** automatically.
   - You see the new version right away.

### Summary

| Goal                         | What to do |
|-----------------------------|------------|
| Use admin on your domain    | Deploy via Cloudflare (Part 1). Use `https://admin.zagross.com` (or your subdomain). |
| See live updates while editing | Run `npm run dev`, open http://localhost:3000, keep the tab open and edit with me. |

### Optional: push changes to the domain

When we’re done editing and you want the same version on your domain:

```bash
git add .
git commit -m "Describe the changes"
git push origin main
```

Cloudflare will build and deploy; in a few minutes your domain will show the update.
