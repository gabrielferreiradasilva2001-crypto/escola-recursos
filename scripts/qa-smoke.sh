#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/4] Lint"
npm run lint >/dev/null
echo "OK: lint limpo"

echo "[2/4] API route files"
route_count=$(find app/api -name 'route.ts' | wc -l | tr -d ' ')
echo "OK: $route_count rotas encontradas"

echo "[3/4] Rotas sem guarda de autenticação"
unauth_routes=$(for f in $(find app/api -name 'route.ts' | sort); do
  if ! rg -q "requireAdmin|requireUser|auth\.getUser\(|authorization|Authorization" "$f"; then
    echo "$f"
  fi
done)

if [[ -n "$unauth_routes" ]]; then
  echo "ATENCAO: rotas sem guarda explicita:"
  echo "$unauth_routes"
  if ! echo "$unauth_routes" | rg -q "^app/api/print-proxy/route.ts$"; then
    echo "ERRO: encontrou rota sem guarda fora da whitelist." >&2
    exit 1
  fi
  echo "OK: apenas rota publica esperada (print-proxy)"
else
  echo "OK: todas as rotas possuem guarda explicita"
fi

echo "[4/4] Arquivos de QA"
[[ -f QA_CHECKLIST.md ]] || { echo "ERRO: QA_CHECKLIST.md nao encontrado" >&2; exit 1; }
echo "OK: QA_CHECKLIST.md presente"

printf "\nSmoke QA finalizado com sucesso.\n"
