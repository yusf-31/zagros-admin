# Update admin panel from Cursor → GitHub → Cloudflare domain

This is how we get your edits to go **from me (Cursor) → GitHub → Cloudflare → your domain** automatically.

---

## How it works

```
You ask me to change the admin panel
        ↓
I edit the code in your project
        ↓
I run: git add → git commit → git push
        ↓
GitHub receives the push
        ↓
Cloudflare Pages (connected to your repo) runs: npm run build
        ↓
New version goes live on your domain (e.g. admin.zagross.com)
```

You do the **one-time setup** below. After that, when we update the admin panel and push to GitHub, Cloudflare will deploy to your domain.

---

## One-time setup

### 1. Create a GitHub repository

1. Go to **https://github.com/new**
2. Repository name: `zagross-admin-panel` (or any name)
3. Choose **Private** if you prefer
4. Do **not** add README, .gitignore, or license (we already have them)
5. Click **Create repository**

### 2. Connect this folder to GitHub and push

In Cursor, I can run these for you. You’ll need to replace `YOUR_GITHUB_USERNAME` with your real GitHub username (or org):

```bash
cd C:\Users\dell\Downloads\zagross-admin-panel\zagross-admin-panel
git init
git add .
git commit -m "Initial commit - ZAGROSS Admin Panel"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/zagross-admin-panel.git
git push -u origin main
```

- If you use **HTTPS**, Git will ask for your GitHub username and password (or a **Personal Access Token** instead of password).
- If you use **SSH**, use: `git@github.com:YOUR_GITHUB_USERNAME/zagross-admin-panel.git` as the remote.

Tell me your GitHub username and I’ll use the correct URL when we run these.

### 3. Connect Cloudflare Pages to the repo

1. Go to **https://dash.cloudflare.com** → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Choose **GitHub** and authorize, then select the repo **zagross-admin-panel**
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Environment variables** (Settings → Environment variables):
   - `VITE_SUPABASE_URL` = (same as in your local `.env`)
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = (same as in your local `.env`)
5. **Save and Deploy** – Cloudflare will build and give you a `*.pages.dev` URL
6. **Custom domain:** In the project → **Custom domains** → add your domain (e.g. `admin.zagross.com`)

After this, every push to `main` will trigger a new build and update your domain.

---

## After setup: how we update the admin panel

1. You ask for a change (e.g. “add a new button”, “fix the dashboard”).
2. I edit the files in your project.
3. I run:
   ```bash
   git add .
   git commit -m "Short description of the change"
   git push origin main
   ```
4. You may need to approve the push once (or have Git credentials saved).
5. Cloudflare builds in a few minutes → your domain shows the new version.

---

## Important

- **`.env` is in `.gitignore`** – we never push your Supabase keys. Cloudflare gets them from the **Environment variables** you set in the Pages project.
- If you don’t want me to run `git push` for you, you can run it yourself after I make the edits; the result is the same (GitHub → Cloudflare → domain).

---

## Quick checklist

- [ ] Create GitHub repo
- [ ] Run `git init`, `git add`, `git commit`, `git remote add`, `git push` (tell me your GitHub username so I use the right URL)
- [ ] Connect Cloudflare Pages to the repo, set build command and `dist`, add env vars
- [ ] Add custom domain in Cloudflare
- [ ] From then on: we edit → push to GitHub → Cloudflare updates your domain
