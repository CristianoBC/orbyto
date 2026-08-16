# Tarefa Codex — Front-end Base Next.js

Você está trabalhando no projeto Gestão de Projetos Web.

Antes de alterar arquivos, leia:

- CODEX_CONTEXT.md
- package.json
- apps/api/src/app.module.ts
- apps/api/src/auth/*
- apps/api/src/users/*
- apps/api/src/projects/*
- apps/api/src/tasks/*
- apps/api/src/service-orders/*
- apps/api/src/daily-logs/*
- packages/database/prisma/schema.prisma

## Objetivo

Criar o front-end base da plataforma usando Next.js dentro de `apps/web`.

A aplicação deve consumir a API NestJS em `http://localhost:3001/api`.

## Stack desejada

- Next.js com App Router
- React
- TypeScript
- CSS moderno, limpo e corporativo
- Sem bibliotecas pesadas de UI neste momento
- Pode usar lucide-react para ícones
- Autenticação inicial com JWT salvo em localStorage
- Estrutura simples, organizada e escalável

## Escopo obrigatório

### 1. Configurar aplicação web

Criar/ajustar a aplicação em:

- apps/web

Se `apps/web` estiver vazio, criar estrutura Next.js manualmente.

Criar/ajustar:

- apps/web/package.json
- apps/web/next.config.ts ou next.config.js
- apps/web/tsconfig.json
- apps/web/src/app/layout.tsx
- apps/web/src/app/page.tsx
- apps/web/src/app/globals.css

A aplicação deve rodar em:

- http://localhost:3000

### 2. Criar camada de API

Criar:

- apps/web/src/lib/api.ts
- apps/web/src/lib/auth.ts
- apps/web/src/types/auth.ts
- apps/web/src/types/service-order.ts
- apps/web/src/types/project.ts
- apps/web/src/types/task.ts

Regras:

- centralizar `API_BASE_URL`;
- usar `NEXT_PUBLIC_API_URL`, com fallback para `http://localhost:3001/api`;
- criar helper para requisições autenticadas;
- tratar erro 401 removendo token local;
- não espalhar fetch diretamente pelas páginas sem necessidade.

### 3. Criar autenticação front-end

Criar:

- apps/web/src/contexts/auth-context.tsx
- apps/web/src/components/auth/protected-route.tsx

Funcionalidades:

- login usando `POST /api/auth/login`;
- salvar `accessToken` no localStorage;
- salvar dados básicos do usuário;
- carregar usuário logado usando `GET /api/auth/me`;
- logout;
- proteger páginas internas;
- redirecionar usuário não autenticado para `/login`.

### 4. Criar tela de login

Criar:

- apps/web/src/app/login/page.tsx

Requisitos:

- layout corporativo;
- campos e-mail e senha;
- botão de entrar;
- feedback de carregamento;
- feedback de erro;
- usar credenciais da API, sem mock;
- após login, redirecionar para `/dashboard`.

### 5. Criar layout interno

Criar:

- apps/web/src/app/(app)/layout.tsx
- apps/web/src/components/layout/sidebar.tsx
- apps/web/src/components/layout/topbar.tsx

Menu inicial:

- Dashboard
- Ordens de Serviço
- Projetos
- Tarefas
- Registros Diários
- Usuários

Regras:

- layout responsivo básico;
- visual moderno, limpo e corporativo;
- sidebar fixa no desktop;
- topbar com nome do usuário e botão sair.

### 6. Criar Dashboard inicial

Criar:

- apps/web/src/app/(app)/dashboard/page.tsx

Conteúdo:

- cards simples;
- boas-vindas com nome do usuário;
- atalhos para Ordens de Serviço, Projetos e Tarefas;
- sem necessidade de gráficos ainda.

### 7. Criar tela inicial de Ordens de Serviço

Criar:

- apps/web/src/app/(app)/service-orders/page.tsx

Funcionalidades:

- listar minhas OS usando `GET /api/service-orders/my`;
- botão para abrir modal ou formulário simples de nova OS;
- criar OS usando `POST /api/service-orders`;
- campos mínimos:
  - title;
  - description;
  - category;
  - system;
  - unit;
  - priority.
- após criar, recarregar lista;
- exibir status, prioridade e data de criação.

### 8. Criar tela inicial de Projetos

Criar:

- apps/web/src/app/(app)/projects/page.tsx

Funcionalidades:

- listar meus projetos usando `GET /api/projects/my`;
- criar projeto usando `POST /api/projects`;
- campos mínimos:
  - name;
  - description;
  - department;
  - unit;
  - priority;
  - status.
- usar status `PLANNED` como padrão;
- exibir status, prioridade e data de criação.

### 9. Criar tela inicial de Tarefas

Criar:

- apps/web/src/app/(app)/tasks/page.tsx

Funcionalidades:

- listar minhas tarefas usando `GET /api/tasks/my`;
- exibir título, projeto, prioridade, status e prazo;
- não precisa criar tarefa ainda se isso exigir seleção complexa de projeto; pode deixar botão “Nova tarefa” desabilitado ou com aviso.

### 10. Criar tela inicial de Registros Diários

Criar:

- apps/web/src/app/(app)/daily-logs/page.tsx

Funcionalidades:

- listar meus registros usando `GET /api/daily-logs/my`;
- exibir título, conteúdo/resumo, projeto/tarefa quando disponível e data;
- criação pode ficar para próxima tarefa.

### 11. Criar tela inicial de Usuários

Criar:

- apps/web/src/app/(app)/users/page.tsx

Funcionalidades:

- listar usuários usando `GET /api/users`;
- se API retornar 403, exibir mensagem amigável de sem permissão;
- exibir nome, e-mail, role e status;
- nunca exibir passwordHash.

## Regras de qualidade

- Código TypeScript limpo.
- Componentes pequenos e reutilizáveis quando fizer sentido.
- Evitar duplicação exagerada.
- Usar nomes claros.
- Não criar dependências desnecessárias.
- Não alterar o back-end nesta tarefa, salvo se for absolutamente necessário para integração.
- Não alterar schema.prisma.
- Não alterar migrations antigas.
- Não usar npm audit fix --force.

## Critérios de aceite

A tarefa estará concluída quando:

- `npm run dev --workspace apps/web` subir o front-end sem erro;
- `/login` permitir login com `cristiano.costa@colsan.org.br` e senha `Admin@123456`;
- após login, usuário for para `/dashboard`;
- rotas internas exigirem autenticação;
- sidebar e topbar aparecerem;
- tela de Ordens de Serviço listar e criar OS;
- tela de Projetos listar e criar projeto;
- tela de Tarefas listar minhas tarefas;
- tela de Usuários listar usuários para OWNER;
- logout funcionar.

## Ao finalizar

Explique:

- arquivos criados;
- arquivos alterados;
- dependências instaladas;
- comandos para testar;
- se algo ficou pendente.