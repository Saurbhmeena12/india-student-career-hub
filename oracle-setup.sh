#!/usr/bin/env bash
# =============================================================================
# Oracle Cloud "Always Free" VM setup — the only option that is free forever,
# always-on, and keeps a real SQLite file on disk.
#
# Free forever (verified Oct 2026): 2 AMD VMs or up to 4 ARM Ampere cores
# (24 GB RAM total), 200 GB block storage, 10 TB egress/month. No expiry.
# Card is required only for identity verification, not charged.
#
# Usage (run on a fresh Ubuntu 22.04/24.04 VM as the default user):
#   sudo bash oracle-setup.sh your-domain.is-a.dev
# =============================================================================
set -euo pipefail

DOMAIN="${1:-}"
APP_DIR="/opt/india-career-hub"
REPO="${REPO_URL:-}"          # optional: git URL to clone
NODE_MAJOR=20

echo "==> 1/8 System packages"
sudo apt-get update -y
sudo apt-get install -y curl git ufw nginx ca-certificates build-essential python3

echo "==> 2/8 Node.js ${NODE_MAJOR}"
if ! command -v node >/dev/null || [ "$(node -v | cut -c2- | cut -d. -f1)" -lt "$NODE_MAJOR" ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node -v && npm -v

echo "==> 3/8 Firewall (allow SSH + HTTP + HTTPS only)"
sudo ufw allow OpenSSH || true
sudo ufw allow 'Nginx Full' || true
sudo ufw --force enable || true

echo "==> 4/8 Application files"
if [ -n "$REPO" ]; then
  sudo mkdir -p "$APP_DIR"
  sudo chown "$USER":"$USER" "$APP_DIR"
  git clone "$REPO" "$APP_DIR"
else
  echo "    No REPO_URL set — copying current directory to $APP_DIR"
  sudo mkdir -p "$APP_DIR"
  sudo cp -r ./ "$APP_DIR"/
  sudo chown -R "$USER":"$USER" "$APP_DIR"
fi
cd "$APP_DIR"
npm install --omit=dev

if [ ! -f .env ]; then
  SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  cat > .env <<ENV
PORT=3000
JWT_SECRET=$SECRET
SQLITE_FILE=$APP_DIR/database.sqlite
# Optional free AI key from https://aistudio.google.com/apikey
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
AI_DAILY_LIMIT=400
AI_RPM_LIMIT=8
ENV
  echo "    .env created with a random JWT secret"
fi

echo "==> 5/8 Process manager (pm2, free, keeps app alive + restarts on reboot)"
sudo npm install -g pm2
pm2 delete india-career-hub 2>/dev/null || true
pm2 start server.js --name india-career-hub --time
pm2 save
sudo env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$USER" --hp "$HOME" | tail -2 || true

echo "==> 6/8 Nginx reverse proxy"
sudo tee /etc/nginx/sites-available/india-career-hub >/dev/null <<NGINX
server {
    listen 80;
    server_name ${DOMAIN:-_};

    client_max_body_size 12M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX
sudo ln -sf /etc/nginx/sites-available/india-career-hub /etc/nginx/sites-enabled/india-career-hub
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo "==> 7/8 Free HTTPS (Let's Encrypt) + weekly automatic backups"
if [ -n "$DOMAIN" ]; then
  sudo apt-get install -y certbot python3-certbot-nginx
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@${DOMAIN}" --redirect || \
    echo "    Certbot needs DNS pointing at this VM first — run again once DNS is live."
fi

# Weekly JSON backup of the whole database (free, stored locally + rotate 8)
mkdir -p "$APP_DIR/backups"
cat > "$APP_DIR/backup.sh" <<'BACKUP'
#!/usr/bin/env bash
cd "$(dirname "$0")"
STAMP=$(date +%F-%H%M)
node -e "
const db=require('./db');
const tables=['schemes','jobs','scholarships','courses','training','internships','apprenticeships','entrance_exams','govt_portals','updates','career_chart','users'];
const out={};
let done=0;
tables.forEach(t=>db.all('SELECT * FROM '+t,[],(e,r)=>{out[t]=r||[];if(++done===tables.length){
  require('fs').writeFileSync('backups/backup-'+process.env.STAMP+'.json',JSON.stringify(out,null,2));
  console.log('backup written');process.exit(0);}}));
" STAMP="$STAMP"
find backups -name 'backup-*.json' -mtime +56 -delete
BACKUP
chmod +x "$APP_DIR/backup.sh"
( crontab -l 2>/dev/null | grep -v backup.sh ; echo "0 3 * * * STAMP=\$(date +\%F-\%H\%M) $APP_DIR/backup.sh >> $APP_DIR/backups/backup.log 2>&1" ) | crontab -

echo "==> 8/8 Done"
echo
echo "App URL:  http://$(curl -s -4 ifconfig.me 2>/dev/null || echo '<vm-ip>')"
echo "Admin:    /admin.html   (admin / admin123 — change this immediately)"
echo "Logs:     pm2 logs india-career-hub"
echo "Restart:  pm2 restart india-career-hub"
echo "Backups:  $APP_DIR/backups"
