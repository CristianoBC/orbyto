# Tarefa Codex — TasksModule

Você está trabalhando no projeto Gestão de Projetos Web.

Antes de alterar arquivos, leia:

- CODEX_CONTEXT.md
- TASK_USERS_ROLES.md
- TASK_SERVICE_ORDERS.md
- TASK_COMMENTS.md
- TASK_PROJECTS.md
- package.json
- apps/api/src/app.module.ts
- apps/api/src/auth/*
- apps/api/src/users/*
- apps/api/src/projects/*
- apps/api/src/prisma/*
- packages/database/prisma/schema.prisma

## Objetivo

Criar o módulo de Tarefas no back-end NestJS.

As tarefas pertencem a projetos e serão usadas para controle de execução, acompanhamento e futura visualização em Kanban.

## Escopo obrigatório

### 1. Criar módulo Tasks

Criar:

- apps/api/src/tasks/tasks.module.ts
- apps/api/src/tasks/tasks.service.ts
- apps/api/src/tasks/tasks.controller.ts

Criar DTOs:

- apps/api/src/tasks/dto/create-task.dto.ts
- apps/api/src/tasks/dto/update-task.dto.ts
- apps/api/src/tasks/dto/list-tasks-query.dto.ts

### 2. Rotas esperadas

#### POST /api/tasks

Cria uma tarefa.

Regras:

- rota autenticada;
- usar JwtAuthGuard;
- projectId obrigatório;
- validar se o projeto pertence ao mesmo tenantId;
- OWNER, ADMIN e MANAGER podem criar tarefa em qualquer projeto do tenant;
- owner do projeto pode criar tarefa no próprio projeto;
- usuário comum não-owner não pode criar tarefa;
- se assigneeId for informado, validar que pertence ao mesmo tenantId;
- se assigneeId não for informado, pode ficar null;
- status inicial, se não informado, deve ser TODO;
- priority, se não informado, deve ser MEDIUM;
- não aceitar tenantId vindo do body;
- registrar AuditLog com action CREATE.

Campos aceitos:

- projectId: obrigatório;
- title: obrigatório;
- description: opcional;
- assigneeId: opcional;
- priority: opcional;
- status: opcional;
- dueDate: opcional;
- tags: opcional.

#### GET /api/tasks/my

Lista tarefas atribuídas ao usuário logado.

Regras:

- rota autenticada;
- filtrar por tenantId;
- filtrar por assigneeId do usuário logado;
- permitir filtros por status, priority, projectId e texto;
- ordenar por createdAt desc.

#### GET /api/tasks/project/:projectId

Lista tarefas de um projeto.

Regras:

- rota autenticada;
- validar projeto por tenantId;
- OWNER, ADMIN e MANAGER podem listar tarefas de qualquer projeto do tenant;
- owner do projeto pode listar tarefas do próprio projeto;
- usuário comum pode listar se tiver ao menos uma tarefa atribuída a ele nesse projeto;
- filtrar sempre por tenantId e projectId;
- permitir filtros por status, priority, assigneeId e texto;
- ordenar por createdAt desc.

#### GET /api/tasks/:id

Busca uma tarefa por id.

Regras:

- rota autenticada;
- filtrar sempre por tenantId;
- OWNER, ADMIN e MANAGER podem visualizar qualquer tarefa do tenant;
- owner do projeto pode visualizar tarefas do projeto;
- assignee da tarefa pode visualizar a tarefa;
- retornar dados básicos de project e assignee;
- nunca retornar passwordHash.

#### PATCH /api/tasks/:id

Atualiza uma tarefa.

Regras:

- rota autenticada;
- filtrar sempre por tenantId;
- OWNER, ADMIN e MANAGER podem atualizar qualquer tarefa do tenant;
- owner do projeto pode atualizar tarefa do projeto;
- assignee pode atualizar apenas status e observações, se houver campo compatível no schema;
- validar assigneeId, se informado, dentro do mesmo tenantId;
- permitir atualizar campos existentes no schema:
  - title;
  - description;
  - assigneeId;
  - priority;
  - status;
  - dueDate;
  - tags.
- se status for DONE ou COMPLETED, preencher completedAt se esse campo existir no schema;
- se status sair de DONE/COMPLETED, limpar completedAt se esse campo existir no schema;
- registrar AuditLog com action UPDATE ou STATUS_CHANGE quando houver mudança de status.

### 3. DTOs e validação

Usar class-validator e class-transformer.

Usar enums reais do @prisma/client, conforme existirem no schema:

- TaskStatus
- Priority

Validações mínimas:

- title: string obrigatória, mínimo 3, máximo 180;
- description: string opcional, máximo 5000;
- projectId: string obrigatória;
- assigneeId: string opcional;
- tags: array opcional de strings;
- dueDate: data opcional transformada para Date.

Não aceitar campos extras por causa do ValidationPipe global.

### 4. Segurança e arquitetura

Regras obrigatórias:

- usar JwtAuthGuard em todas as rotas;
- nunca acessar Task sem tenantId;
- nunca acessar Project sem tenantId;
- nunca buscar usuários sem tenantId;
- nunca retornar passwordHash;
- controllers devem ser finos;
- regras de negócio devem ficar em TasksService;
- não alterar schema.prisma nesta tarefa;
- não alterar migrations antigas;
- registrar TasksModule no AppModule;
- não criar front-end;
- não usar npm audit fix --force.

### 5. Critérios de aceite

A tarefa estará concluída quando:

- npm run start:dev --workspace apps/api compilar sem erro;
- a API mapear:
  - POST /api/tasks
  - GET /api/tasks/my
  - GET /api/tasks/project/:projectId
  - GET /api/tasks/:id
  - PATCH /api/tasks/:id
- POST /api/tasks criar tarefa vinculada a projeto do tenant;
- GET /api/tasks/my retornar tarefas atribuídas ao usuário logado;
- GET /api/tasks/project/:projectId respeitar permissão;
- GET /api/tasks/:id respeitar permissão;
- PATCH /api/tasks/:id respeitar permissão;
- rotas sem token retornarem 401.

### 6. Ao finalizar

Explique:

- arquivos criados;
- arquivos alterados;
- rotas criadas;
- comandos para testar;
- se algum ponto ficou pendente.