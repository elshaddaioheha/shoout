# GitHub Actions Setup Guide (Flutterwave Only)

## Prerequisites

You need:
1. GitHub repository access (admin)
2. Firebase projects (dev + prod)
3. Firebase CLI authentication
4. Flutterwave account access
5. Slack workspace (optional, for notifications)

---

## Step 1: Get Firebase Token

This token allows GitHub Actions to deploy to your Firebase projects.

```bash
# Login to Firebase CLI
firebase login:ci

# This will open a browser and return a long token
# Save this token - you'll need it for both dev and prod
```

**Result:** You'll get something like: `1234567890abcdef...`

---

## Step 2: Configure GitHub Repository Secrets

**Go to:** GitHub Repo → Settings → Secrets and variables → Actions

### Click "New repository secret" and add these:

#### Development Environment Secrets

| Secret Name | Value | Where to Get |
|-------------|-------|--------------|
| `FIREBASE_TOKEN_DEV` | [Token from Step 1] | `firebase login:ci` output |
| `FLUTTERWAVE_SECRET_HASH_DEV` | Your Flutterwave test webhook secret | Flutterwave Dashboard → Settings → Webhooks |
| `MUX_TOKEN_ID_DEV` | Your Mux API test token ID | Mux Dashboard → Access Control → API Access Tokens |
| `MUX_TOKEN_SECRET_DEV` | Your Mux API test token secret | Mux Dashboard → Access Control → API Access Tokens |

#### Production Environment Secrets

| Secret Name | Value | Where to Get |
|-------------|-------|--------------|
| `FIREBASE_TOKEN_PROD` | [Token from Step 1] | `firebase login:ci` output |
| `FLUTTERWAVE_SECRET_HASH_PROD` | Your Flutterwave **LIVE** webhook secret | Flutterwave Dashboard → Settings → Webhooks (Live mode) |
| `MUX_TOKEN_ID_PROD` | Your Mux API production token ID | Mux Dashboard → Access Control → API Access Tokens (Production) |
| `MUX_TOKEN_SECRET_PROD` | Your Mux API production token secret | Mux Dashboard → Access Control → API Access Tokens (Production) |

#### Notifications (Optional)

| Secret Name | Value | Where to Get |
|-------------|-------|--------------|
| `SLACK_WEBHOOK_URL` | Your Slack incoming webhook URL | Slack Workspace → Apps → Incoming Webhooks |

---

## Step 3: Get Flutterwave Webhook Secret

1. Go to **Flutterwave Dashboard**
2. Click **Settings** → **Webhooks**
3. You'll see your **Secret Hash** for both test and live modes
4. Copy the test secret → Add as `FLUTTERWAVE_SECRET_HASH_DEV`
5. Copy the live secret (when ready) → Add as `FLUTTERWAVE_SECRET_HASH_PROD`

**Example:**
```
Development: sk_test_123abc456def...
Production:  sk_live_789ghi012jkl...
```

---

## Step 4: Get Mux API Credentials

1. Go to **Mux Dashboard** → **Settings** → **Access Control**
2. Click **Create API Access Token**
3. Select **Type:** All resources
4. Copy **Token ID** and **Token Secret**
5. Add to GitHub Secrets with `_DEV` suffix

**Repeat for production** (create separate production credentials)

---

## Step 5: Setup Slack Notifications (Optional)

