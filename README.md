# Kwings Accounts

Simple internal financial management for Kwings Media: income, expenses, accounts, transfers, projects, investments, ROI and reports. Production: **https://accounts.kwingsmedia.com**

- **Web:** Next.js (App Router) · TypeScript · Tailwind CSS · Lucide
- **API:** Express 5 · TypeScript · Zod · Knex
- **DB:** PostgreSQL 16 · Knex migrations and seeds · `NUMERIC(18,2)` money · currency LKR
- **Auth:** single admin · JWT in an HTTP-only `SameSite=Strict` cookie · double-submit CSRF token · bcrypt

```
apps/api        Express REST API (routes, services/finance.ts, middleware, validators)
apps/web        Next.js frontend
packages/db     knexfile, migrations, seeds, scripts/db.ts (migrate | rollback | seed)
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
npm run migrate && npm run seed   # seed adds categories + the ADMIN_* user
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

### Quick setup (do once)

1. **DNS:** at your domain provider, add an `A` record: name `accounts`, value = your VPS IP address.
2. **On the VPS**, run these two commands. They ask for an admin email, an admin password and a runner token.
   ```bash
   curl -fsSL https://raw.githubusercontent.com/Rukshan2000/kwings-accounts/main/deploy/server-setup.sh -o setup.sh
   sudo bash setup.sh
   ```
   When it asks for the **runner token**, open
   <https://github.com/Rukshan2000/kwings-accounts/settings/actions/runners/new>
   and copy only the token from the `./config.sh ... --token XXXXX` line.
   The script ([deploy/server-setup.sh](deploy/server-setup.sh)):
   - generates all secrets into `/opt/kwings-accounts/.env`
   - adds the Nginx site and SSL certificate without touching other sites
   - installs the GitHub Actions runner, so GitHub never needs SSH access
3. **Make the GitHub repo private:** Settings → General → Change visibility. Do this after step 2, because step 2 downloads the script from the public repo.
4. **Deploy:**
   ```bash
   git checkout production && git merge main && git push && git checkout main
   ```

To redeploy later, repeat step 4. The full manual Nginx config is in [deploy/nginx/](deploy/nginx/) for reference.

### How the pipeline works (`.github/workflows/deploy.yml`)

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

Users are managed in **Settings → Users**: add more logins, edit them, reset passwords. The seed creates the first user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` only if that email doesn't exist yet. It never overwrites a password.
