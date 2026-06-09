# Daus Lead Website

Dashboard personal untuk mengelola prospek calon client jasa pembuatan website.

## Jalankan

```bash
npm install
npm run dev
```

UI lokal: `http://127.0.0.1:5174`

API lokal: `http://127.0.0.1:8788/api`

Production: `https://dashboard.dausmhf.com`

Database lokal runtime: `data/crm-db.json`

## Login

- Email: `dausmhf@gmail.com`
- Password: `123.firdaus`

Auth memakai session cookie `HttpOnly`, CSRF token untuk request tulis, rate limit login, dan password hash `scrypt`. Untuk production, ubah `SESSION_SECRET`, `ADMIN_EMAIL`, dan `ADMIN_PASSWORD_HASH` di `.env`.

## Fokus Lead

Produk/jasa utama:

- `Website Company Profile`
- `Landing Page Conversion`
- `Website Toko Online`
- `Maintenance Website`

Flow kerja:

1. Riset prospek dilakukan manual/Codex di luar dashboard.
2. Data prospek dikirim ke `POST /api/inbox/leads`.
3. Dashboard menyimpan account dan opportunity.
4. Daus update progress, tanggal meeting, deal value, dan follow-up.

## Prisma

Prisma schema: `prisma/schema.prisma`

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:studio
```

Set `DATABASE_URL="file:./dev.db"` di `.env` saat ingin menjalankan migrasi SQLite lokal. Storage runtime app saat ini masih memakai `data/crm-db.json`, jadi migrasi ke Prisma bisa dilakukan bertahap.
