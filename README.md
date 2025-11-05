Mannat Tent House — Web App

Live: https://app.satyaka.in

<img width="1917" height="934" alt="image" src="https://github.com/user-attachments/assets/158ea51f-5586-4f7c-8e9c-fba7711713f8" />


SatyaKA is a full-stack web app with secure auth, role-based dashboards, powerful admin tools, and a modern, responsive UI. It’s designed to be a generic, scalable foundation for CRM/LMS/portfolio-style products: users sign in, manage their data, perform actions (forms, uploads, payments—if enabled), and admins moderate, analyze, and export.

⚙️ Tech Stack

Frontend

React 18 + TypeScript + Vite

Tailwind CSS + shadcn/ui + Lucide icons

React Router (protected routes, nested layouts)

Centralized API client (timeouts, retries, auth headers)
<img width="1896" height="973" alt="image" src="https://github.com/user-attachments/assets/39eb1ec1-5d64-4db0-865f-a1e01249db8f" />

PWA-ready (optional)

Backend

Node.js + Express + TypeScript

MongoDB (Atlas) with Mongoose

JWT authentication (access/refresh), RBAC (user/admin)

Multer (uploads), Zod/Valibot (validation), Winston/Pino (logs)

DevOps

Client: Netlify/Vercel
<img width="1887" height="963" alt="image" src="https://github.com/user-attachments/assets/d1e2b6e1-1110-4d59-82de-1a8ba3e83291" />

API: Railway/Render/VPS (PM2 + Nginx)

Secrets via provider env; CI/CD friendly

🧭 Features

Auth & Accounts

Email/password login, signup, logout

Protected routes, token refresh, “remember me”
<img width="1879" height="979" alt="image" src="https://github.com/user-attachments/assets/412b21fb-fbd7-48ab-afd4-66363e312c9a" />

Profile (avatar, name, phone), change password

Dashboard

Personalized home (cards, quick actions)

Tables with filtering, search, CSV export

Notifications & toasts

Admin Panel

Users list (search, filters, block/unblock)

App settings (branding, email, gateway toggles)

Data exports (CSV)

Content management (sections/pages/items—depending on your modules)
<img width="1876" height="939" alt="image" src="https://github.com/user-attachments/assets/8f4882a4-6d2a-47ad-b41d-c6503401319c" />

Utilities

File uploads (images/docs)

Global error handling + empty/loading states

Mobile-first responsive UI

If you’re enabling payments (Razorpay/PhonePe), keep the keys in env and add the verify endpoints on the server (see “Payments” section below).

🗂 Project Structure (suggested)
/
├─ client/                     # React + Vite + TS
│  ├─ src/
│  │  ├─ pages/
│  │  │  ├─ (auth)/login.tsx, signup.tsx
│  │  │  ├─ dashboard/index.tsx
│  │  │  └─ admin/(users|settings|exports).tsx
│  │  ├─ components/          # UI components & modules
│  │  ├─ api/                 # api.ts (centralized fetch with interceptors)
│  │  ├─ store/               # auth store / context
│  │  ├─ hooks/ lib/ utils/
│  │  ├─ App.tsx  main.tsx  index.css
│  │  └─ router.tsx           # route defs + guards
│  └─ vite.config.ts
│
├─ server/                     # Express + TS
│  ├─ src/
│  │  ├─ index.ts              # createServer(), routes, middlewares
│  │  ├─ config/env.ts         # env schema + loader
│  │  ├─ db/mongoose.ts
│  │  ├─ middleware/           # auth.ts, adminOnly.ts, error.ts
│  │  ├─ models/               # User, Item, Upload, Settings, etc.
│  │  ├─ routes/
│  │  │  ├─ auth.ts            # login, signup, refresh, me
│  │  │  ├─ users.ts           # admin: list, update, toggle
│  │  │  ├─ items.ts           # CRUD (example module)
│  │  │  ├─ uploads.ts         # multer endpoints
│  │  │  ├─ exports.ts         # CSV export
│  │  │  └─ payments.ts        # (optional) Razorpay/PhonePe
│  │  ├─ services/             # business logic
│  │  └─ utils/                # logger, csv, time, errors
│  ├─ tsconfig.json
│  └─ ecosystem.config.cjs     # PM2
│
└─ package.json                # root scripts

🔐 Environment Variables
Server (.env)
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb+srv://<USER>:<PASS>@<CLUSTER>/<DB>?retryWrites=true&w=majority
JWT_ACCESS_SECRET=<super-strong-secret>
JWT_REFRESH_SECRET=<super-strong-secret-2>
CLIENT_ORIGIN=https://app.satyaka.in
CORS_ALLOWED_ORIGINS=https://app.satyaka.in

