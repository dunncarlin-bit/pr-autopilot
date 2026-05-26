# PR Autopilot — Setup Guide (One-Time, ~60 min)

This is the only thing Darrington needs to do manually. Jules handles everything after.

---

## Step 1: Create the GitHub App (15 min)

1. Go to https://github.com/settings/apps/new
2. Fill in:
   - **GitHub App name:** `PR Autopilot`
   - **Homepage URL:** `https://pr-autopilot.vercel.app`
   - **Webhook URL:** `https://pr-autopilot.vercel.app/webhook` *(add this after Vercel deploy)*
   - **Webhook secret:** Run `openssl rand -hex 32` in terminal and paste the result here. Save it.
3. **Permissions → Repository permissions:**
   - Pull requests: **Read and write**
   - Issues: **Read and write** *(for comments and labels)*
4. **Subscribe to events:**
   - ✅ Pull request
5. **Where can this GitHub App be installed?**
   - Any account
6. Click **Create GitHub App**
7. Note your **App ID** (shown at top of app settings page)
8. Scroll to **Private keys** → **Generate a private key** → download the `.pem` file

---

## Step 2: Deploy to Vercel (15 min)

```bash
# From this directory
npm install -g vercel   # if not already installed
vercel login
vercel --prod
```

When prompted, add environment variables:
- `GITHUB_APP_ID` → your app ID from Step 1
- `GITHUB_PRIVATE_KEY` → contents of the `.pem` file (paste the entire thing)
- `GITHUB_WEBHOOK_SECRET` → the random hex from Step 1
- `ANTHROPIC_API_KEY` → your key from https://console.anthropic.com

Vercel will give you a URL like `https://pr-autopilot-xxx.vercel.app`.

---

## Step 3: Connect webhook URL (2 min)

1. Go back to your GitHub App settings
2. Set **Webhook URL** to `https://pr-autopilot.vercel.app/webhook`
3. Click **Save changes**

---

## Step 4: Create the GitHub repo (5 min)

```bash
gh repo create dunncarlin-bit/pr-autopilot --public --description "GitHub App that auto-writes PR descriptions"
git init
git remote add origin git@github.com:dunncarlin-bit/pr-autopilot.git
git add .
git commit -m "feat: initial PR Autopilot implementation"
git push -u origin main
```

---

## Step 5: Install on your own repos (2 min)

Go to: `https://github.com/apps/pr-autopilot/installations/new`

Install on `dunncarlin-bit/jules-bounty-network` first (dogfood).

---

## Step 6: Test it

Open a PR on your test repo with an empty description. Within 15 seconds, check the PR body — it should be filled in.

---

## Step 7: Submit to GitHub Marketplace (when ready)

1. GitHub App settings → Marketplace → List this app
2. Fill in description, screenshots, pricing plans ($0 + $15/mo + $49/mo)
3. Submit for review (GitHub reviews within a few days)

---

## What Jules does from here

Everything in `AGENT.md`. You're done.