1. Go to your **Slack Workspace**
2. Click **+** → **Browse Apps**
3. Search for **"Incoming Webhooks"**
4. Click **Add**
5. Choose a channel (e.g., #deployments)
6. Copy the **Webhook URL**
7. Add to GitHub Secrets as `SLACK_WEBHOOK_URL`

**Example:**
```
https://hooks.slack.com/services/[YOUR_WORKSPACE_ID]/[YOUR_CHANNEL_ID]/[YOUR_TOKEN]
```

---

## Step 6: Configure Firebase Projects

### Verify .firebaserc exists in repo root

```json
{
  "projects": {
    "dev": "shoouts-dev-xxxxx",
    "prod": "shoouts-prod-yyyyy"
  },
  "default": "dev"
}
```

If missing, create it:

```bash
firebase init
# Select dev and prod projects when prompted
```

---

## Step 7: Deploy GitHub Actions Workflow

```bash
cd c:\Users\HP\Desktop\Shoouts\shoout

# Verify workflow file exists
git status | findstr ".github"

# Stage and commit
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions CI/CD pipeline (Flutterwave)"

# Push to repository
git push origin main
```

---

## Step 8: Verify Setup

1. Go to **GitHub Repo** → **Actions** tab
2. You should see **"CI/CD Pipeline"** workflow
3. Watch for it to run automatically on next push

---

## How It Works

### When you push to `dev` branch:
```
your code → lint check → tests → security scan → auto-deploy to dev
```

**No approval required** - automatic deployment.

### When you push to `main` branch:
```
your code → lint check → tests → security scan → await approval
→ admin approves in GitHub UI → deploy to prod
```

**Requires manual approval** from team member with admin access.

---

## Testing the Workflow

### Test development deploy:

```bash
# Make a small change
echo "# Test" >> README.md

# Push to dev
git add README.md
git commit -m "Test CI/CD workflow"
git push origin dev

# Watch GitHub Actions tab for deployment
```

### Test production (requires approval):

```bash
# Merge dev into main
git checkout main
git pull origin dev
git push origin main

# Go to GitHub Actions tab
# Click "Review deployments"
# Approve the production deployment
# Watch deployment proceed
```

---

## Troubleshooting

### ❌ Deployment failed: "Firebase project not found"

**Fix:**
```bash
# Verify projects in .firebaserc match your actual Firebase projects
firebase projects:list

# Update .firebaserc if needed
firebase init
```

### ❌ "Permission denied: Secret not set"

**Fix:**
```
GitHub Repo → Settings → Secrets → Verify all required secrets are added
Make sure secret names match exactly (case-sensitive)
```

### ❌ "Flutterwave webhook verification failed"

**Fix:**
```
1. Verify FLUTTERWAVE_SECRET_HASH in GitHub Secrets matches Flutterwave Dashboard
2. Check that webhook is version 2 (not v1)
3. Restart the workflow by pushing a new commit
```

### ❌ "TypeScript compilation failed"

**Fix:**
```bash
# Compile locally first
cd functions
npm run build

# Fix any errors shown
# Then commit and push
```

---

## Next Steps

1. ✅ Add all GitHub Secrets (follow Step 2)
2. ✅ Deploy workflow file (follow Step 7)
3. ✅ Test with dev branch push (follow Step 8)
4. ✅ Test with main branch push and approval
5. Monitor Slack notifications for deployment status

---

## GitHub Secrets Checklist

Copy-paste ready checklist:

```
□ FIREBASE_TOKEN_DEV
□ FIREBASE_TOKEN_PROD
□ FLUTTERWAVE_SECRET_HASH_DEV
□ FLUTTERWAVE_SECRET_HASH_PROD
□ MUX_TOKEN_ID_DEV
□ MUX_TOKEN_SECRET_DEV
□ MUX_TOKEN_ID_PROD
□ MUX_TOKEN_SECRET_PROD
□ SLACK_WEBHOOK_URL (optional)
```

---

## Quick Reference: Environment Variables

The workflow automatically injects these into Cloud Functions:

```typescript
// In functions, access like this:
const secret = process.env.FLUTTERWAVE_SECRET_HASH;
const muxToken = process.env.MUX_TOKEN_ID;
```

Environment variables are set per-branch:
- **dev** branch → uses DEV secrets
- **main** branch → uses PROD secrets

This prevents accidental production data mutations from dev branch.

---

**Status:** Ready to deploy! Push workflow file and configure GitHub Secrets.
