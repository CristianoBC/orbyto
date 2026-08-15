# Tarefa Codex — CommentsModule

Você está trabalhando no projeto Gestão de Projetos Web.

Antes de alterar arquivos, leia:

- CODEX_CONTEXT.md
- TASK_USERS_ROLES.md
- TASK_SERVICE_ORDERS.md
- package.json
- apps/api/src/app.module.ts
- apps/api/src/auth/*
- apps/api/src/users/*
- apps/api/src/service-orders/*
- apps/api/src/prisma/*
- packages/database/prisma/schema.prisma

## Objetivo

Criar o módulo de Comentários no back-end NestJS.

Inicialmente, os comentários serão usados principalmente nas Ordens de Serviço para registrar histórico de tratativas, atualizações e interações entre solicitante e equipe responsável.

## Escopo obrigatório

### 1. Criar módulo Comments

Criar a estrutura:

- apps/api/src/comments/comments.module.ts
- apps/api/src/comments/comments.service.ts
- apps/api/src/comments/comments.controller.ts

Criar DTOs:

- apps/api/src/comments/dto/create-comment.dto.ts
- apps/api/src/comments/dto/list-comments-query.dto.ts

### 2. Rotas esperadas

Criar as seguintes rotas:

#### POST /api/comments

Cria um novo comentário.

Regras:

- rota autenticada;
- usar JwtAuthGuard;
- usar authorId do usuário logado;
- usar tenantId do usuário logado;
- não aceitar authorId vindo do body;
- não aceitar tenantId vindo do body;
- aceitar refType e refId no body;
- neste momento, implementar validação funcional para refType SERVICE_ORDER;
- se refType for diferente de SERVICE_ORDER, retornar BadRequestException informando que ainda não está implementado;
- antes de criar comentário para SERVICE_ORDER, validar se a OS existe no mesmo tenantId;
- respeitar regra de visibilidade da OS:
  - OWNER, ADMIN e MANAGER podem comentar qualquer OS do tenant;
  - REQUESTER pode comentar apenas OS criada por ele;
  - MEMBER pode comentar OS criada por ele ou atribuída a ele como responsibleId.
- registrar AuditLog com action COMMENT.

Campos aceitos no body:

- refType: obrigatório;
- refId: obrigatório;
- text: obrigatório.

#### GET /api/comments/service-order/:serviceOrderId

Lista comentários de uma Ordem de Serviço.

Regras:

- rota autenticada;
- usar JwtAuthGuard;
- filtrar sempre por tenantId;
- validar se a OS existe no mesmo tenantId;
- respeitar regra de visibilidade da OS:
  - OWNER, ADMIN e MANAGER podem visualizar comentários de qualquer OS do tenant;
  - REQUESTER pode visualizar comentários apenas de OS criada por ele;
  - MEMBER pode visualizar comentários de OS criada por ele ou atribuída a ele como responsibleId.
- ordenar por createdAt asc;
- retornar dados básicos do autor;
- nunca retornar passwordHash.

### 3. DTOs e validação

Usar class-validator e class-transformer.

Validar:

- refType usando enum RefType do @prisma/client;
- refId como string obrigatória;
- text como string obrigatória com tamanho mínimo 1 e máximo 5000.

Não aceitar campos extras por causa do ValidationPipe global.

### 4. Segurança e arquitetura

Regras obrigatórias:

- usar JwtAuthGuard em todas as rotas;
- nunca acessar Comment sem tenantId;
- nunca acessar ServiceOrder sem tenantId;
- nunca retornar passwordHash;
- controllers devem ser finos;
- regras de negócio devem ficar em CommentsService;
- não alterar schema.prisma nesta tarefa;
- não alterar migrations antigas;
- registrar CommentsModule no AppModule;
- não criar front-end;
- não usar npm audit fix --force.

### 5. Critérios de aceite

A tarefa estará concluída quando:

- `npm run start:dev --workspace apps/api` compilar sem erro;
- a API mapear:
  - POST /api/comments
  - GET /api/comments/service-order/:serviceOrderId
- POST /api/comments criar comentário em uma OS existente;
- GET /api/comments/service-order/:serviceOrderId listar comentários da OS;
- rotas sem token retornarem 401;
- comentário em OS inexistente retornar 404;
- comentário em refType ainda não implementado retornar 400;
- usuário sem permissão para visualizar/comentar a OS receber 403.

### 6. Ao finalizar

Explique:

- arquivos criados;
- arquivos alterados;
- rotas criadas;
- comandos para testar;
- se algum ponto ficou pendente.