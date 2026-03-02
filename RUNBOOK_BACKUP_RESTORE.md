# Runbook: Backup e Restore (Supabase)

## Objetivo

Garantir backup diário automático e capacidade de restauração em ambiente de staging.

## Segredos necessários no GitHub

Configure em `Settings > Secrets and variables > Actions`:

- `SUPABASE_DB_URL`: connection string PostgreSQL de produção
- `STAGING_SUPABASE_DB_URL`: connection string PostgreSQL de staging (apenas para restore drill)

## Backup diário

Workflow: `.github/workflows/supabase-backup.yml`

- Execução automática: diária (03:00 UTC)
- Execução manual: aba `Actions` > `Supabase Backup` > `Run workflow`
- Artefato gerado: `supabase-backup-<run_id>` (retenção 30 dias)

## Restore drill (teste de recuperação)

Workflow: `.github/workflows/supabase-restore-drill.yml`

- Execução: manual (`workflow_dispatch`)
- Confirmação obrigatória: digitar `RESTORE_STAGING`
- Fluxo:
  1. Faz snapshot de produção (`pg_dump`)
  2. Restaura em staging (`pg_restore --clean --if-exists`)
  3. Executa smoke query (`select now()` + contagem de tabelas públicas)

## Restore manual local (opcional)

Backup:

```bash
SUPABASE_DB_URL="postgresql://..." bash scripts/supabase-backup.sh
```

Restore:

```bash
TARGET_DB_URL="postgresql://..." BACKUP_FILE="backups/supabase-YYYYMMDDTHHMMSSZ.dump" bash scripts/supabase-restore.sh
```

## Frequência recomendada de teste

- Executar `Supabase Restore Drill` ao menos 1x por mês.
- Executar imediatamente após mudanças estruturais críticas em banco.
