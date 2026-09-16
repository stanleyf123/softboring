# 部署到 Linode Nanode（與 99gold 同機、獨立站點）

Soft Boring Weekly 與 [99gold](https://github.com/stanleyf123/99gold) **共用同一台 Linode VPS**，但是 **另一個站點**：另一套目錄、環境檔、systemd、Nginx `server`、SQLite。不要和 99gold 共用資料庫或服務單元。

每週回顧與會員帳號存在 Soft Boring 自己的 SQLite（`SQLITE_PATH`）。部署或更新後跑 Soft Boring 的 `npm run db:migrate`（不要跑 99gold 的 migrate），以套用 `users` / `sessions` / `reviews.user_id` / 訂閱欄位 / `payments` 繳費記錄 / `user_settings` / `password_reset_tokens` / `notifications` / `oauth_accounts`（Google / LINE；`users.password_hash` 可為空）。

目標主機範例：`172.237.11.195`（與 99gold 文件裡同一台，1GB RAM + swap）。

| | 99gold | Soft Boring |
| --- | --- | --- |
| 應用目錄 | `/var/www/99gold` | `/var/www/softboring` |
| SQLite | `/var/www/99gold/data/99gold.sqlite` | `/var/www/softboring/data/softboring.sqlite` |
| 環境檔 | `/etc/99gold.env` | `/etc/softboring.env` |
| systemd | `99gold.service` → `127.0.0.1:3000` | `softboring.service` → `127.0.0.1:3001` |
| Nginx `server_name` | `99gold.net` | `softboring.com` `www.softboring.com` |
| `SITE_URL` | `https://99gold.net` | `https://softboring.com` |

**不要：**

- 把 Soft Boring 放進 `/var/www/99gold`
- 把 `SQLITE_PATH` 指到 `99gold.sqlite`
- 改 `99gold.service` 的 port 或 `WorkingDirectory`
- 在 Soft Boring 的 Nginx 裡加 `default_server`（99gold 已經占用 HTTP default）

## 1. 系統套件

99gold 若已在跑，Nginx、Node 22、`build-essential`、`sqlite3` 多半已經裝好。若這是全新機器：

```bash
sudo apt update
sudo apt install -y nginx build-essential python3 sqlite3 certbot python3-certbot-nginx
# Node.js 22：依 NodeSource 或 nvm 安裝，確認 `node -v` >= 22
```

1GB RAM 建議保留 1–2GB swap。`next build` 很吃記憶體，**最好在本機或較大的機器 build**，再把 `.next/`、`node_modules/`、原始碼同步到 VPS。若一定要在 Nanode 上 build：

```bash
export NODE_OPTIONS=--max-old-space-size=768
npm run build
```

同機還有 99gold 時，不要兩個 `next build` 同時跑。

## 2. 應用程式目錄

```bash
sudo mkdir -p /var/www/softboring/data
sudo chown -R www-data:www-data /var/www/softboring
# 將 repo 放到 /var/www/softboring 後：
cd /var/www/softboring
sudo -u www-data npm ci
sudo -u www-data npm run build   # 若未在其他機器先 build
```

SQLite 檔為 `/var/www/softboring/data/softboring.sqlite`（可用 `SQLITE_PATH` 覆寫）。請把 `data/` 列入備份，不要提交到 git。這個檔案與 `/var/www/99gold/data/` **完全分開**。

建表：

```bash
cd /var/www/softboring
sudo -u www-data SQLITE_PATH=/var/www/softboring/data/softboring.sqlite npm run db:migrate
```

若 systemd 已載入 `/etc/softboring.env`，之後行程會用同一個路徑。首次 `get`/`post` 也會套用同一份 schema，但仍應在 pull 之後明確跑 migrate。

## 3. 環境變數

`/etc/softboring.env`（權限 `0600`，所有者 `www-data`）：

```bash
SITE_URL=https://softboring.com
SQLITE_PATH=/var/www/softboring/data/softboring.sqlite
ADMIN_TOKEN=請改成足夠長的隨機字串
NODE_ENV=production

# Soft+（Stripe Checkout）。三個都填才會打開結帳；留空則方案頁仍可看，按鈕會顯示 payments not configured。
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_MONTHLY=
# STRIPE_PRICE_YEARLY=
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
# Optional sticker one-time prices (Soft Wall). Unset = catalog cents via price_data.
# STRIPE_PRICE_STICKER_PACK=

# Google / LINE 會員登入（與 /admin 無關）。成對填寫才會啟用該按鈕；留空則按鈕停用，電子郵件登入仍可用。
# 回呼：https://softboring.com/api/auth/oauth/google/callback
#        https://softboring.com/api/auth/oauth/line/callback
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# LINE_CHANNEL_ID=
# LINE_CHANNEL_SECRET=

# 密碼重設與每週提醒信件。優先 Resend；也可 SMTP（與 99gold 類似）。
# 兩者都空時：忘記密碼仍會產生 token，連結只寫進 journalctl／stdout；
# npm run reminders:dispatch 會成功略過（no-op）。
# EMAIL_FROM=Soft Boring Weekly <noreply@softboring.com>
# RESEND_API_KEY=
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# SMTP_SECURE=false

# 本機開發用 3000；這台 VPS 上 99gold 已占用 3000，Soft Boring 用 3001。
# 實際監聽看 systemd 的 ExecStart（--port 3001），不要改成 3000。
```

產生權杖範例：`openssl rand -hex 32`。不要把真實密鑰寫進 git。也不要複製 `/etc/99gold.env` 來用（99gold 的 `ADMIN_TOKEN` 是另一組）。

管理後台：`https://softboring.com/admin/login`（不在前台導覽列）。也可用標頭 `Authorization: Bearer <ADMIN_TOKEN>` 或 `x-admin-token` 呼叫 `/api/admin/*`。

`SITE_URL` 除了給登入／管理 cookie 加 `Secure`，也是反代後面絕對轉址的公開 origin。不要省略。

`SITE_URL` 是反代後面的公開 origin。Nginx 會轉 `Host` 與 `X-Forwarded-Proto`，但 Next.js 的 `request.url` 仍可能是 `http://127.0.0.1:3001`。凡是 **絕對** 轉址（例如 `/api/admin/session` 的 `Location`）必須用 `SITE_URL`（去掉結尾斜線）當 origin，不要用 `request.url`。

Stripe / OAuth / 驗證信：驗證信仍是之後可選。Google / LINE 會員登入請在 Google Cloud Console 與 LINE Developers 設定回呼 URL（見 README），並在 `/etc/softboring.env` 填入對應密鑰；缺一組時該按鈕停用，不會讓網站掛掉。密碼重設與每週提醒若要真的寄信，在 `/etc/softboring.env` 填 `RESEND_API_KEY`（或 SMTP_*）與 `EMAIL_FROM`。Soft+ 若要真的能收款，在 `/etc/softboring.env` 填 Stripe 變數，並在 Stripe Dashboard 把 webhook 指到 `https://softboring.com/api/stripe/webhook`（事件：`checkout.session.completed`、`checkout.session.async_payment_succeeded`、`customer.subscription.updated`、`customer.subscription.deleted`、`invoice.paid`、`invoice.payment_failed`、`charge.refunded`）。成功的結帳／發票會寫入 `payments` 表；管理後台 `/admin/payments` 與會員詳情可看繳費記錄。App Router 會讀 raw body 驗簽；Nginx 預設 `proxy_pass` 即可，不要對 webhook 路徑做 body rewrite。步驟見 README。更新後務必再跑一次 `npm run db:migrate`。

管理後台介面為繁體中文：`https://softboring.com/admin/login`。

## 4. systemd：網站行程

範例檔也在 repo 的 `deploy/systemd/softboring.service`。

`/etc/systemd/system/softboring.service`：

```ini
[Unit]
Description=Soft Boring Weekly Next.js
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/softboring
EnvironmentFile=/etc/softboring.env
ExecStart=/usr/bin/npm start -- --hostname 127.0.0.1 --port 3001
Restart=on-failure
RestartSec=5
# 與 99gold 同機：給 Soft Boring 留較小上限，避免吃掉 Nanode 記憶體
MemoryMax=256M

[Install]
WantedBy=multi-user.target
```

```bash
sudo cp /var/www/softboring/deploy/systemd/softboring.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now softboring.service
```

確認 **沒有** 改到 `99gold.service`。`ss -tlnp | grep -E '3000|3001'` 應看到 99gold 在 `127.0.0.1:3000`、Soft Boring 在 `127.0.0.1:3001`。

## 5. DNS

在網域註冊商把 **同一個 A 記錄** 指到這台 VPS：

| 名稱 | 類型 | 值 |
| --- | --- | --- |
| `softboring.com` | A | `172.237.11.195` |
| `www.softboring.com` | A | `172.237.11.195` |

這與 99gold.net 的 IP 相同，靠 Nginx 的 `server_name` 分流，不是靠不同 IP。TTL 生效後再申請憑證。

不要把 Soft Boring 指到 Vercel 當 v1 正式環境。

## 6. Nginx

範例檔在 `deploy/nginx/softboring`。`server_name` 只用 Soft Boring 的網域；**不要** `default_server`，也 **不要** 把 `99gold.net` 寫進這個檔案。

`/etc/nginx/sites-available/softboring`：

```nginx
upstream softboring {
    server 127.0.0.1:3001;
    keepalive 8;
}

server {
    listen 80;
    listen [::]:80;
    server_name softboring.com www.softboring.com;

    client_max_body_size 2m;

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_pass http://softboring;
    }
}
```

```bash
sudo cp /var/www/softboring/deploy/nginx/softboring /etc/nginx/sites-available/softboring
sudo ln -sf /etc/nginx/sites-available/softboring /etc/nginx/sites-enabled/softboring
sudo nginx -t && sudo systemctl reload nginx
```

`nginx -t` 失敗時先檢查是否與 99gold 的 site 衝突（兩個 `default_server`、重複 `upstream` 名稱等）。

## 7. HTTPS（Certbot）

DNS A 記錄生效、HTTP `:80` 已反代之後：

```bash
sudo certbot --nginx -d softboring.com -d www.softboring.com
```

Certbot 會改 Soft Boring 的 Nginx site（加上 `:443` 與 redirect）。憑證路徑通常為：

- `/etc/letsencrypt/live/softboring.com/fullchain.pem`
- `/etc/letsencrypt/live/softboring.com/privkey.pem`

這與 99gold 的 `/etc/letsencrypt/live/99gold.net/` **分開**。不要把 99gold 的憑證路徑貼到 Soft Boring。

HTTPS 範例（Certbot 完成後大致長這樣；以 certbot 實際寫入為準）：

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name softboring.com www.softboring.com;
    ssl_certificate     /etc/letsencrypt/live/softboring.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/softboring.com/privkey.pem;

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_pass http://softboring;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name softboring.com www.softboring.com;
    return 301 https://$host$request_uri;
}
```

啟用 HTTPS 後確認 `/etc/softboring.env` 裡是 `SITE_URL=https://softboring.com`，然後：

