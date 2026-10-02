# Al Fajr Frontend

Frontend application for the Al Fajr platform and storefront.

The active model uses General/Cash/Bank accounts and unified sales invoices. Customer CRUD and user-facing Party/debt/writeoff flows are removed. Backend guards and services enforce permissions; frontend route protection alone is not authorization. Retail/Wholesale choose default invoice prices and never limit sale quantity by stock.

## Tech Stack

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS

## Requirements

- Node.js
- npm

## Setup

```bash
npm install
npm run dev
```

## Environment

The application uses `VITE_API_BASE_URL` to configure the API base URL. Copy the structure from `.env.example` and provide the value appropriate for your environment.

The development default is `http://127.0.0.1:6164`. Vite variables are public build configuration; never put credentials or private tokens in them. Backend routes have no global `/api` prefix.

## Validation and Build

```bash
npm run typecheck
npm run lint
npm run build
```

Use `npm run preview` to preview the production build locally.

## Production

This project is a single-page application. The redirect rule in `public/_redirects` sends client-side routes to `index.html` on compatible hosting platforms.

Use the actual backend URL at build time, preserve backend uploads and verify direct links after deployment. Build is local validation, not deployment approval. Read `AGENTS.md` and the sibling backend's `docs/FINAL_SYSTEM_AUDIT_2026-10-02.md` for final audit/rehearsal evidence and remaining human Manual QA. Historical reports are not current contracts.
