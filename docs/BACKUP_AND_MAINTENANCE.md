# Backup e manutenção do Orbyto

## Visão geral

O backup recuperável do Orbyto é composto por duas partes inseparáveis: o PostgreSQL, que contém os registros e metadados, e `storage/uploads`, que contém os arquivos dos anexos. O `.env` de produção também deve ser guardado separadamente, criptografado e fora do Git.

No ambiente local, o PostgreSQL 16 roda no container `gestao_projetos_postgres`, usa o banco `gestao_projetos_db`, o usuário `postgres` e o volume Docker `postgres_data`. Os scripts não leem nem registram senhas.

> Execute os comandos a partir da raiz do projeto em PowerShell.

## Backup do banco

```powershell
npm run backup:db
# ou
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backup-database.ps1
```

É criado um backup customizado do `pg_dump` em `backups/database/orbyto_AAAAMMDD_HHMMSS.dump`. O formato customizado permite restauração controlada com `pg_restore`.

## Backup dos anexos

```powershell
npm run backup:uploads
```

O script detecta a pasta real entre `apps/api/storage/uploads` e `storage/uploads` e cria `backups/uploads/orbyto_uploads_AAAAMMDD_HHMMSS.zip`. Se houver arquivos nas duas origens, ele aborta para não produzir um backup ambíguo. Nesse caso, identifique a instância ativa e execute:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backup-uploads.ps1 -UploadsPath apps/api/storage/uploads
```

Para criar ambos os backups:

```powershell
npm run backup:all
```

## Restaurar o banco local

Pare a API para evitar gravações concorrentes. A restauração é destrutiva para os dados atuais e exige digitar `RESTAURAR`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/restore-database.ps1 -BackupFile backups/database/orbyto_AAAAMMDD_HHMMSS.dump
```

O script também aceita `.sql`. A opção `-Force` pula a confirmação e deve ser reservada a automações isoladas e conscientes do risco. Depois, valide a aplicação e compare contagens/registros críticos.

## Restaurar anexos

1. Pare a API.
2. Faça uma cópia de segurança da pasta atual.
3. Extraia o ZIP em uma pasta temporária e confirme que ele contém a pasta `uploads`.
4. Substitua manualmente a pasta usada pela instância (`apps/api/storage/uploads` quando a API é iniciada pelo workspace, ou `storage/uploads` quando iniciada pela raiz).
5. Inicie a API e teste downloads de anexos de OS, projetos e tarefas.

Não mescle arquivos sem verificar o banco correspondente: `storageKey` no PostgreSQL precisa apontar para os mesmos arquivos do backup.

## Retenção e limpeza

```powershell
npm run backup:cleanup
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/cleanup-backups.ps1 -DaysToKeep 60
# Simulação, sem remover:
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/cleanup-backups.ps1 -DaysToKeep 30 -WhatIf
```

O script só considera `.dump`, `.sql`, `.zip` e `.log` dentro de `backups`, com retenção padrão de 30 dias.

Política mínima sugerida:

- banco diariamente;
- anexos diariamente ou, no máximo, semanalmente;
- retenção mínima de 30 dias;
- cópia criptografada externa e fora do servidor/VPS;
- teste mensal de restauração em ambiente isolado;
- alertas para falha, ausência ou tamanho anormal do backup.

## Verificações de manutenção

```powershell
npm run maintenance:check
```

O diagnóstico mostra containers, testa o PostgreSQL com `pg_isready`, mede backups/uploads e executa `prisma validate`. Comandos úteis adicionais:

```powershell
docker compose ps
docker logs --tail 100 gestao_projetos_postgres
docker exec gestao_projetos_postgres pg_isready -U postgres -d gestao_projetos_db
Get-ChildItem backups -File -Recurse | Select-Object FullName,Length,LastWriteTime
npm run build --workspace apps/api
npm run typecheck --workspace apps/web
```

## Cuidados e produção/VPS

- Nunca versione backups reais, uploads, `.env` real, `JWT_SECRET`, `SMTP_PASS` ou senhas de aplicativo.
- Guarde segredos em cofre apropriado e mantenha uma cópia segura do `.env` de produção separada dos dados.
- Teste restauração completa antes da entrada em produção; arquivo existente não comprova que o backup é restaurável.
- Na VPS, adapte estes scripts ao ambiente Linux e agende com `cron` ou timer do systemd. Esta etapa não configura o agendamento real.
- Envie backups para armazenamento externo à VPS, com criptografia, controle de acesso e política de retenção.
- Monitore código de saída, idade, tamanho e integridade; envie alerta quando uma execução falhar.
- Planeje manutenção do PostgreSQL (`VACUUM`/`ANALYZE`) com métricas e janela adequada; não execute operações agressivas sem diagnóstico.
