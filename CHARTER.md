# PR Autopilot — Business Charter

> **The Whats Portfolio · Business #2 · Launched 2026-05-09**

---

## What do we sell?

A GitHub App that automatically writes structured pull request descriptions using AI.

When a developer opens a PR with an empty or minimal description, PR Autopilot reads the diff and posts a clear, formatted description covering: what changed, why, how to test it, and any notable concerns.

**Free** for public repos. **$15/org/month** for private repos (up to 10 developers).

---

## Who do we serve?

**Primary:** Engineering teams at startups and scale-ups (5–50 devs) who:
- Move fast and often skip PR descriptions
- Have slow code review cycles because reviewers lack context
- Value code quality but don't have time to enforce PR standards manually

**Secondary:** Solo developers and open-source maintainers who want professional-looking PRs without the overhead.

**Indirect beneficiaries:** Code reviewers who get context without asking. Future engineers reading git history.

---

## What are their fears?

| Fear | What it looks like |
|------|-------------------|
| Context loss | "I merged this 3 months ago and have no idea why we made this change." |
| Slow reviews | "I have to read every line of the diff just to understand what this PR is even trying to do." |
| AI slop | "The generated description is generic garbage that doesn't reflect the actual change." |
| Losing control | "What if it overwrites my description?" |
| Security paranoia | "Is this thing reading my entire codebase?" |
| Vendor lock-in | "If I rely on this and it goes down, all our PRs are broken." |

**Counter-posture:**
- Detects existing descriptions → skips if meaningful content present (addresses "losing control")
- Only sees the diff GitHub sends → no repo access beyond the webhook payload (addresses "security paranoia")
- Descriptions are plain Markdown, fully editable (addresses "AI slop" risk — worst case, just delete it)
- If app goes down, PRs still open normally — just without the description (addresses "vendor lock-in")

---

## Revenue model

| Tier | Price | Scope |
|------|-------|-------|
| Free | $0 | Public repos, unlimited PRs |
| Team | $15/mo | Private repos, up to 10 devs |
| Org | $49/mo | Private repos, unlimited devs |

**Billing:** GitHub Marketplace (handles payments, reduces friction). Stripe as fallback.

**Path to $1K MRR:** 67 Team plan customers. GitHub Marketplace organic discovery is the primary channel — every repo that has the `pr-autopilot` label is a passive ad.

---

## Operating model (autonomous)

Jules (Gemini GitHub AI) handles:
- Reviewing and merging dependency PRs
- Responding to GitHub Issues (bug reports, feature requests)
- Monitoring webhook delivery failures in Vercel logs

Darrington handles (only):
- GitHub App creation and initial Vercel deploy (one-time, ~60 min)
- Anthropic API key billing
- GitHub Marketplace listing approval (Anthropic reviews apps)
- Revenue disbursement when MRR > $0

---

## Budget

| Item | Est. Cost |
|------|-----------|
| Vercel (hobby/free) | $0 |
| Anthropic API (Claude Haiku) | ~$0.003/PR · $3/1,000 PRs |
| Domain (pr-autopilot.com) | ~$12/yr |
| GitHub Marketplace listing | $0 |
| **Total bootstrap cost** | **< $25** |

Break-even: **1 Team customer** covers ~5,000 PRs/month at Haiku pricing. Highly profitable at any scale.

---

## Synergy with Business #1

Jules Bounty Network opens many PRs to external repos. Those PRs will auto-receive PR Autopilot descriptions — improving acceptance rate and demonstrating the product in the wild.

---

## Key risks

1. **GitHub changes the Marketplace terms** → mitigate by also selling direct via Stripe
2. **AI description quality is poor** → already addressed by `shouldGenerate()` skip logic + editable output
3. **OpenAI or GitHub ships a native version** → GitHub Copilot is moving this direction; first-mover + Marketplace presence matters
4. **Low conversion free→paid** → public repo installs are marketing; focus on orgs with private repos
