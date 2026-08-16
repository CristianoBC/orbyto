Claro. Cole este conteúdo no seu `AGENTS.md` na raiz do projeto:

````markdown
# AGENTS.md — Orbyto

## Identidade do Projeto

Nome oficial do sistema: **Orbyto**

Subtítulo oficial:

**Plataforma de Gestão de Projetos e Ordens de Serviço**

O Orbyto é uma plataforma web profissional para gestão de projetos, ordens de serviço, tarefas, registros diários, comentários, anexos, usuários e auditoria.

A aplicação foi originalmente inspirada em uma solução feita em Google Apps Script vinculada a Planilhas Google, mas agora está sendo reconstruída como uma aplicação web profissional, escalável e preparada para uso interno e futura evolução comercial/SaaS.

---

## Objetivo Atual

A versão atual é um MVP interno para uso por um pequeno grupo de usuários autenticados.

A versão futura poderá ser comercial, com múltiplos clientes, inscrição, planos, pagamentos e isolamento completo por tenant.

Portanto, toda implementação deve respeitar desde já:

- isolamento por `tenantId`;
- autenticação JWT;
- autorização por perfil;
- código limpo;
- arquitetura modular;
- segurança;
- facilidade futura de escalar para SaaS.

---

## Stack Técnica

### Monorepo

O projeto usa npm workspaces.

Estrutura principal:

