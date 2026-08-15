# Tarefa Codex — ServiceOrdersModule

Você está trabalhando no projeto Gestão de Projetos Web.

Antes de alterar arquivos, leia:

- CODEX_CONTEXT.md
- TASK_USERS_ROLES.md
- package.json
- apps/api/src/app.module.ts
- apps/api/src/auth/*
- apps/api/src/users/*
- apps/api/src/prisma/*
- packages/database/prisma/schema.prisma

## Objetivo

Criar o módulo de Ordens de Serviço no back-end NestJS.

Este módulo será usado inicialmente por usuários internos e solicitantes para registrar, acompanhar e administrar ordens de serviço.

## Escopo obrigatório

### 1. Criar módulo ServiceOrders

Criar a estrutura:

- apps/api/src/service-orders/service-orders.module.ts
- apps/api/src/service-orders/service-orders.service.ts
- apps/api/src/service-orders/service-orders.controller.ts

Criar DTOs:

- apps/api/src/service-orders/dto/create-service-order.dto.ts
- apps/api/src/service-orders/dto/update-service-order.dto.ts
- apps/api/src/service-orders/dto/list-service-orders-query.dto.ts

### 2. Rotas esperadas

Criar as seguintes rotas:

#### POST /api/service-orders

Cria uma nova ordem de serviço.

Regras:

- rota autenticada;
- qualquer usuário autenticado pode criar;
- usar requesterId do usuário logado;
- usar tenantId do usuário logado;
- status inicial deve ser OPEN;
- priority pode ser informada, mas se não vier, usar MEDIUM;
- não aceitar requesterId vindo do body;
- não aceitar tenantId vindo do body.

Campos aceitos no body:

- title: obrigatório;
- description: obrigatório;
- category: opcional;
- system: opcional;
- unit: opcional;
- channel: opcional;
- origin: opcional;
- tags: opcional;
- priority: opcional;
- dueDate: opcional.

#### GET /api/service-orders/my

Lista ordens de serviço criadas pelo usuário logado.

Regras:

- rota autenticada;
- filtrar por tenantId;
- filtrar por requesterId;
- permitir filtros opcionais por status, priority, system e texto;
- ordenar por createdAt desc.

#### GET /api/service-orders

Lista ordens de serviço do tenant.

Regras:

- rota autenticada;
- permitida apenas para OWNER, ADMIN e MANAGER;
- filtrar sempre por tenantId;
- permitir filtros opcionais por status, priority, requesterId, responsibleId, system e texto;
- ordenar por createdAt desc.

#### GET /api/service-orders/:id

Busca uma ordem de serviço por id.

Regras:

- rota autenticada;
- filtrar sempre por tenantId;
- OWNER, ADMIN e MANAGER podem visualizar qualquer OS do tenant;
- REQUESTER pode visualizar apenas OS criada por ele;
- MEMBER pode visualizar OS criada por ele ou atribuída a ele como responsável;
- retornar dados básicos do solicitante e responsável;
- não retornar passwordHash.

#### PATCH /api/service-orders/:id

Atualiza uma ordem de serviço.

Regras:

- rota autenticada;
- permitida apenas para OWNER, ADMIN e MANAGER;
- filtrar sempre por tenantId;
- permitir atualizar:
  - title;
  - description;
  - category;
  - system;
  - unit;
  - channel;
  - origin;
  - tags;
  - priority;
  - status;
  - responsibleId;
  - dueDate;
  - observation.
- validar se responsibleId, quando informado, pertence ao mesmo tenantId.
- se status for COMPLETED, preencher finishedAt se ainda estiver vazio.
- se status sair de COMPLETED para outro status, limpar finishedAt.
- registrar AuditLog de UPDATE ou STATUS_CHANGE quando houver mudança de status.

### 3. DTOs e validação

Usar class-validator e class-transformer.

Validar enums usando:

- Priority
- ServiceOrderStatus

Não aceitar campos extras por causa do ValidationPipe global.

### 4. Segurança e arquitetura

Regras obrigatórias:

- usar JwtAuthGuard em todas as rotas;
- usar RolesGuard nas rotas administrativas;
- nunca acessar ServiceOrder sem tenantId;
- nunca confiar em tenantId, requesterId ou responsibleId vindo do body sem validar;
- controllers devem ser finos;
- regras de negócio devem ficar no ServiceOrdersService;
- não alterar schema.prisma nesta tarefa;
- não alterar migrations antigas;
- registrar ServiceOrdersModule no AppModule;
- não criar front-end;
- não usar npm audit fix --force.

### 5. Critérios de aceite

A tarefa estará concluída quando:

- `npm run start:dev --workspace apps/api` compilar sem erro;
- a API mapear:
  - POST /api/service-orders
  - GET /api/service-orders/my
  - GET /api/service-orders
  - GET /api/service-orders/:id
  - PATCH /api/service-orders/:id
- POST /api/service-orders criar uma OS com tenantId e requesterId do usuário logado;
- GET /api/service-orders/my retornar apenas OS do usuário logado;
- GET /api/service-orders funcionar para OWNER;
- GET /api/service-orders sem token retornar 401;
- GET /api/service-orders com usuário sem role administrativa retornar 403;
- GET /api/service-orders/:id respeitar regras de visibilidade;
- PATCH /api/service-orders/:id funcionar para OWNER/ADMIN/MANAGER;
- PATCH /api/service-orders/:id bloquear REQUESTER com 403.

### 6. Ao finalizar

Explique:

- arquivos criados;
- arquivos alterados;
- rotas criadas;
- comandos para testar;
- se algum ponto ficou pendente.