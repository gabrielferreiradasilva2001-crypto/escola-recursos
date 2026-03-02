# E2E Mobile (Playwright)

## Local

1. Configure credentials (optional, to run authenticated flows):

```bash
export E2E_TEACHER_USER="usuario.professor"
export E2E_TEACHER_PASSWORD="senha"
export E2E_ADMIN_USER="usuario.admin"
export E2E_ADMIN_PASSWORD="senha"
```

2. Run tests:

```bash
npm run test:e2e:mobile
```

If credentials are missing, authenticated tests are skipped and only public smoke runs.

## CI (GitHub Actions)

Workflow: `.github/workflows/quality-gate.yml`

Recommended repository secrets:

- `E2E_TEACHER_USER`
- `E2E_TEACHER_PASSWORD`
- `E2E_ADMIN_USER`
- `E2E_ADMIN_PASSWORD`
