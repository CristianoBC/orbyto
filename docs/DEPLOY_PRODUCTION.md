# Deploy de produção do Orbyto

## Estratégia recomendada

O deploy recomendado é uma VPS Linux LTS com Nginx e Certbot na borda, API NestJS e front-end Next.js executados por PM2, e PostgreSQL 16 em Docker Compose. O Nginx publica somente HTTPS; `127.0.0.1:3000`, `127.0.0.1:3001` e a porta do PostgreSQL não devem ficar expostos à internet.

O domínio definitivo é `https://www.orbyto.com.br`: ele serve o front e `/api` encaminha à API. O domínio raiz `https://orbyto.com.br` redireciona permanentemente para `https://www.orbyto.com.br`. Isso simplifica DNS, SSL e CORS.

```text
Internet -> Nginx :443 -> Next.js/PM2 :3000
                    \-> NestJS/PM2 :3001 (/api)
NestJS -> PostgreSQL 16 (Docker, rede/host local)
NestJS -> /var/lib/orbyto/uploads (volume persistente)
```

O `docker-compose.yml` existente continua sendo o ambiente local e não deve ser usado sem endurecimento em produção.

## Requisitos do servidor

- Ubuntu 24.04 LTS ou equivalente atualizado;
- 2 vCPU e 4 GB RAM como mínimo inicial (8 GB recomendado para builds na VPS);
- 30 GB SSD mais a capacidade projetada para banco, uploads e backups;
- DNS administrável, SMTP e armazenamento externo para backups;
- Node.js 22 LTS, npm, Git, Nginx, Certbot, PM2 e Docker Engine com Compose plugin;
- portas públicas 22 (restrita), 80 e 443; portas 3000, 3001 e 5432 bloqueadas externamente.

Monitore CPU, RAM, disco, certificados, processos PM2, PostgreSQL, idade dos backups e códigos de erro HTTP.

## Estrutura sugerida

```text
/opt/orbyto/current              código da versão ativa
/opt/orbyto/releases/<id>        releases anteriores (opcional)
/etc/orbyto/api.env              segredos e configuração da API (chmod 600)
/opt/orbyto/current/apps/web/.env.production  URL pública usada no build
/var/lib/orbyto/uploads          anexos persistentes
/var/backups/orbyto              backups locais temporários
/var/log/orbyto                  logs, se centralizados fora do repositório
```

O usuário de serviço `orbyto` deve ser proprietário do código, uploads e logs. O `.env` não deve entrar no Git. Como a API procura `apps/api/.env` e depois `.env`, uma opção simples é criar um link protegido:

```bash
sudo install -d -o orbyto -g orbyto -m 750 /opt/orbyto /var/lib/orbyto/uploads /var/log/orbyto
sudo install -d -o root -g orbyto -m 750 /etc/orbyto
sudo install -o root -g orbyto -m 640 /dev/null /etc/orbyto/api.env
ln -sfn /etc/orbyto/api.env /opt/orbyto/current/apps/api/.env
```

## Instalação básica

Instale Node.js 22 LTS pelo repositório oficial da distribuição/NodeSource e confirme `node --version` e `npm --version`. Instale o PM2 globalmente e habilite a inicialização automática:

```bash
sudo npm install -g pm2
pm2 startup systemd -u orbyto --hp /home/orbyto
```

Instale Docker Engine e o plugin Compose pelos repositórios oficiais do Docker. Confirme `docker version` e `docker compose version`. Instale Nginx, Certbot e o plugin Nginx do Certbot pelo gerenciador da distribuição.

## PostgreSQL de produção

Use PostgreSQL 16 em um Compose exclusivo de produção, com senha em arquivo de ambiente fora do Git, volume nomeado e bind somente em `127.0.0.1` (ou sem publicar porta se a API estiver na mesma rede Docker). Não reutilize as credenciais locais de `docker-compose.yml`.

Exemplo conceitual para a conexão da API:

```dotenv
DATABASE_URL="postgresql://orbyto_app:SENHA_FORTE@127.0.0.1:5432/orbyto_prod?schema=public"
```

Crie o banco e um usuário dedicado com privilégios somente no banco Orbyto. Restrinja acesso em firewall/`pg_hba.conf`. Depois de instalar dependências e antes de iniciar a nova versão:

```bash
cd /opt/orbyto/current
npm ci
npm run db:validate
npm run db:generate
npm run db:migrate:prod
```

`db:migrate:prod` executa `prisma migrate deploy`; nunca use `migrate dev` em produção. Rode `npm run db:seed` apenas na implantação inicial e somente após revisar o seed: ele pode criar o tenant e OWNER iniciais. Troque imediatamente qualquer senha inicial conhecida. Não rode seed automaticamente em atualizações.

## Variáveis de ambiente

Baseie a API em `apps/api/.env.example`. Em produção, configure:

