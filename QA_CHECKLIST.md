# QA Checklist - Portal EEAV

Use este roteiro para validar os fluxos principais apos alteracoes.

## 1. Acesso e autenticacao
1. Abrir `/portal` sem sessao.
Resultado esperado: botao de entrar visivel e sem erros de layout em mobile/desktop.
2. Fazer login com usuario valido.
Resultado esperado: acesso liberado, nome do usuario exibido e navegacao funcionando.
3. Fazer logout.
Resultado esperado: sessao encerrada e retorno ao estado de visitante.

## 2. Calendario e agendamentos
1. Abrir `/calendar` e trocar ano/mes.
Resultado esperado: grade atualiza sem quebrar filtros.
2. Criar novo agendamento em celula livre.
Resultado esperado: mensagem de sucesso e reserva listada na busca inteligente.
3. Cancelar reserva propria.
Resultado esperado: status atualizado e disponibilidade recalculada.

## 3. Espaco do Professor
1. Abrir `/teacher-space` com usuario logado.
Resultado esperado: cabecalho com nome/email e cards de acesso rapido.
2. Entrar em `Minhas reservas`.
Resultado esperado: lista carrega e filtros funcionam.
3. Entrar em `Publicacoes`.
Resultado esperado: formulario abre, selecao multipla de fotos funciona e preview aparece.

## 4. Publicacoes (professor)
1. Enviar atividade com descricao + fotos + unidade (Sede/Extensao).
Resultado esperado: feedback de envio exibido e item entra em `Meus envios`.
2. Abrir `Ver envio` no popup.
Resultado esperado: fotos e descricao corretas.
3. Excluir envio proprio.
Resultado esperado: envio removido da lista.

## 5. Impressao
1. Enviar arquivo para impressao em `/my_reservations`.
Resultado esperado: registro aparece em impressos.
2. Abrir `/print-file` pelo botao `Abrir`.
Resultado esperado: preview centralizado e sem bordas extras indevidas na impressao de imagem.
3. Baixar envio.
Resultado esperado: download inicia sem erro.

## 6. Gestao
1. Abrir `/management` com admin.
Resultado esperado: abas Materiais, Impressoes, Substitutos e Publicacoes visiveis.
2. Em `Impressões`, marcar impresso e baixar envio.
Resultado esperado: status muda e download funciona.
3. Em `Publicações`, publicar/rejeitar/voltar para analise.
Resultado esperado: status e observacao atualizam corretamente.

## 7. Admin/Cadastros
1. Abrir `/portal/teachers` com admin.
Resultado esperado: abas de Usuarios, Materiais, Turmas e Escolas funcionando.
2. Criar professor com acesso e redefinir senha.
Resultado esperado: credenciais geradas e reset funcional.
3. Configurar admin em `/admin` com periodos/escolas.
Resultado esperado: acesso da gestao respeita escopo cadastrado.

## 8. Validacoes de seguranca
1. Upload de impressao acima de 25MB.
Resultado esperado: erro de limite de tamanho.
2. Chamar `/api/print-proxy` com URL fora do storage do Supabase.
Resultado esperado: bloqueio com erro de host/caminho nao permitido.
3. Tentar excluir envio de outro usuario.
Resultado esperado: bloqueio por permissao.

## 9. Regressao tecnica
1. Rodar `npm run lint`.
Resultado esperado: sem erros.
2. Rodar aplicacao local `npm run dev` e validar mobile (375px), tablet (768px) e desktop (1024px+).
Resultado esperado: sem sobreposicao de header, botoes acessiveis e grids alinhados.
