# PR Autopilot

PR Autopilot is a GitHub App that automatically generates clear, structured pull request descriptions using AI. It helps engineering teams move faster by providing reviewers with instant context for every change.

## 🚀 Features

- **Auto-Generated Descriptions**: Turns raw diffs and PR metadata into high-quality Markdown descriptions.
- **Smart Detection**: Only generates descriptions for PRs that are empty or have minimal content.
- **Structured Output**: Follows a consistent format: What changed, Why, How to test, and Notes.
- **Editable**: Generated descriptions include a footer and are fully editable by developers.
- **Privacy First**: Code diffs are processed in-memory and never stored.

## 🛠️ How it Works

1. **Webhook**: GitHub sends a `pull_request` event to PR Autopilot.
2. **Analysis**: The app checks if the PR needs a description and fetches the file diffs.
3. **AI Generation**: Anthropic's Claude (3.5 Haiku) analyzes the changes and writes a draft.
4. **Update**: The app updates the PR body or posts a comment with the suggestion.

## 📋 Structure of Generated Descriptions

- **What changed**: Specific details about code modifications.
- **Why**: The inferred motivation behind the change.
- **How to test**: Actionable steps for reviewers to verify the PR.
- **Notes**: Important flags like security concerns or breaking changes.

## ⚙️ Setup

See [SETUP.md](./SETUP.md) for detailed instructions on creating your own instance of the GitHub App and deploying it to Vercel.

### Environment Variables

The following environment variables are required:

- `GITHUB_APP_ID`: Your GitHub App ID.
- `GITHUB_PRIVATE_KEY`: PEM-encoded private key.
- `GITHUB_WEBHOOK_SECRET`: Webhook secret set in GitHub App settings.
- `ANTHROPIC_API_KEY`: Your Anthropic API key for Claude.

## 🛡️ Legal

- [Privacy Policy](https://pr-autopilot.vercel.app/privacy)
- [Terms of Service](https://pr-autopilot.vercel.app/terms)

---
*📝 Built for developers who value their time.*