# Optional: SMTP (emails/OTP)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# Optional: Payments
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
PHONEPE_MERCHANT_ID=
PHONEPE_SALT_KEY=
PHONEPE_SALT_INDEX=1

Client (client/.env.production / client/.env.development)
VITE_API_BASE_URL=https://api.satyaka.in
VITE_APP_NAME=SatyaKA
VITE_ENABLE_PWA=false
# Optional: Payments
VITE_RAZORPAY_KEY_ID=


Never commit real credentials. Use provider secrets in production.

🧑‍💻 Local Development
# 1) Install deps
npm install
# or: pnpm i / yarn

# 2) Start backend (terminal A)
cd server
npm run dev   # tsx src/index.ts → http://localhost:5001

# 3) Start frontend (terminal B)
cd client
npm run dev   # Vite → http://localhost:5173

<img width="1870" height="965" alt="image" src="https://github.com/user-attachments/assets/a697a670-1e0a-4f55-a4c1-6f6f92243346" />

Root scripts (example)

{
  "dev:client": "vite --host",
  "dev:server": "tsx server/src/index.ts",
  "build": "npm run build:client && npm run build:server",
  "build:client": "vite build --config client/vite.config.ts",
  "build:server": "tsc -p server/tsconfig.json",
  "start": "node server/dist/index.js",
  "format": "prettier --write .",
  "typecheck": "tsc -b"
}

🏗️ Build & Deploy
Frontend (Netlify/Vercel)
cd client
npm run build        # outputs client/dist


Netlify example (netlify.toml):

[build]
  command = "npm run build:client"
  publish = "client/dist"
<img width="1889" height="998" alt="image" src="https://github.com/user-attachments/assets/a92ffcf8-5338-4be2-8037-3725b512440d" />

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

Backend (Railway/Render/VPS)
cd server
npm run build
node dist/index.js


PM2 (VPS)

pm2 start server/dist/index.js --name satyaka-api
pm2 save && pm2 startup


Nginx reverse proxy (API)

server {
  server_name api.satyaka.in;
  location / {
    proxy_pass http://127.0.0.1:5001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}


Nginx (Client SPA)

server {
  server_name app.satyaka.in;
  root /var/www/satyaka/client/dist;
  location / {
    try_files $uri /index.html;
  }
}

🔌 API (selected)

Replace with the exact paths used in your routes.

Auth

POST /api/auth/signup

POST /api/auth/login

POST /api/auth/refresh

GET /api/auth/me

Users (admin)

GET /api/admin/users?search=&role=&status=

PATCH /api/admin/users/:id (profile/role/status)

POST /api/admin/users/export (CSV)

Items/Modules (example)

GET /api/items

POST /api/items

PATCH /api/items/:id

DELETE /api/items/:id

Uploads

POST /api/uploads (multipart/form-data)

Payments (optional)

POST /api/payments/razorpay/order

POST /api/payments/razorpay/verify

POST /api/payments/phonepe/initiate

POST /api/payments/phonepe/webhook

🧯 Troubleshooting
<img width="1907" height="962" alt="image" src="https://github.com/user-attachments/assets/dc8922a0-bba8-4160-82f8-781a56af8661" />

CORS blocked
Ensure CLIENT_ORIGIN and CORS_ALLOWED_ORIGINS include the live origin https://app.satyaka.in.

JWT not persisting
Check where tokens are stored (httpOnly cookie vs localStorage). Align client fetch with credentials policy if using cookies.

Vite refresh 404 on deep link
Use SPA fallback (/* → /index.html) on Netlify/Nginx.

Railway “Cannot find module dist/index.js”
Confirm npm run build:server generates output and start points to the right file.

Time zone drift
Normalize all server times to Asia/Kolkata and format on the client.

🔒 Security Notes

Validate every request payload (Zod/Valibot).

Hash passwords (bcrypt) and rate-limit auth routes.

Sanitize uploads and limit file types/sizes.

Keep admin routes behind both auth + role guard.

Rotate secrets; never commit keys.

📈 Roadmap (nice-to-haves)

Role-based menu builder

Audit logs (who changed what, when)

Advanced filters with saved views

Background jobs (queue) for emails/exports

PWA install prompt + offline cache

👥 Credits

Built by: Satya Web Technology
Address: Office No. 06, Opp. Oxygen Hospital, Near Durga Bhawan Mandir, Rohtak – 124001
Phone: +91 93184 17190

📄 License

Proprietary — © Satya Web Technology. All rights reserved
