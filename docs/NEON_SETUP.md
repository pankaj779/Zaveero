# Neon PostgreSQL — Step 2 walkthrough

Do this in your browser, then validate locally before Render (Step 3).

---

## 2.1 Sign up

1. Open **[https://neon.tech](https://neon.tech)** → **Sign up** (GitHub login is fastest).
2. Confirm email if prompted.

---

## 2.2 Create project

1. Click **New Project**.
2. **Name:** `zaavero-prod`
3. **Region:** pick closest to you (e.g. `AWS US East (Ohio)` or `Asia Pacific`).
4. **Postgres version:** default (16) is fine.
5. Click **Create project**.

Neon creates a default database (often named `neondb`). You will add/rename databases next.

---

## 2.3 Create two databases

1. In the Neon console, open your project → **Databases** (or **SQL Editor**).
2. Run this SQL (one statement at a time if needed):

```sql
CREATE DATABASE zaavero;
CREATE DATABASE datawhisper;
```

If `zaavero` already exists or Neon only allows one DB on free tier, use:

- Database **`neondb`** or **`zaavero`** for Zaavero platform
- Database **`datawhisper`** for DataWhisper

You need **two separate database names** in connection strings.

---

## 2.4 Copy pooled connection strings

For **each** database (`zaavero` and `datawhisper`):

1. Neon console → **Dashboard** → **Connect**.
2. **Branch:** `main` (default).
3. **Database:** select `zaavero` (then repeat for `datawhisper`).
4. **Connection pooling:** turn **ON** (Pooled).
5. Copy the connection string. It should look like:

```
postgresql://neondb_owner:xxxxxxxx@ep-cool-name-12345678.us-east-2.aws.neon.tech/zaavero?sslmode=require
```

Important:

- Use **Pooled** strings (host often contains `-pooler`).
- Keep `?sslmode=require` at the end.
- Replace `/zaavero` vs `/datawhisper` in the path for each DB.

---

## 2.5 Save secrets locally (do not commit)

```powershell
cd C:\Users\Pankaj_Kumar\My_documents\Applications
copy deploy\neon.secrets.env.example deploy\neon.secrets.env
notepad deploy\neon.secrets.env
```

Paste your two URLs into:

- `ZAAVERO_DATABASE_URL=...`
- `DATAWHISPER_DATABASE_URL=...`

Generate JWT secrets (run 3 times, save outputs):

```powershell
.\scripts\generate-jwt-secret.ps1
```

Add to `deploy/neon.secrets.env`:

- `ZAAVERO_JWT_SECRET=...`
- `AGENTOPS_JWT_SECRET=...`
- `DATAWHISPER_JWT_SECRET=...`

---

## 2.6 Validate connections

```powershell
.\scripts\test-neon-url.ps1
```

This will:

- Push Zaavero Prisma schema to Neon
- Seed product catalog (AgentOps + DataWhisper launch URLs)
- Push DataWhisper schema to Neon

If both show `[OK]`, Step 2 is complete.

---

## 2.7 What to save for Render (Step 3)

| Render service | Environment variable | Value from |
|----------------|---------------------|------------|
| **zaavero-api** | `DATABASE_URL` | `ZAAVERO_DATABASE_URL` |
| **zaavero-api** | `JWT_SECRET` | `ZAAVERO_JWT_SECRET` |
| **datawhisper-api** | `DATABASE_URL` | `DATAWHISPER_DATABASE_URL` |
| **datawhisper-api** | `MIGRATION_DATABASE_URL` | same as `DATABASE_URL` |
| **datawhisper-api** | `JWT_SECRET` | `DATAWHISPER_JWT_SECRET` |
| **agentops-api** | `JWT_SECRET` | `AGENTOPS_JWT_SECRET` |

AgentOps does **not** use Neon (SQLite on Render for now).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Can't reach database server` | Check URL, pooling ON, `sslmode=require` |
| `database does not exist` | Run `CREATE DATABASE` in SQL Editor |
| Prisma errors on DataWhisper | `cd DataWhisper\backend` → `pip install -r requirements.txt` → `prisma generate` |
| Free tier one DB limit | Use one Neon project with two DBs, or two branches |

Next: **Step 3 — Render** (`Zaavero/docs/DEPLOYMENT.md`).
