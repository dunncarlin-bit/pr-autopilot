# 🚀 PR Autopilot — Your AI Writing Assistant for Pull Requests

**Stop writing PR descriptions. Start merging.**

PR Autopilot is a GitHub App that automatically writes clear, professional, and structured pull request descriptions. By analyzing your code changes (diffs), it provides instant context for reviewers, reducing friction and speeding up your development cycle.

---

## 🌟 Why PR Autopilot?

### For Developers 👨‍💻
*   **Save Time:** No more staring at a blank text box trying to remember everything you changed.
*   **Focus on Code:** Spend your energy solving problems, not documenting them.
*   **Professionalism:** Every PR looks polished and well-structured, regardless of how fast you're moving.

### For Reviewers 🔍
*   **Instant Context:** Understand the "what" and "why" of a PR before you even look at the code.
*   **Faster Reviews:** Clear descriptions highlight key changes, making it easier to spot potential issues.
*   **Consistent Format:** Every PR follows the same structure, making your review process predictable.

---

## ✨ Key Features

*   **🤖 AI-Powered Analysis:** Uses Claude 3.5 Haiku to deeply understand your code changes.
*   **🎯 Smart Activation:** Only steps in when you need it. If you've already written a description, it stays out of the way.
*   **📝 Structured Output:** Every generated description includes:
    *   **What changed:** A concise summary of code modifications.
    *   **Why:** The inferred purpose or motivation behind the changes.
    *   **How to test:** Actionable steps for reviewers to verify the work.
    *   **Notes:** Highlighting risks, breaking changes, or missing tests.
*   **✏️ Fully Editable:** The AI provides a draft directly in your PR body—you have the final word.
*   **🔒 Privacy-Focused:** We don't store your code. Diffs are processed in-memory and discarded immediately.

---

## 🛠️ How it Works

1.  **Event:** You open a new Pull Request on GitHub.
2.  **Detection:** PR Autopilot receives a notification and checks if the description is empty.
3.  **Analysis:** It securely fetches the file diffs and sends them to our AI engine.
4.  **Delivery:** Within seconds, a structured Markdown description is added to your PR.

---

## ⚙️ Quick Start & Setup

PR Autopilot can be installed on your own repositories or organization.

### Installation
1.  Visit the [PR Autopilot Installation Page](https://github.com/apps/pr-autopilot/installations/new).
2.  Select the repositories you want to enable.
3.  That's it! Open your next PR to see it in action.

### Self-Hosting (Optional)
If you prefer to run your own instance, follow the [SETUP.md](./SETUP.md) guide. You will need:
*   A GitHub App ID and Private Key.
*   An Anthropic API Key.
*   A Vercel account for deployment.

---

## 🛡️ Security & Privacy

*   **Minimal Permissions:** We only ask for the permissions needed to read PRs and write descriptions.
*   **No Code Retention:** Your source code is never stored on our servers.
*   **Verified Webhooks:** All communication from GitHub is verified using secure signatures.

---

## 📄 Legal & Support

*   [Privacy Policy](https://pr-autopilot.vercel.app/privacy)
*   [Terms of Service](https://pr-autopilot.vercel.app/terms)
*   **Need Help?** Contact us at [dunncarlin@gmail.com](mailto:dunncarlin@gmail.com)

---
*📝 Built for engineers who value their time and their team.*
