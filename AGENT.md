# PR Autopilot — Agent Operating Instructions

> Instructions for Jules (or any AI agent) operating this business autonomously.

---

## What this repo is

A GitHub App (Node.js / Express) deployed on Vercel that:
1. Receives `pull_request` webhooks from GitHub
2. Checks if the PR description is empty or minimal
3. Generates a structured description using Claude Haiku
4. Updates the PR body (or posts a comment as fallback)

---

## Daily operating tasks

### Monitor health
- Check `https://pr-autopilot.vercel.app/health` — should return `{"status":"ok"}`
- Check Vercel function logs for `💥 Error` lines — investigate and fix if count > 5/day
- Check GitHub App webhook deliveries at `github.com/settings/apps/pr-autopilot/deliveries` — look for non-200 responses

### Monitor revenue
- Check GitHub Marketplace dashboard for new installs/upgrades
- Log new paying customers in `data/customers.csv` (create if it doesn't exist):
  ```
  date,org,plan,mrr
  2026-05-09,acme-corp,team,15
  ```

### Handle issues
- Respond to GitHub Issues filed on this repo within 24 hours
- Common issue types and responses:
  - "Description was generated on a PR I already wrote" → check `shouldGenerate()` threshold; bump the line count if needed
  - "Getting 401 from webhook" → verify `GITHUB_WEBHOOK_SECRET` on Vercel matches App settings
  - "No description generated" → check Vercel logs for the PR number; likely a diff that's too large or a binary-only change

---

## Deployment

App lives at: `https://pr-autopilot.vercel.app`
Webhook URL (set in GitHub App settings): `https://pr-autopilot.vercel.app/webhook`

**To deploy a change:**
```bash
git push origin main   # Vercel auto-deploys from main
```

**To check deployment status:**
```bash
vercel ls pr-autopilot
```

---

## Environment variables (Vercel)

Set these in Vercel Dashboard → Project → Settings → Environment Variables:
- `GITHUB_APP_ID`
- `GITHUB_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`
- `ANTHROPIC_API_KEY`

Never commit these values to the repo.

---

## What Jules should NOT do

- Do NOT modify `lib/verify.js` — signature verification is a security boundary
- Do NOT increase `MAX_DIFF_CHARS` above 40,000 without testing token costs
- Do NOT auto-merge PRs from external contributors without Darrington's review
- Do NOT change the pricing in `CHARTER.md` without flagging to Darrington first
- Do NOT store PR diffs or descriptions — we have no right to retain customer code

---

## When to escalate to Darrington

- GitHub Marketplace listing requires human approval
- A customer reports a data privacy concern
- Monthly Anthropic API bill exceeds $50
- A security vulnerability is reported (create a private advisory, then ping)
- Any change to payment processing or billing terms