```text
apps/api
apps/web
packages/database
````

### Back-end

```text
NestJS
TypeScript
Prisma 7
PostgreSQL
Docker
JWT
bcryptjs
class-validator
class-transformer
```

API local:

```text
http://localhost:3001/api
```

### Front-end

```text
Next.js
React
TypeScript
App Router
CSS moderno/customizado
JWT em localStorage para MVP interno
```

Front local:

```text
http://localhost:3000
```

### Banco de Dados

Banco local via Docker Compose:

```text
PostgreSQL em localhost:5432
Database: gestao_projetos_db
```

Prisma schema:

```text
packages/database/prisma/schema.prisma
```

Prisma config:

```text
prisma.config.ts
```

Seed:

```text
packages/database/prisma/seed.ts
```

---

## Comandos Principais

### Subir banco

```powershell
docker compose up -d
```

### Verificar containers

```powershell
docker ps
```

### Validar Prisma

```powershell
npm run db:validate
```

### Rodar migration

```powershell
npm run db:migrate -- --name nome_da_migration
```

Atenção: nunca criar migration sem alteração real no `schema.prisma`.

### Rodar seed

```powershell
npm run db:seed
```

### Abrir Prisma Studio

```powershell
npm run db:studio
```

### Rodar API

```powershell
npm run start:dev --workspace apps/api
```

### Rodar front-end

```powershell
npm run dev --workspace apps/web
```

### Build API

```powershell
npm run build --workspace apps/api
```

### Build Web

```powershell
npm run build --workspace apps/web
```

### Typecheck Web

```powershell
npm run typecheck --workspace apps/web
```

---

## Estado Atual do Projeto

A fundação técnica já existe.

Módulos implementados no back-end:

```text
AuthModule
UsersModule
ServiceOrdersModule
CommentsModule
AttachmentsModule
ProjectsModule
TasksModule
DailyLogsModule
PrismaModule
```

Funcionalidades já existentes:

```text
Login JWT
Rota /api/auth/me
Controle por roles
Consulta de usuário logado
Listagem de usuários por tenant
Criação/listagem/atualização de ordens de serviço
Comentários
Anexos
Projetos
Tarefas
Registros diários
AuditLog em eventos relevantes
```

Front-end base já existe em:

```text
apps/web
```

Inclui:

```text
Login
Layout interno
Sidebar
Topbar
Dashboard
Ordens de Serviço
Projetos
Tarefas
Registros Diários
Usuários
```

---

## Usuário Seed Inicial

Usuário inicial para testes:

```text
E-mail: cristiano.costa@colsan.org.br
Senha: Admin@123456
Role: OWNER
Status: ACTIVE
Tenant: Ambiente Interno
```

Nunca expor `passwordHash` em nenhuma resposta.

---

## Regras de Arquitetura

Use uma Clean Architecture simplificada por módulos NestJS.

### Back-end

Cada módulo deve seguir preferencialmente esta estrutura:

```text
module
controller
service
dto
guards/decorators quando aplicável
```

Controllers devem ser finos.

A lógica de negócio deve ficar nos services.

Nunca colocar regra complexa diretamente no controller.

Nunca acessar banco diretamente fora de services ou providers próprios.

Usar `PrismaService` para acesso ao banco.

### Front-end

Evitar lógica duplicada nas páginas.

Centralizar chamadas HTTP em helpers ou libs.

Usar componentes reutilizáveis quando fizer sentido.

Evitar bibliotecas pesadas de UI neste momento.

Priorizar CSS limpo, responsivo e corporativo.

---

## Regras de Segurança

Obrigatório:

* usar `JwtAuthGuard` em todas as rotas protegidas;
* usar `RolesGuard` nas rotas administrativas;
* validar DTOs com `class-validator`;
* nunca aceitar `tenantId` vindo do body;
* nunca aceitar `userId`, `authorId`, `requesterId` ou `uploadedById` vindo do body quando esses dados devem vir do token;
* nunca retornar `passwordHash`;
* nunca buscar dados de negócio sem filtro por `tenantId`;
* validar se usuários relacionados pertencem ao mesmo `tenantId`;
* validar se projetos, tarefas, ordens de serviço, comentários e anexos pertencem ao mesmo `tenantId`;
* registrar `AuditLog` em eventos sensíveis;
* evitar path traversal em downloads/uploads;
* não usar `npm audit fix --force` sem autorização explícita.

---

## Regras de Multi-Tenant

Toda entidade de negócio deve respeitar `tenantId`.

Nunca fazer consultas como:

```ts
findMany()
findFirst()
findUnique()
```

sem validar isolamento por tenant quando a entidade for relacionada ao negócio do usuário.

Preferir:

```ts
where: {
  id,
  tenantId: user.tenantId
}
```

ou equivalente.

Usuários comuns não podem ver dados de outros usuários, salvo quando a regra de negócio permitir explicitamente.

---

## Perfis de Acesso

Usar os enums reais do Prisma.

Roles principais esperadas:

```text
OWNER
ADMIN
MANAGER
MEMBER
REQUESTER
```

Regras gerais:

```text
OWNER: acesso máximo ao tenant
ADMIN: acesso administrativo ao tenant
MANAGER: gestão operacional de projetos, OS e tarefas
MEMBER: acesso aos próprios projetos/tarefas ou itens atribuídos
REQUESTER: abertura e acompanhamento das próprias ordens de serviço
```

Sempre conferir os valores reais no `schema.prisma` antes de implementar regras.

---

## Enums Importantes

Sempre verificar os enums reais no `schema.prisma`.

Já observados no projeto:

### ProjectStatus

```text
PLANNED
IN_PROGRESS
PAUSED
COMPLETED
CANCELED
```

Não usar `PLANNING`.

### TaskStatus

```text
PLANNED
TODO
DOING
DONE
CANCELED
```

Não usar `IN_PROGRESS` para tarefas.

### Priority

Valores devem ser conferidos no schema antes de uso, mas exemplos já usados:

```text
LOW
MEDIUM
HIGH
```

---

## Regras por Módulo

### Auth

* login com email/senha;
* validar usuário ativo;
* validar tenant ativo;
* gerar JWT;
* atualizar `lastLoginAt`;
* registrar AuditLog de login;
* `/api/auth/me` deve retornar o usuário autenticado sem dados sensíveis.

### Users

* `/api/users/me` retorna usuário logado;
* `/api/users` apenas OWNER/ADMIN;
* sempre filtrar por tenant;
* nunca retornar `passwordHash`.

### Service Orders

Toda OS deve ter:

```text
tenantId
requesterId
status inicial OPEN
priority padrão MEDIUM quando aplicável
```

Regras:

* requester vê apenas suas OS;
* OWNER/ADMIN/MANAGER visualizam OS do tenant;
* MEMBER visualiza OS criada por ele ou atribuída a ele;
* atualização administrativa deve respeitar roles;
* mudança de status deve registrar AuditLog.

### Comments

Comentários devem:

* usar `authorId` do token;
* usar `tenantId` do token;
* validar acesso ao recurso comentado;
* inicialmente suportar bem `SERVICE_ORDER`;
* nunca aceitar `authorId` pelo body.

### Attachments

Anexos devem:

* usar upload seguro;
* validar extensão e tamanho;
* impedir path traversal;
* salvar metadados no banco;
* respeitar permissão sobre o recurso;
* baixar arquivo somente se usuário tiver acesso.

### Projects

Projetos devem:

* usar `tenantId` do token;
* ter owner;
* se `ownerId` não for informado, usar o usuário logado;
* somente OWNER/ADMIN/MANAGER podem definir outro owner;
* usuário comum vê apenas projetos próprios ou relacionados.

### Tasks

Tarefas devem:

* pertencer a um projeto;
* validar projeto por tenant;
* validar assignee por tenant;
* respeitar permissões de owner/assignee/gestor;
* usar status real do schema:

  * `TODO`
  * `DOING`
  * `DONE`
  * etc.

### Daily Logs

Registros diários devem:

* usar `authorId`/`userId` do token conforme schema;
* usar `tenantId` do token;
* validar vínculo com projeto/tarefa;
* respeitar permissão por papel, owner ou assignee;
* não aceitar campos inexistentes no schema.

---

## Branding Oficial

Nome do sistema:

```text
Orbyto
```

Subtítulo:

```text
Plataforma de Gestão de Projetos e Ordens de Serviço
```

Logo principal:

```text
apps/web/public/orbyto-logo.png
```

Símbolo/ícone:

```text
apps/web/public/orbyto-symbol.png
```

Se os arquivos não existirem, não inventar caminho alternativo sem confirmar.

---

## Paleta Visual Orbyto

Usar como referência visual:

```text
Roxo principal: #6D4CFF
Roxo secundário: #8B5CF6
Coral/Laranja principal: #FF6B4A
Coral secundário: #FF7A59
Sidebar escura: #0F172A
Fundo escuro: #111827
Texto principal: #0F172A
Texto secundário: #64748B
Fundo claro: #F8FAFC
Borda suave: #E5E7EB
```

Gradiente de marca sugerido:

```css
linear-gradient(135deg, #6D4CFF 0%, #8B5CF6 45%, #FF6B4A 100%)
```

Direção visual:

```text
corporativo
moderno
limpo
sofisticado
responsivo
sem poluição visual
```

Evitar aparência genérica ou infantilizada.

---

## Regras de UI/UX

### Layout

* sidebar escura;
* logo Orbyto no topo;
* topbar clara e limpa;
* área principal com fundo suave;
* cards com bordas sutis e sombras leves;
* botões com boa hierarquia visual;
* badges de status e prioridade bem legíveis;
* telas responsivas.

### Escrita

Corrigir textos com acentuação quebrada.

Atenção para palavras como:

```text
serviço
gestão
usuário
ordem
descrição
criação
atualização
pendência
```

Se o caractere `?` vier de texto fixo do front-end, corrigir no código.

Se o caractere `?` vier de dado já salvo no banco, documentar que o registro antigo precisa ser corrigido/recriado.

Não tentar “adivinhar” automaticamente dados corrompidos persistidos no banco.

---

## Padrão de Resposta do Codex

Ao finalizar uma tarefa, sempre informar:

```text
- arquivos criados
- arquivos alterados
- comandos executados
- resultado do typecheck/build
- rotas criadas ou alteradas, quando houver
- pontos pendentes
- riscos identificados
```

Quando houver erro:

```text
- explicar causa provável
- indicar arquivo/linha quando possível
- propor correção objetiva
```

---

## Git

Antes de grandes alterações, verificar:

```powershell
git status
```

Após bloco funcional validado:

```powershell
git add .
git commit -m "mensagem objetiva"
```

Mensagens sugeridas:

```text
feat: add users module and role-based access control
feat: add service orders module
feat: add comments module
feat: add attachments module
feat: add projects module
feat: add tasks module
feat: add daily logs module
feat: add frontend base
style: apply orbyto branding
```

Não fazer commits gigantes misturando back-end, front-end e schema sem necessidade.

---

## Testes e Validação

Sempre que alterar API:

```powershell
npm run build --workspace apps/api
npm run start:dev --workspace apps/api
```

Sempre que alterar front-end:

```powershell
npm run typecheck --workspace apps/web
npm run build --workspace apps/web
npm run dev --workspace apps/web
```

Se a porta estiver ocupada:

```powershell
netstat -ano | findstr :3000
taskkill /PID NUMERO_DO_PID /F
```

Para API:

```powershell
netstat -ano | findstr :3001
taskkill /PID NUMERO_DO_PID /F
```

---

## Restrições Importantes

Não fazer sem autorização explícita:

```text
- alterar migrations antigas
- apagar banco
- apagar volume Docker
- rodar npm audit fix --force
- trocar stack principal
- instalar biblioteca pesada de UI
- alterar schema.prisma sem tarefa específica
- mexer em autenticação de forma ampla sem necessidade
- remover módulos já funcionais
```

---

## Prioridade de Desenvolvimento

A sequência preferencial do projeto é:

```text
1. estabilizar branding Orbyto
2. lapidar login, sidebar e dashboard
3. tela detalhada de Ordens de Serviço
4. comentários na OS
5. anexos na OS
6. tela detalhada de Projeto
7. tarefas em formato Kanban
8. registros diários por projeto/tarefa
9. usuários e permissões
10. ajustes de schema necessários
11. deploy em VPS
12. backups, logs e hardening
```

---

## Próxima Tarefa Recomendada

Aplicar branding completo do Orbyto no front-end:

* trocar nome do sistema;
* usar logo;
* aplicar paleta oficial;
* corrigir textos quebrados;
* lapidar login/sidebar/topbar/dashboard;
* manter funcionalidades atuais funcionando.

````

Depois de salvar, o próximo comando para o Codex pode ser:

```powershell
codex "Leia o AGENTS.md e aplique o branding oficial Orbyto no front-end, usando as imagens em apps/web/public/orbyto-logo.png e apps/web/public/orbyto-symbol.png. Corrija textos fixos com acentuação quebrada, aplique a paleta visual oficial, atualize nome, metadata, login, sidebar, topbar e telas internas. Não altere back-end nem schema.prisma."
````