```bash
sudo systemctl restart softboring.service
```

續期：若已裝 `python3-certbot-nginx`，Let's Encrypt timer 通常會自動續。抽查：

```bash
sudo certbot certificates
sudo systemctl list-timers | grep -i certbot
```

## 8. 檢查

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/en
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/zh-tw
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/admin/login
# 未帶 token 應不是 200 儀表板
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/admin
# 99gold 應仍在 3000
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
sudo systemctl status softboring.service
sudo systemctl status 99gold.service
```

DNS 與憑證好了之後：

```bash
curl -sSI https://softboring.com/en | head
```

## 9. 更新

```bash
cd /var/www/softboring
sudo -u www-data git pull
sudo -u www-data npm ci
# 載入本站環境檔裡的 SQLITE_PATH，不要跑 99gold 的 db:migrate
sudo -u www-data bash -lc 'set -a; source /etc/softboring.env; set +a; npm run db:migrate'
sudo -u www-data npm run build
sudo systemctl restart softboring.service
```

只重啟 `softboring.service`。除非 99gold 也要發版，否則不要 `restart 99gold.service`。

## 10. 備份

分開備份：

- `/var/www/softboring/data/`
- `/etc/softboring.env`

不要只備份 99gold 的 `data/` 就當作 Soft Boring 也備份了。

## 11. 每週提醒排程

帳號頁可開關每週提醒與星期幾。伺服器排程：

```bash
# /etc/cron.d/softboring-reminders  （每天跑一次即可；腳本會再依 weekday 過濾）
15 7 * * * www-data bash -lc 'set -a; source /etc/softboring.env; set +a; cd /var/www/softboring && npm run reminders:dispatch'
```

沒有設定 `RESEND_API_KEY` 或 `SMTP_HOST` 時，這個指令會印 `email not configured; no-op.` 並以 0 結束，不會失敗。時區以機器 local `Date#getDay()` 為準，請把 cron 跑在你希望的時區（通常是 Asia/Taipei）。
