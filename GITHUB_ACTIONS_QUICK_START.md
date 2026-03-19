# GitHub Actions: Quick Setup Checklist

## ✅ What's Done

- [x] GitHub Actions workflow created (`.github/workflows/deploy.yml`)
- [x] Workflow pushed to your repository
- [x] TypeScript compiles cleanly
- [x] Skipped Stripe for now (focusing on Flutterwave)

---

## 🚀 What You Need to Do (Next 15 minutes)

### Step 1: Generate Firebase Token (2 min)

```powershell
firebase login:ci
```

This will open a browser window. Log in and copy the token shown.

**You'll get something like:** `1234567890abcdefghijk...`

### Step 2: Add GitHub Secrets (10 min)

Go to: **GitHub Repo → Settings → Secrets and variables → Actions**

Click **"New repository secret"** and add these (copy-paste ready):

#### Development Secrets

| Name | Value |
|------|-------|
| `FIREBASE_TOKEN_DEV` | Token from Step 1 |
| `FLUTTERWAVE_SECRET_HASH_DEV` | From Flutterwave Dashboard → Settings → Webhooks (TEST mode) |
| `MUX_TOKEN_ID_DEV` | From Mux Dashboard → Access Control → API Access Tokens |
| `MUX_TOKEN_SECRET_DEV` | From Mux Dashboard → Access Control → API Access Tokens |

#### Production Secrets

| Name | Value |
|------|-------|
| `FIREBASE_TOKEN_PROD` | Same token from Step 1 |
| `FLUTTERWAVE_SECRET_HASH_PROD` | From Flutterwave Dashboard → Settings → Webhooks (LIVE mode) |
| `MUX_TOKEN_ID_PROD` | From Mux Dashboard (Production credentials) |
| `MUX_TOKEN_SECRET_PROD` | From Mux Dashboard (Production credentials) |

#### Optional: Slack Notifications

| Name | Value |
|------|-------|
| `SLACK_WEBHOOK_URL` | From your Slack workspace (Incoming Webhooks) |

### Step 3: Verify Workflow Runs (3 min)

1. Go to **GitHub Repo → Actions** tab
2. You should see "CI/CD Pipeline" listed
3. Make any small change and push:
   ```powershell
   echo "# Test" >> README.md
   git add README.md
   git commit -m "Test CI/CD"
   git push origin master
   ```
4. Watch the Actions tab - workflow should run (lint → test → security → deploy-dev)

---

## 🎯 How It Works

### Dev Branch (Automatic Deploy)
```
git push origin dev
→ Lint + Test + Security checks
→ Auto-deploy to Firebase dev
```

### Main Branch (Approval Required)
```
git push origin main
→ Lint + Test + Security checks
→ Awaits manual approval in GitHub UI
→ Admin approves → Auto-deploy to Firebase prod
```

---

## 📋 Where to Get Secrets

### Flutterwave Secret Hash
1. Go to **Flutterwave Dashboard**
2. Click **Settings → Webhooks**
3. Copy the **Secret Hash** shown

### Mux API Credentials
1. Go to **Mux Dashboard**
2. Click **Settings → Access Control**
3. Create/View API Access Tokens
4. Copy **Token ID** and **Token Secret**

### Slack Webhook (Optional)
1. Go to your **Slack Workspace**
2. Search for **"Incoming Webhooks"** in Apps
3. Add to a channel
4. Copy the **Webhook URL**

---

## ❓ FAQ

**Q: Do I need Stripe set up?**  
A: Not yet. GitHub Actions is configured for Flutterwave only. Stripe integration can be added later.

**Q: Can I skip Slack notifications?**  
A: Yes, just don't add `SLACK_WEBHOOK_URL`. The workflow will skip that step.

**Q: What happens if a secret is wrong?**  
A: The workflow will fail at that step. Check GitHub Actions logs to see the error.

**Q: Can I test the dev deployment?**  
A: Yes, push to `dev` branch and watch the workflow run in GitHub Actions.

---

## 🔗 Reference

- [GitHub Actions Docs](https://github.com/features/actions)
- [Firebase Deployment with GitHub Actions](https://firebase.google.com/docs/hosting/github-integration)
- [Full Setup Guide](./GITHUB_ACTIONS_SETUP.md)

---

**Status:** Ready to configure GitHub Secrets! ⏱️ ETA: 15 minutes
