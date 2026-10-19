#!/usr/bin/env bash
# One-time VPS setup for Kwings Accounts. Safe to re-run: existing files are kept.
#   curl -fsSL https://raw.githubusercontent.com/Rukshan2000/kwings-accounts/main/deploy/server-setup.sh -o setup.sh
#   sudo bash setup.sh
# Does: Docker check, runner user, /opt/kwings-accounts/.env with generated secrets,
#       Nginx site + Let's Encrypt SSL, GitHub Actions self-hosted runner as a service.
set -euo pipefail

DOMAIN=accounts.kwingsmedia.com
REPO_URL=https://github.com/Rukshan2000/kwings-accounts
APP_DIR=/opt/kwings-accounts
RUNNER_USER=gh-runner
RUNNER_DIR=/home/$RUNNER_USER/actions-runner
WEB_PORT=3020
API_PORT=4020

say() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
[[ $EUID -eq 0 ]] || { echo "Run with sudo: sudo bash $0"; exit 1; }

say "Checking Docker"
if ! command -v docker >/dev/null; then
  echo "Docker not found, installing (official script)..."
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null

say "Creating runner user '$RUNNER_USER'"
id "$RUNNER_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$RUNNER_USER"
usermod -aG docker "$RUNNER_USER"

say "Preparing $APP_DIR"
mkdir -p "$APP_DIR"
if [[ ! -f $APP_DIR/.env ]]; then
  # Answers can be passed as env vars (ADMIN_EMAIL, ADMIN_PASSWORD, RUNNER_TOKEN) to skip the prompts.
  [[ -n ${ADMIN_EMAIL:-} ]] || read -rp "Admin login email: " ADMIN_EMAIL
  while true; do
    [[ -n ${ADMIN_PASSWORD:-} ]] || \
    read -rsp "Admin password (min 8 chars): " ADMIN_PASSWORD; echo
    [[ ${#ADMIN_PASSWORD} -ge 8 && $ADMIN_PASSWORD != *"'"* ]] && break
    echo "Use at least 8 characters, without the ' character."
    ADMIN_PASSWORD=
  done
  cat >"$APP_DIR/.env" <<EOF
POSTGRES_DB=kwings_accounts
POSTGRES_USER=kwings_owner
POSTGRES_PASSWORD=$(openssl rand -hex 24)
APP_DB_USERNAME=kwings_app
APP_DB_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_NAME=Administrator
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD='$ADMIN_PASSWORD'
API_HOST_PORT=$API_PORT
WEB_HOST_PORT=$WEB_PORT
EOF
  echo "Created $APP_DIR/.env with generated database and JWT secrets."
else
  echo "$APP_DIR/.env already exists, keeping it."
  ADMIN_EMAIL=$(grep '^ADMIN_EMAIL=' "$APP_DIR/.env" | cut -d= -f2)
fi
chown -R "$RUNNER_USER:$RUNNER_USER" "$APP_DIR"
chmod 600 "$APP_DIR/.env"

say "Configuring Nginx for $DOMAIN"
if ! command -v nginx >/dev/null; then apt-get update -y && apt-get install -y nginx; fi
if [[ -d /etc/nginx/sites-available ]]; then
  SITE=/etc/nginx/sites-available/$DOMAIN.conf
  LINK=/etc/nginx/sites-enabled/$DOMAIN.conf
else
  SITE=/etc/nginx/conf.d/$DOMAIN.conf
  LINK=
fi
if [[ ! -f $SITE ]]; then
  # HTTP only; Certbot adds HTTPS + redirect below. Other sites are not touched.
  cat >"$SITE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    client_max_body_size 1m;

    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_connect_timeout 10s;
    proxy_read_timeout 60s;

    location /api/ { proxy_pass http://127.0.0.1:$API_PORT; }
    location /     { proxy_pass http://127.0.0.1:$WEB_PORT; }
}
EOF
  [[ -n $LINK ]] && ln -sf "$SITE" "$LINK"
else
  echo "$SITE already exists, keeping it."
fi
nginx -t
systemctl reload nginx

say "SSL certificate (DNS A record for $DOMAIN must already point to this server)"
if [[ -d /etc/letsencrypt/live/$DOMAIN ]]; then
  echo "Certificate already exists."
else
  if ! command -v certbot >/dev/null; then apt-get install -y certbot python3-certbot-nginx; fi
  if certbot --nginx -d "$DOMAIN" --redirect --agree-tos -m "$ADMIN_EMAIL" --non-interactive; then
    echo "HTTPS enabled."
  else
    echo "Certbot failed (usually DNS not pointing here yet). Fix DNS, then run:"
    echo "  sudo certbot --nginx -d $DOMAIN --redirect"
  fi
fi

say "GitHub Actions runner"
if [[ -f $RUNNER_DIR/.runner ]]; then
  echo "Runner already configured."
else
  echo "Open: $REPO_URL/settings/actions/runners/new"
  echo "Copy ONLY the token from the './config.sh ... --token XXXX' line."
  [[ -n ${RUNNER_TOKEN:-} ]] || read -rp "Runner token: " RUNNER_TOKEN
  case "$(uname -m)" in x86_64) ARCH=x64 ;; aarch64 | arm64) ARCH=arm64 ;; *) echo "Unsupported CPU"; exit 1 ;; esac
  VERSION=$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | grep -oP '"tag_name": "v\K[^"]+')
  sudo -u "$RUNNER_USER" mkdir -p "$RUNNER_DIR"
  curl -fsSL "https://github.com/actions/runner/releases/download/v$VERSION/actions-runner-linux-$ARCH-$VERSION.tar.gz" |
    sudo -u "$RUNNER_USER" tar xz -C "$RUNNER_DIR"
  "$RUNNER_DIR/bin/installdependencies.sh" >/dev/null
  sudo -u "$RUNNER_USER" bash -c "cd $RUNNER_DIR && ./config.sh --url $REPO_URL --token $RUNNER_TOKEN \
    --name $(hostname)-kwings --labels kwings-prod --unattended --replace"
  (cd "$RUNNER_DIR" && ./svc.sh install "$RUNNER_USER" && ./svc.sh start)
fi

say "Done"
cat <<EOF
Server is ready. To deploy, push to the production branch:
  git checkout production && git merge main && git push && git checkout main
Then open https://$DOMAIN and log in as $ADMIN_EMAIL.
EOF
