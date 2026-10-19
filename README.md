# Kwings Accounts

Simple internal financial management for Kwings Media: income, expenses, accounts, transfers, projects, investments, ROI and reports. Production: **https://accounts.kwingsmedia.com**

- **Web:** Next.js (App Router) · TypeScript · Tailwind CSS · Lucide
- **API:** Express 5 · TypeScript · Zod · Knex
- **DB:** PostgreSQL 16 · Knex migrations and seeds · `NUMERIC(18,2)` money · currency LKR
- **Auth:** single admin · JWT in an HTTP-only `SameSite=Strict` cookie · double-submit CSRF token · bcrypt

```
apps/api        Express REST API (routes, services/finance.ts, middleware, validators)
apps/web        Next.js frontend
packages/db     knexfile, migrations, seeds, scripts/db.ts (migrate | rollback | seed | create-admin)
deploy/         deploy.sh (VPS) and the Nginx site config
```

## Financial rules

All money math lives in `apps/api/src/services/finance.ts`. Sums run in PostgreSQL `NUMERIC`, derived values use `decimal.js`, and no floats are ever used.

| Figure          | Formula                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------- |
| Account balance | opening + income − expenses + transfers in − transfers out − investments funded              |
| Net profit      | income − expenses (transfers and investments excluded)                                       |
| Project ROI     | project profit ÷ project expenses × 100 (N/A when expenses are 0)                            |
| Investment ROI  | (linked income − linked expenses − investment) ÷ investment × 100 (N/A when investment is 0) |

- Investments are capital allocations. They reduce the funding account's balance but are never counted as expenses, so investment cost is subtracted only once.
- Transfers are idempotent: the client sends an `idempotencyKey` and a repeated request returns the original transfer.
- Date filters always use the transaction, transfer or investment date, never `created_at`.
- Accounts, categories and projects that have records can't be deleted (archive the account instead). Foreign keys use `RESTRICT` as a backstop.

## Local development

Requires Node 22 and PostgreSQL 16.

```bash
cp .env.example .env          # set DB_*, TEST_DB_DATABASE, JWT_SECRET, ADMIN_*
npm install
npm run migrate && npm run seed && npm run create-admin
npm run dev                   # API :4000, web http://localhost:3000 (proxies /api → API)
```

Checks (the same ones CI runs):

```bash
npm run format:check && npm run lint && npm run typecheck
npm test                      # uses TEST_DB_DATABASE; refuses names without "test" (tables are truncated)
npm run build
```

### Docker (everything in containers)

```bash
docker compose up -d --build  # http://localhost:3000, admin@kwingsmedia.com / ChangeMe123!
```

Postgres isn't published, and the API and web ports bind to `127.0.0.1` only. The local defaults in `docker-compose.yml` can be overridden with `LOCAL_*` env vars.

## Production

### 1. One-time VPS setup

1. **DNS:** add an `A` record `accounts` → the VPS IPv4 address (and an `AAAA` record if you use IPv6).
2. **App directory:**
   ```bash
   sudo mkdir -p /opt/kwings-accounts && sudo chown $USER /opt/kwings-accounts
   cp .env.example /opt/kwings-accounts/.env   # fill in the "Production" block; chmod 600
   ```
   Generate secrets with `openssl rand -hex 32`. `POSTGRES_USER` owns the schema and runs migrations. `APP_DB_USERNAME` is the non-superuser runtime role, created automatically on the first Postgres start.
3. **Nginx:** this adds a new site and doesn't touch existing ones.
   ```bash
   sudo cp deploy/nginx/accounts.kwingsmedia.com.conf /etc/nginx/sites-available/
   # First run only: comment out the 443 server block (no certificate yet), then:
   sudo ln -s /etc/nginx/sites-available/accounts.kwingsmedia.com.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
4. **SSL:**
   ```bash
   sudo certbot certonly --webroot -w /var/www/html -d accounts.kwingsmedia.com
   # re-enable the 443 block, then:
   sudo nginx -t && sudo systemctl reload nginx
   ```
   Certbot's systemd timer handles renewal. Check it with `sudo certbot renew --dry-run`.
5. **Self-hosted runner** (no inbound SSH from GitHub: the runner connects out to GitHub). Run as a non-root user with Docker access:
   ```bash
   sudo useradd -m -s /bin/bash -G docker gh-runner && sudo chown gh-runner /opt/kwings-accounts
   sudo -iu gh-runner
   mkdir actions-runner && cd actions-runner
   # Download + configure using the commands shown at:
   #   GitHub repo → Settings → Actions → Runners → New self-hosted runner → Linux x64
   ./config.sh --url https://github.com/Rukshan2000/kwings-accounts --token <TOKEN> --labels kwings-prod --unattended
   exit
   cd /home/gh-runner/actions-runner && sudo ./svc.sh install gh-runner && sudo ./svc.sh start
   ```
   Keep the repository **private**. On a public repo, a fork pull request could run code on this runner.

### 2. GitHub configuration

No deploy secrets are needed. GHCR uses the built-in `GITHUB_TOKEN`. Create a `production` environment (adding required reviewers is optional).

### 3. Branches and pipeline (`.github/workflows/deploy.yml`)

- `main`: development. Pull requests and pushes run CI only. CI covers format, lint, typecheck, migrations, rollback and reapply, tests and the build, against a Postgres 16 service.
- `production`: CI, then build images tagged with the commit SHA (`ghcr.io/rukshan2000/kwings-accounts-{api,web}:<sha>`), push them, then deploy on the VPS via the self-hosted runner.

The deploy runs `deploy.sh deploy <sha>` on the server:

1. Pull images.
2. Run migrations as a one-off container. If this fails, the old version keeps serving.
3. Switch the `api` and `web` containers.
4. Run health checks. If they fail, it automatically rolls back to the previous tag.
5. Run the smoke tests against `/api/health` and `/login`.

Deployments never overlap (concurrency group `production-deploy`). Volumes are never removed.

Migrations must stay backward compatible: add columns and tables freely, and only drop or rename them in a later release once no deployed image uses them. That keeps image rollback safe.

### Operations

```bash
cd /opt/kwings-accounts
./deploy.sh status
./deploy.sh rollback               # previous tag
./deploy.sh rollback <sha>         # specific tag
IMAGE_TAG=$(tail -1 .deploy-history) docker compose -f docker-compose.prod.yml logs -f api
# Backup:
docker compose -f docker-compose.prod.yml exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup-$(date +%F).sql
```

The admin password can be changed in **Settings**. `create-admin` only creates the admin when that email doesn't exist yet. It never overwrites an existing password.
