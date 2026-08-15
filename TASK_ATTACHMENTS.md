# Tarefa Codex — AttachmentsModule

Você está trabalhando no projeto Gestão de Projetos Web.

Antes de alterar arquivos, leia:

- CODEX_CONTEXT.md
- TASK_USERS_ROLES.md
- TASK_SERVICE_ORDERS.md
- TASK_COMMENTS.md
- package.json
- apps/api/src/app.module.ts
- apps/api/src/auth/*
- apps/api/src/users/*
- apps/api/src/service-orders/*
- apps/api/src/comments/*
- apps/api/src/prisma/*
- packages/database/prisma/schema.prisma

## Objetivo

Criar o módulo de Anexos no back-end NestJS.

Inicialmente, os anexos serão usados em Ordens de Serviço, com armazenamento local em disco para desenvolvimento e MVP interno.

## Escopo obrigatório

### 1. Criar módulo Attachments

Criar a estrutura:

- apps/api/src/attachments/attachments.module.ts
- apps/api/src/attachments/attachments.service.ts
- apps/api/src/attachments/attachments.controller.ts

Criar DTOs, se necessário:

- apps/api/src/attachments/dto/list-attachments-query.dto.ts

### 2. Criar pasta de armazenamento local

Usar como diretório base:

- storage/uploads

Se a pasta não existir, criar automaticamente no service.

Os arquivos devem ser gravados em subpastas por tenant e entidade:

- storage/uploads/{tenantId}/service-orders/{serviceOrderId}/{filename}

### 3. Rotas esperadas

Criar as seguintes rotas:

#### POST /api/attachments/service-order/:serviceOrderId

Faz upload de um arquivo para uma Ordem de Serviço.

Regras:

- rota autenticada;
- usar JwtAuthGuard;
- usar FileInterceptor com campo `file`;
- usar tenantId e uploadedById do usuário logado;
- validar se a Ordem de Serviço existe no mesmo tenantId;
- respeitar regra de visibilidade/permissão da OS:
  - OWNER, ADMIN e MANAGER podem anexar em qualquer OS do tenant;
  - REQUESTER pode anexar apenas em OS criada por ele;
  - MEMBER pode anexar em OS criada por ele ou atribuída a ele como responsibleId.
- criar registro na tabela Attachment;
- usar refType SERVICE_ORDER;
- usar refId igual ao serviceOrderId;
- preencher serviceOrderId no relacionamento opcional;
- preencher:
  - fileName;
  - originalName;
  - mimeType;
  - size;
  - storageKey;
  - url, se aplicável.
- registrar AuditLog com action ATTACHMENT.

#### GET /api/attachments/service-order/:serviceOrderId

Lista anexos de uma Ordem de Serviço.

Regras:

- rota autenticada;
- usar JwtAuthGuard;
- validar se a OS existe no mesmo tenantId;
- respeitar a mesma regra de visualização da OS;
- listar somente anexos do mesmo tenantId;
- ordenar por createdAt desc;
- retornar dados básicos de uploadedBy;
- nunca retornar passwordHash.

#### GET /api/attachments/:id/download

Baixa um anexo.

Regras:

- rota autenticada;
- usar JwtAuthGuard;
- buscar Attachment por id e tenantId;
- validar permissão de acesso conforme refType;
- neste momento, implementar download apenas para refType SERVICE_ORDER;
- se refType for diferente de SERVICE_ORDER, retornar BadRequestException;
- validar que o arquivo existe no disco;
- retornar arquivo usando res.download ou StreamableFile;
- nunca permitir path traversal;
- nunca aceitar caminho do arquivo vindo do usuário.

### 4. Validações obrigatórias

Upload:

- permitir apenas um arquivo por requisição;
- tamanho máximo: 10 MB;
- bloquear arquivos potencialmente perigosos:
  - .exe
  - .bat
  - .cmd
  - .sh
  - .ps1
  - .js
  - .ts
  - .msi
  - .dll
- aceitar inicialmente documentos e imagens comuns:
  - pdf
  - png
  - jpg
  - jpeg
  - webp
  - doc
  - docx
  - xls
  - xlsx
  - csv
  - txt

### 5. Segurança e arquitetura

Regras obrigatórias:

- usar JwtAuthGuard em todas as rotas;
- nunca acessar Attachment sem tenantId;
- nunca acessar ServiceOrder sem tenantId;
- nunca retornar passwordHash;
- controllers devem ser finos;
- regras de negócio devem ficar em AttachmentsService;
- não alterar schema.prisma nesta tarefa;
- não alterar migrations antigas;
- registrar AttachmentsModule no AppModule;
- não criar front-end;
- não usar npm audit fix --force.
- evitar path traversal usando filename sanitizado e path.resolve/path.join com validação do diretório base.

### 6. Critérios de aceite

A tarefa estará concluída quando:

- `npm run start:dev --workspace apps/api` compilar sem erro;
- a API mapear:
  - POST /api/attachments/service-order/:serviceOrderId
  - GET /api/attachments/service-order/:serviceOrderId
  - GET /api/attachments/:id/download
- upload em OS existente criar arquivo físico e registro no banco;
- listar anexos da OS retornar o arquivo enviado;
- download do anexo retornar o arquivo;
- rotas sem token retornarem 401;
- upload em OS inexistente retornar 404;
- usuário sem permissão para a OS receber 403;
- arquivos bloqueados retornarem 400.

### 7. Ao finalizar

Explique:

- arquivos criados;
- arquivos alterados;
- rotas criadas;
- comandos para testar;
- se algum ponto ficou pendente.