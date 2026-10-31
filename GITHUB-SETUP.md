# Connect this project to GitHub

GitHub is where the code lives so that **Render can deploy it** and so the **free `is-a.dev` domain** can be claimed. You only do this once.

There is no in-app GitHub button here, so pick whichever route suits you. **Route B is the easiest if you have never used git.**

---

## Before you start: what must NEVER be uploaded

The repo already contains a `.gitignore` that blocks all of these. If you upload manually, check by hand:

| File | Why it must stay private |
|---|---|
| `database.sqlite` | Contains every user's password hash and all live records |
| `.env` | Will hold your `JWT_SECRET`, `ADMIN_PASSWORD`, Turso token |
| `node_modules/` | 250 packages, ~200 MB — Render installs these itself |

Your download package (`india-career-hub.zip`, 327 KB, 70 files) is already safe — it excludes all three.

---

## Route A — Browser upload (no terminal, no git knowledge)

**1. Create the repository**
1. Go to <https://github.com> and sign in (create a free account if needed).
2. Click the **+** in the top-right → **New repository**.
3. Repository name: `india-student-career-hub`
4. Visibility: **Public** (free deploy on Render; Private also works)
5. **Do not** tick "Add a README" — you already have files.
6. Click **Create repository**.

**2. Upload the files**
1. On the empty repo page click **uploading an existing file**.
2. Download `india-career-hub.zip` from this workspace, unzip it on your computer.
3. Open the `student-career-portal` folder, select **everything inside it** (not the folder itself).
4. Drag them into the browser window.
5. In the commit box type: `Initial commit` → click **Commit changes**.

> GitHub's web uploader ignores folders starting with a dot, so **`.gitignore` and `.env.example` may not upload**. That is not fatal — but fix `.gitignore` afterwards (step 3) or your database could become public later.

**3. Restore `.gitignore`**
1. In the repo click **Add file** → **Create new file**.
2. Name it exactly `.gitignore`
3. Paste the contents of `.gitignore` from this workspace.
4. Commit.

---

## Route B — Command line from this workspace (fastest, keeps history)

The repo here is already initialised and has one clean commit (`36a45f1`, 61 files).

**1. Create an empty repo on GitHub** (as in Route A step 1 — no README).

**2. Create a token**
1. GitHub → your avatar → **Settings** → **Developer settings** (bottom of left sidebar)
2. **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
3. Name: `career-hub-deploy`
4. Expiration: 90 days
5. Repository access: **Only select repositories** → `india-student-career-hub`
6. Permissions → Repository permissions → **Contents: Read and write**
7. **Generate token** and copy it (starts with `github_pat_...`). It is shown once.

**3. Push**
Run this in the project folder. Replace `YOURNAME`:

```bash
cd student-career-portal

git remote add origin https://github.com/YOURNAME/india-student-career-hub.git
git branch -M main
git push -u origin main
```

When prompted:
- Username: your GitHub username
- Password: **paste the token** (not your account password — GitHub removed password auth in 2021)

**4. Delete the token** when the push succeeds — see the security note below.

---

## Route C — GitHub Desktop (visual, no commands)

1. Install <https://desktop.github.com>
2. **File → Add local repository** → choose the `student-career-portal` folder
3. **Publish repository** → untick "Keep this code private" only if you want it public
4. It pushes the existing commit for you

---

## Security note about tokens

A token is a password to your GitHub account. Never paste it into a chat, a file in the repo, or a screenshot. If you push from a shared or temporary machine (like this workspace), **revoke it immediately afterwards**:

> Settings → Developer settings → Personal access tokens → click the token → **Delete**

The token is only needed for that one push. After that, Render connects to your repo using its own GitHub App authorisation, not your token.

---

## After it is on GitHub

| Next step | Where |
|---|---|
| Deploy free on Render | `FREE-STACK.md` → Route B |
| Free database (data must survive restarts) | <https://turso.tech> → free tier, no card |
| Free domain `india-career-hub.is-a.dev` | `domains/india-career-hub.json` → fill in your username, open a PR at <https://github.com/is-a-dev/register> |

**Render will refuse to start** — on purpose — until you set `ADMIN_PASSWORD` (12+ characters, not `admin123`) and `JWT_SECRET`. That guard exists so the published demo password can never become your live admin password.

---

## Verify your upload was clean

Open your repo and confirm:

- [ ] No `database.sqlite` in the file list
- [ ] No `.env` in the file list
- [ ] No `node_modules/` folder
- [ ] `.gitignore` is present
- [ ] `server.js`, `package.json`, `public/` are present

If `database.sqlite` did get uploaded, **delete it from GitHub and rotate every user password** — the file contains bcrypt hashes.