```dotenv
NODE_ENV=production
PORT=3001
DATABASE_URL="postgresql://USUARIO:SENHA@127.0.0.1:5432/BANCO?schema=public"
JWT_SECRET="GERAR_SEGREDO_ALEATORIO_COM_32_OU_MAIS_CARACTERES"
JWT_EXPIRES_IN=8h
FRONTEND_URL=https://www.orbyto.com.br
CORS_ORIGIN=https://www.orbyto.com.br
DEFAULT_TENANT_SLUG=interno
AUTH_ALLOWED_EMAIL_DOMAIN=example.org
USER_INVITE_EXPIRES_HOURS=48
SMTP_HOST=smtp.example.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario-smtp
SMTP_PASS=SENHA_SMTP
MAIL_FROM=no-reply@example.org
MAIL_FROM_NAME=Orbyto
UPLOAD_DIR=/var/lib/orbyto/uploads
MAX_UPLOAD_SIZE_MB=10
ALLOWED_UPLOAD_EXTENSIONS=pdf,png,jpg,jpeg,doc,docx,xls,xlsx,txt,csv
DEADLINE_ALERTS_ENABLED=true
DEADLINE_ALERTS_CRON="0 8 * * *"
DEADLINE_ALERTS_TIMEZONE=America/Sao_Paulo
MAIL_OPERATIONAL_NOTIFICATIONS_ENABLED=true
MAIL_SERVICE_ORDER_NOTIFICATIONS_ENABLED=true
MAIL_TASK_NOTIFICATIONS_ENABLED=true
MAIL_PROJECT_NOTIFICATIONS_ENABLED=true
MAIL_DEADLINE_ALERTS_ENABLED=true
```

`API_PORT` continua aceito para compatibilidade local, mas `PORT` tem precedência. Para múltiplas origens CORS, use lista separada por vírgulas, sem barra final. Não use `*` com credenciais.

O front usa `NEXT_PUBLIC_API_URL`, incorporada durante o build:

```dotenv
NEXT_PUBLIC_API_URL=https://www.orbyto.com.br/api
```

Alterar essa variável exige novo `next build`. O fallback `http://localhost:3001/api` existente no código preserva o desenvolvimento local.

## Build e execução com PM2

Na raiz do monorepo:

```bash
npm ci
npm run db:generate
npm run db:validate
npm run build:all
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 status
pm2 logs --lines 100
```

Os processos são `orbyto-api` e `orbyto-web`, reiniciam automaticamente e usam as portas 3001 e 3000. O arquivo PM2 não contém segredos; a API lê seu `.env`, enquanto a variável pública do Next deve existir antes do build.

Comandos individuais úteis:

```bash
npm run build:api
npm run build:web
npm run start:api
npm run start:web
pm2 restart orbyto-api --update-env
pm2 restart orbyto-web --update-env
```

PM2 é a estratégia recomendada. Um Compose completo pode ser criado futuramente, mas requer imagens multi-stage, healthchecks e volumes próprios; não se deve modificar o Compose local apenas para o deploy atual.

## Nginx, domínio e SSL

Crie os registros DNS A/AAAA de `www.orbyto.com.br` e `orbyto.com.br` apontando para a VPS e aguarde a propagação. Copie `docs/nginx-orbyto.production.example.conf` e valide:

```bash
sudo cp docs/nginx-orbyto.production.example.conf /etc/nginx/sites-available/orbyto
sudo ln -s /etc/nginx/sites-available/orbyto /etc/nginx/sites-enabled/orbyto
sudo nginx -t
sudo systemctl reload nginx
```

O `proxy_pass http://127.0.0.1:3001` preserva `/api/...`, compatível com o prefixo global da API. Alinhe `client_max_body_size` ao `MAX_UPLOAD_SIZE_MB` (ou deixe ligeiramente maior).

Após o DNS responder e HTTP funcionar:

```bash
sudo certbot --nginx -d www.orbyto.com.br -d orbyto.com.br
sudo certbot renew --dry-run
```

Ative o redirecionamento HTTP→HTTPS pelo Certbot. Mantenha também o redirecionamento do domínio raiz para `https://www.orbyto.com.br`. Teste a renovação automática e os headers com `curl -I`.

## Uploads

Defina `UPLOAD_DIR=/var/lib/orbyto/uploads`. O caminho é externo ao release e, portanto, sobrevive a builds, trocas de diretório e rollback. Garanta escrita somente ao usuário da API:

```bash
sudo chown -R orbyto:orbyto /var/lib/orbyto/uploads
sudo chmod 750 /var/lib/orbyto/uploads
```

Não sirva essa pasta diretamente pelo Nginx: downloads passam pela API e suas permissões. Inclua uploads em backup consistente com o banco. Para restaurar, pare a API, restaure banco e pasta do mesmo ponto no tempo, valide proprietário/permissões e teste downloads antes de liberar.

## Backup

Antes de toda atualização, gere um dump customizado e uma cópia dos uploads:

```bash
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --file=/var/backups/orbyto/orbyto_$(date +%Y%m%d_%H%M%S).dump
tar -C /var/lib/orbyto -czf /var/backups/orbyto/uploads_$(date +%Y%m%d_%H%M%S).tar.gz uploads
```

