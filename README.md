This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Activity Photo Publishing Flow

This project now includes:

- Teacher upload page: `/activity-submissions`
- Management review page: `/management/activity-submissions`

Before using it in production, run this SQL in Supabase:

- `scripts/sql/activity-submissions.sql`

## QA Manual

- Checklist de validacao funcional e tecnica: `QA_CHECKLIST.md`
- Checklist de go-live de producao: `GO_LIVE_CHECKLIST.md`

## E2E Mobile

- Configuracao: `playwright.config.ts`
- Testes: `tests/e2e/mobile-critical.spec.ts`
- Execucao local:
  - `npm run test:e2e:mobile`
- CI:
  - `.github/workflows/e2e-mobile.yml`

## Monitoramento

- Health endpoint:
  - `GET /api/health`
- Captura de erro client:
  - `app/components/ErrorMonitor.tsx`
  - `POST /api/monitoring/error`
- Provedor real (Sentry) opcional:
  - configurar `SENTRY_DSN` no ambiente da Vercel
  - backend envia exceções para o Sentry via `lib/serverMonitoring.ts`
- Error boundaries:
  - `app/error.tsx`
  - `app/global-error.tsx`

## Qualidade e Proteção de Branch

- Workflow de gate:
  - `.github/workflows/quality-gate.yml`
- Habilite no GitHub (Settings > Branches > Branch protection rules):
  - Require status checks to pass before merging
  - Checks obrigatórios:
    - `lint`
    - `e2e-mobile`
