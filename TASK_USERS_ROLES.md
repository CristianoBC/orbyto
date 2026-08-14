# Tarefa Codex — UsersModule e controle por roles

Você está trabalhando no projeto Gestão de Projetos Web.

Antes de alterar arquivos, leia:

- CODEX_CONTEXT.md
- package.json
- apps/api/src/app.module.ts
- apps/api/src/auth/*
- apps/api/src/prisma/*
- packages/database/prisma/schema.prisma

## Objetivo

Criar o módulo Users e implementar controle de autorização por roles no back-end NestJS.

## Escopo obrigatório

### 1. Criar módulo Users

Criar os arquivos:

- apps/api/src/users/users.module.ts
- apps/api/src/users/users.service.ts
- apps/api/src/users/users.controller.ts

### 2. Criar suporte a roles

Criar os arquivos:

- apps/api/src/auth/decorators/roles.decorator.ts
- apps/api/src/auth/guards/roles.guard.ts

Usar o enum `UserRole` vindo de `@prisma/client`.

### 3. Rotas esperadas

Criar:

#### GET /api/users/me

Regras:

- rota autenticada;
- usa JwtAuthGuard;
- retorna os dados do usuário logado;
- não retorna passwordHash;
- deve buscar o usuário usando id e tenantId do token.

#### GET /api/users

Regras:

- rota autenticada;
- usa JwtAuthGuard;
- usa RolesGuard;
- permitida apenas para OWNER e ADMIN;
- lista apenas usuários do mesmo tenantId do usuário autenticado;
- não retorna passwordHash;
- ordenar por createdAt desc.

### 4. Regras obrigatórias

- Controllers devem ser finos.
- Regras de negócio devem ficar em UsersService.
- Nunca buscar usuários sem filtro por tenantId.
- Nunca retornar passwordHash.
- Não alterar schema.prisma nesta tarefa.
- Não alterar migrations antigas.
- Registrar UsersModule no AppModule.
- Se precisar ajustar imports no AuthModule, faça apenas o mínimo necessário.
- Não usar npm audit fix --force.
- Não criar front-end nesta tarefa.

### 5. Critérios de aceite

A tarefa estará concluída quando:

- `npm run start:dev --workspace apps/api` compilar sem erro;
- a API mapear as rotas:
  - GET /api/users/me
  - GET /api/users
- GET /api/users/me com Bearer token retornar o usuário logado;
- GET /api/users com Bearer token de OWNER retornar a lista de usuários do tenant;
- rotas sem token retornarem 401;
- usuário autenticado sem role OWNER/ADMIN receber 403 em GET /api/users.

### 6. Ao finalizar

Explique:

- arquivos criados;
- arquivos alterados;
- comandos para testar;
- se algum ponto ficou pendente.