Se o PostgreSQL estiver em Docker, execute `pg_dump` dentro do container e grave/copie o resultado no host. Os scripts PowerShell existentes atendem ao ambiente local; em Linux, agende comandos equivalentes com cron ou systemd timer.

Política mínima: backup diário do banco e uploads, retenção de 30 dias, cópia criptografada externa, acesso restrito, alerta de falha e teste mensal de restauração isolada. Guarde o `.env` criptografado separadamente. Existência do arquivo não prova restaurabilidade.

## Atualização controlada

1. Confirme saúde e espaço em disco; registre o commit ativo.
2. Gere e envie para armazenamento externo backups do banco e uploads.
3. Baixe a nova versão em release separado ou faça checkout do commit aprovado.
4. Restaure/copiei o `.env` protegido e mantenha `UPLOAD_DIR` externo.
5. Execute `npm ci`, `db:generate`, `db:validate` e os quatro comandos de validação do projeto.
6. Execute `npm run db:migrate:prod` uma única vez.
7. Troque o symlink `current` se usar releases e reinicie `pm2 restart ecosystem.config.js --update-env`.
8. Execute o checklist pós-deploy e monitore logs/erros.

Evite `git pull` diretamente sobre uma release parcialmente construída. Registre versão, horário, operador, migration aplicada e resultado dos testes.

## Rollback básico

Se não houve migration incompatível, volte o symlink/checkout ao commit anterior, execute `npm ci`, restaure os builds e reinicie PM2. Preserve sempre `UPLOAD_DIR`.

Se a atualização alterou dados ou migrations, não reverta migrations manualmente: coloque o sistema em manutenção, avalie compatibilidade e restaure banco e uploads do backup pareado. Isso perde dados posteriores ao backup e exige decisão explícita. Nunca edite migrations antigas.

## Checklist pós-deploy

- [ ] Página inicial e assets carregam por HTTPS sem conteúdo misto.
- [ ] Login OWNER e `/api/auth/me` funcionam; logout e expiração do token foram verificados.
- [ ] Criar usuário, convidar usuário e concluir convite.
- [ ] Autocadastro REQUESTER e acesso isolado ao portal.
- [ ] Abrir, atualizar e concluir uma OS; registrar avaliação de satisfação.
- [ ] Criar projeto e tarefa; mover tarefa no Kanban e abrir detalhe.
- [ ] Criar registros diários e validar cronograma.
- [ ] Inserir comentários em OS, projeto e tarefa.
- [ ] Enviar anexo permitido, rejeitar tipo/tamanho inválido e baixar o anexo.
- [ ] Dashboard operacional, relatórios e filtros exibem dados corretos.
- [ ] Auditoria registra eventos e não revela dados sensíveis.
- [ ] Configurações, cadastros auxiliares e preferências de notificação funcionam.
- [ ] E-mails de convite, recuperação e operações chegam corretamente.
- [ ] Alertas de prazo executam no timezone correto e não duplicam indevidamente.
- [ ] Backup de banco e uploads foi gerado, enviado externamente e validado.
- [ ] Reinício da VPS recupera Docker, Nginx e processos PM2.

## Checklist de segurança antes da liberação

- [ ] `JWT_SECRET` aleatório, exclusivo, com no mínimo 32 caracteres e guardado fora do Git.
- [ ] `.env`, backups, uploads e logs não estão versionados nem publicamente acessíveis.
- [ ] CORS contém somente origens HTTPS definitivas.
- [ ] Certificado SSL válido, renovação testada e HTTP redirecionado para HTTPS.
- [ ] Firewall libera somente 80/443 e SSH restrito; 3000/3001/5432 não são públicos.
- [ ] SSH usa chaves, desabilita login root/senha quando viável e possui proteção contra força bruta.
- [ ] Usuários de SO, banco e SMTP têm privilégio mínimo e senhas fortes distintas.
- [ ] SMTP foi testado e credenciais não aparecem em logs.
- [ ] Uploads têm limite/extensões configurados, permissões restritas e acesso somente pela API.
- [ ] Backups externos estão criptografados, têm retenção e restauração testada.
- [ ] Logs não contêm tokens, senhas, URLs com credenciais ou conteúdo sensível.
- [ ] Dependências e sistema operacional foram atualizados após avaliação controlada.

## Pendências que exigem o servidor real

- definir IP e criar os registros DNS de `www.orbyto.com.br` e `orbyto.com.br`;
- dimensionar CPU, RAM, disco e retenção com base no uso esperado;
- criar usuário Linux, firewall, SSH e diretórios/permissões;
- escolher e provisionar PostgreSQL Docker ou instalado;
- gerar segredos, credenciais de banco e SMTP;
- instalar Nginx/Certbot, emitir certificado e testar renovação;
- configurar backup externo, agenda, alertas e monitoramento;
- executar teste completo de restauração e checklist funcional antes da liberação.
