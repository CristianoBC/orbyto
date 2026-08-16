# Tarefa Codex — DailyLogsModule

Você está trabalhando no projeto Gestão de Projetos Web.

Antes de alterar arquivos, leia:

- CODEX_CONTEXT.md
- TASK_USERS_ROLES.md
- TASK_SERVICE_ORDERS.md
- TASK_COMMENTS.md
- TASK_PROJECTS.md
- TASK_TASKS.md
- package.json
- apps/api/src/app.module.ts
- apps/api/src/auth/*
- apps/api/src/users/*
- apps/api/src/projects/*
- apps/api/src/tasks/*
- apps/api/src/prisma/*
- packages/database/prisma/schema.prisma

## Objetivo

Criar o módulo de Registros Diários no back-end NestJS.

Os registros diários serão usados para documentar avanços, pendências, impedimentos, decisões e observações relacionadas a projetos e tarefas.

## Escopo obrigatório

### 1. Criar módulo DailyLogs

Criar:

- apps/api/src/daily-logs/daily-logs.module.ts
- apps/api/src/daily-logs/daily-logs.service.ts
- apps/api/src/daily-logs/daily-logs.controller.ts

Criar DTOs:

- apps/api/src/daily-logs/dto/create-daily-log.dto.ts
- apps/api/src/daily-logs/dto/update-daily-log.dto.ts
- apps/api/src/daily-logs/dto/list-daily-logs-query.dto.ts

### 2. Rotas esperadas

#### POST /api/daily-logs

Cria um registro diário.

Regras:

- rota autenticada;
- usar JwtAuthGuard;
- usar tenantId do usuário logado;
- usar authorId do usuário logado;
- não aceitar tenantId vindo do body;
- não aceitar authorId vindo do body;
- pode estar vinculado a projectId, taskId, ou ambos;
- deve validar que projectId, quando informado, pertence ao mesmo tenantId;
- deve validar que taskId, quando informado, pertence ao mesmo tenantId;
- se taskId for informado e projectId também, validar que a tarefa pertence ao projeto informado;
- OWNER, ADMIN e MANAGER podem criar log em qualquer projeto/tarefa do tenant;
- owner do projeto pode criar log no próprio projeto;
- assignee da tarefa pode criar log na própria tarefa;
- usuário comum sem vínculo com o projeto/tarefa não pode criar log;
- registrar AuditLog com action CREATE.

Campos aceitos no body:

- projectId: opcional;
- taskId: opcional;
- title: obrigatório;
- content: obrigatório;
- type: opcional;
- logDate: opcional;
- workedHours: opcional;
- blockers: opcional;
- nextSteps: opcional.

Se o schema não possuir algum desses campos, implementar somente os campos existentes e bloquear campos inexistentes com validação coerente.

#### GET /api/daily-logs/my

Lista registros diários criados pelo usuário logado.

Regras:

- rota autenticada;
- filtrar sempre por tenantId;
- filtrar por authorId do usuário logado;
- permitir filtros por projectId, taskId, type e período de datas;
- ordenar por logDate desc e createdAt desc.

#### GET /api/daily-logs/project/:projectId

Lista registros de um projeto.

Regras:

- rota autenticada;
- validar projeto por tenantId;
- OWNER, ADMIN e MANAGER podem listar logs de qualquer projeto do tenant;
- owner do projeto pode listar logs do próprio projeto;
- usuário comum pode listar se tiver tarefa atribuída nesse projeto;
- filtrar sempre por tenantId e projectId;
- ordenar por logDate desc e createdAt desc;
- retornar dados básicos do autor;
- nunca retornar passwordHash.

#### GET /api/daily-logs/task/:taskId

Lista registros de uma tarefa.

Regras:

- rota autenticada;
- validar tarefa por tenantId;
- OWNER, ADMIN e MANAGER podem listar logs de qualquer tarefa do tenant;
- owner do projeto da tarefa pode listar;
- assignee da tarefa pode listar;
- filtrar sempre por tenantId e taskId;
- ordenar por logDate desc e createdAt desc;
- retornar dados básicos do autor;
- nunca retornar passwordHash.

#### GET /api/daily-logs/:id

Busca um registro diário por id.

Regras:

- rota autenticada;
- filtrar sempre por tenantId;
- respeitar permissão com base no projeto/tarefa vinculados;
- retornar dados básicos de author, project e task;
- nunca retornar passwordHash.

#### PATCH /api/daily-logs/:id

Atualiza um registro diário.

Regras:

- rota autenticada;
- filtrar sempre por tenantId;
- OWNER, ADMIN e MANAGER podem atualizar qualquer log do tenant;
- author do log pode atualizar seu próprio log;
- outros usuários não podem atualizar;
- permitir atualizar apenas campos existentes no schema;
- registrar AuditLog com action UPDATE.

### 3. DTOs e validação

Usar class-validator e class-transformer.

Validações mínimas:

- title: string obrigatória, mínimo 3, máximo 180;
- content: string obrigatória, mínimo 3, máximo 10000;
- projectId: string opcional;
- taskId: string opcional;
- type: string/enum opcional conforme schema;
- logDate: data opcional transformada para Date;
- workedHours: número opcional, mínimo 0, máximo 24;
- blockers: string opcional, máximo 5000;
- nextSteps: string opcional, máximo 5000.

Não aceitar campos extras por causa do ValidationPipe global.

### 4. Segurança e arquitetura

Regras obrigatórias:

- usar JwtAuthGuard em todas as rotas;
- nunca acessar DailyLog sem tenantId;
- nunca acessar Project sem tenantId;
- nunca acessar Task sem tenantId;
- nunca buscar usuários sem tenantId;
- nunca retornar passwordHash;
- controllers devem ser finos;
- regras de negócio devem ficar em DailyLogsService;
- não alterar schema.prisma nesta tarefa;
- não alterar migrations antigas;
- registrar DailyLogsModule no AppModule;
- não criar front-end;
- não usar npm audit fix --force.

### 5. Critérios de aceite

A tarefa estará concluída quando:

- npm run start:dev --workspace apps/api compilar sem erro;
- a API mapear:
  - POST /api/daily-logs
  - GET /api/daily-logs/my
  - GET /api/daily-logs/project/:projectId
  - GET /api/daily-logs/task/:taskId
  - GET /api/daily-logs/:id
  - PATCH /api/daily-logs/:id
- POST /api/daily-logs criar registro vinculado a projeto/tarefa do tenant;
- GET /api/daily-logs/my retornar registros do usuário logado;
- GET /api/daily-logs/project/:projectId respeitar permissão;
- GET /api/daily-logs/task/:taskId respeitar permissão;
- GET /api/daily-logs/:id respeitar permissão;
- PATCH /api/daily-logs/:id respeitar permissão;
- rotas sem token retornarem 401.

### 6. Ao finalizar

Explique:

- arquivos criados;
- arquivos alterados;
- rotas criadas;
- comandos para testar;
- se algum ponto ficou pendente.