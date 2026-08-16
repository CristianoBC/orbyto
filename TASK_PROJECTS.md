# Tarefa Codex — ProjectsModule

Você está trabalhando no projeto Gestão de Projetos Web.

Antes de alterar arquivos, leia:

- CODEX_CONTEXT.md
- TASK_USERS_ROLES.md
- TASK_SERVICE_ORDERS.md
- TASK_COMMENTS.md
- TASK_ATTACHMENTS.md, se existir
- package.json
- apps/api/src/app.module.ts
- apps/api/src/auth/*
- apps/api/src/users/*
- apps/api/src/service-orders/*
- apps/api/src/comments/*
- apps/api/src/attachments/*, se existir
- apps/api/src/prisma/*
- packages/database/prisma/schema.prisma

## Objetivo

Criar o módulo de Projetos no back-end NestJS.

O módulo deve permitir que usuários criem e acompanhem seus próprios projetos, enquanto perfis administrativos conseguem visualizar e gerir todos os projetos do mesmo tenant.

## Escopo obrigatório

### 1. Criar módulo Projects

Criar a estrutura:

- apps/api/src/projects/projects.module.ts
- apps/api/src/projects/projects.service.ts
- apps/api/src/projects/projects.controller.ts

Criar DTOs:

- apps/api/src/projects/dto/create-project.dto.ts
- apps/api/src/projects/dto/update-project.dto.ts
- apps/api/src/projects/dto/list-projects-query.dto.ts

### 2. Rotas esperadas

Criar as seguintes rotas:

#### POST /api/projects

Cria um novo projeto.

Regras:

- rota autenticada;
- usar JwtAuthGuard;
- qualquer usuário autenticado pode criar;
- usar tenantId do usuário logado;
- se ownerId não for informado, usar id do usuário logado;
- se ownerId for informado:
  - apenas OWNER, ADMIN e MANAGER podem definir outro ownerId;
  - validar se ownerId pertence ao mesmo tenantId;
- status inicial, se não informado, deve ser PLANNING;
- priority, se não informado, deve ser MEDIUM;
- não aceitar tenantId vindo do body.

Campos aceitos no body:

- name: obrigatório;
- description: opcional;
- objective: opcional;
- scope: opcional;
- department: opcional;
- unit: opcional;
- priority: opcional;
- status: opcional;
- ownerId: opcional;
- startDate: opcional;
- endDate: opcional;
- tags: opcional.

#### GET /api/projects/my

Lista projetos vinculados ao usuário logado.

Regras:

- rota autenticada;
- filtrar sempre por tenantId;
- retornar projetos onde:
  - ownerId é o usuário logado;
  - ou, se existir relação de tarefas, usuário é responsável por alguma tarefa do projeto;
- permitir filtros opcionais por status, priority, department, unit e texto;
- ordenar por createdAt desc;
- não retornar dados sensíveis.

#### GET /api/projects

Lista projetos do tenant.

Regras:

- rota autenticada;
- usar JwtAuthGuard;
- usar RolesGuard;
- permitida apenas para OWNER, ADMIN e MANAGER;
- filtrar sempre por tenantId;
- permitir filtros opcionais por status, priority, ownerId, department, unit e texto;
- ordenar por createdAt desc;
- retornar dados básicos do owner;
- nunca retornar passwordHash.

#### GET /api/projects/:id

Busca um projeto por id.

Regras:

- rota autenticada;
- filtrar sempre por tenantId;
- OWNER, ADMIN e MANAGER podem visualizar qualquer projeto do tenant;
- usuário comum pode visualizar somente projeto onde:
  - é owner;
  - ou possui tarefa vinculada a ele no projeto;
- retornar dados básicos do owner;
- retornar contadores básicos, se possível:
  - quantidade de tarefas;
  - quantidade de tarefas concluídas;
- nunca retornar passwordHash.

#### PATCH /api/projects/:id

Atualiza um projeto.

Regras:

- rota autenticada;
- filtrar sempre por tenantId;
- OWNER, ADMIN e MANAGER podem atualizar qualquer projeto do tenant;
- owner do projeto pode atualizar seu próprio projeto;
- usuário comum que não é owner não pode atualizar;
- permitir atualizar:
  - name;
  - description;
  - objective;
  - scope;
  - department;
  - unit;
  - priority;
  - status;
  - ownerId;
  - startDate;
  - endDate;
  - tags;
- se ownerId for alterado:
  - apenas OWNER, ADMIN e MANAGER podem alterar ownerId;
  - validar se novo ownerId pertence ao mesmo tenantId;
- se status for COMPLETED, preencher completedAt se ainda estiver vazio;
- se status sair de COMPLETED para outro status, limpar completedAt;
- registrar AuditLog com action UPDATE ou STATUS_CHANGE quando houver mudança de status.

### 3. DTOs e validação

Usar class-validator e class-transformer.

Validar enums usando os enums reais do `@prisma/client`.

Usar, conforme existirem no schema:

- ProjectStatus
- Priority

Validações mínimas:

- name: string obrigatória, mínimo 3, máximo 180;
- description: string opcional, máximo 5000;
- objective: string opcional, máximo 5000;
- scope: string opcional, máximo 5000;
- department: string opcional, máximo 180;
- unit: string opcional, máximo 180;
- ownerId: string opcional;
- tags: array opcional de strings;
- startDate/endDate: datas opcionais transformadas para Date;
- filtros de listagem opcionais.

Não aceitar campos extras por causa do ValidationPipe global.

### 4. Segurança e arquitetura

Regras obrigatórias:

- usar JwtAuthGuard em todas as rotas;
- usar RolesGuard nas rotas administrativas;
- nunca acessar Project sem tenantId;
- nunca buscar usuários sem tenantId;
- nunca retornar passwordHash;
- controllers devem ser finos;
- regras de negócio devem ficar em ProjectsService;
- não alterar schema.prisma nesta tarefa;
- não alterar migrations antigas;
- registrar ProjectsModule no AppModule;
- não criar front-end;
- não usar npm audit fix --force.

### 5. Critérios de aceite

A tarefa estará concluída quando:

- `npm run start:dev --workspace apps/api` compilar sem erro;
- a API mapear:
  - POST /api/projects
  - GET /api/projects/my
  - GET /api/projects
  - GET /api/projects/:id
  - PATCH /api/projects/:id
- POST /api/projects criar projeto com tenantId correto;
- GET /api/projects/my retornar projetos do usuário logado;
- GET /api/projects funcionar para OWNER/ADMIN/MANAGER;
- GET /api/projects sem token retornar 401;
- GET /api/projects com usuário sem role administrativa retornar 403;
- GET /api/projects/:id respeitar regra de visibilidade;
- PATCH /api/projects/:id respeitar permissões;
- alteração de status registrar AuditLog quando aplicável.

### 6. Ao finalizar

Explique:

- arquivos criados;
- arquivos alterados;
- rotas criadas;
- comandos para testar;
- se algum ponto ficou pendente.