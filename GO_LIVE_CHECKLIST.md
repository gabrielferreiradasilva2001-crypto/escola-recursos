# Go-Live Checklist (Produção)

## 1) Pré-deploy

- `npm run lint` sem erros.
- `npm run test:e2e:mobile` sem falhas críticas.
- Variáveis de ambiente validadas (`SUPABASE`, `NEXT_PUBLIC_*`, etc.).
- Variáveis de monitoramento validadas:
  - `SENTRY_DSN` (opcional, recomendado)
- Migrações SQL aplicadas no Supabase:
  - `scripts/sql/admin-access.sql`
  - `scripts/sql/resource-groups.sql`
  - `scripts/sql/students.sql`
  - `scripts/sql/material-deliveries-school.sql`
  - `scripts/sql/activity-submissions.sql`
  - `scripts/sql/teacher-class-assignments.sql`

## 2) Deploy

- Deploy feito na Vercel.
- Domínio oficial apontando para o deploy esperado.
- Endpoint de saúde respondendo 200:
  - `GET /api/health`

## 3) Pós-deploy (smoke)

- Login professor funciona.
- Login gestão/admin funciona.
- Fluxo de agendamento em mobile funciona (seleção e salvar).
- Edição de professor abre popup de ações completo.
- Gestão financeira/material/substitutos abre e salva dados.
- Publicações: revisão e mudança de status funcionando.

## 4) Observabilidade

- Erros client-side aparecem no log via `/api/monitoring/error`.
- Erros de boundary capturados (`app/error.tsx`, `app/global-error.tsx`).
- Se `SENTRY_DSN` estiver ativo, eventos chegando no painel Sentry.
- Time confirma acesso aos logs da Vercel.

## 6) Governança de merge

- Branch protection ativa na `main`.
- Status checks obrigatórios:
  - `lint`
  - `e2e-mobile`

## 5) Rollback

- Tag de rollback criada e publicada:
  - `v1-mobile-hardening`
- Processo de rollback documentado e testado no time.
