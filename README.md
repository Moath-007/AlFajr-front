# Al Fajr Frontend

Frontend application for the Al Fajr platform and storefront.

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

## Validation and Build

```bash
npm run typecheck
npm run lint
npm run build
```

Use `npm run preview` to preview the production build locally.

## Production

This project is a single-page application. The redirect rule in `public/_redirects` sends client-side routes to `index.html` on compatible hosting platforms.
