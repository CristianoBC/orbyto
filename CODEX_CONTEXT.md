# Gestão de Projetos Web — Contexto Técnico

## Objetivo

Reconstruir uma aplicação originalmente feita em Google Apps Script para uma plataforma web profissional.

A versão atual é interna, para pequeno grupo de usuários. Futuramente poderá virar SaaS comercial.

## Stack

- Monorepo npm workspaces
- Back-end: NestJS em apps/api
- Banco: PostgreSQL via Docker
- ORM: Prisma 7
- Prisma config: prisma.config.ts
- Schema: packages/database/prisma/schema.prisma
- Seed: packages/database/prisma/seed.ts
- API port: 3001
- Global prefix: /api

## Estado atual

Já existe:

- PostgreSQL rodando em Docker
- schema.prisma criado e migrado
- seed inicial executado
- Tenant inicial: Ambiente Interno
- Usuário inicial: cristiano.costa@colsan.org.br
- Role inicial: OWNER
- AuthModule criado
- Login JWT funcionando
- Rota protegida /api/auth/me funcionando
- PrismaService criado em apps/api/src/prisma

## Regras arquiteturais

- Usar Clean Architecture simplificada por módulos NestJS.
- Usar Service Layer para regras de negócio.
- Controllers devem ser finos.
- Nunca acessar dados sem tenantId.
- Toda consulta de entidade de negócio deve respeitar tenantId.
- Usuário comum não deve ver dados de outro usuário.
- OWNER e ADMIN podem acessar dados administrativos do tenant.
- REQUESTER acessa apenas suas próprias ordens de serviço.
- MEMBER acessa seus próprios projetos, tarefas e registros.
- Não remover o schema.prisma sem autorização.
- Não alterar migrations antigas manualmente.
- Não usar npm audit fix --force sem autorização.

## Segurança

- Validar DTOs com class-validator.
- Usar guards para autenticação e autorização.
- Nunca retornar passwordHash.
- Usar bcryptjs para senha.
- Usar JWT Bearer token.
- Respeitar roles.
- Registrar eventos sensíveis em AuditLog quando fizer sentido.

## Comandos úteis

Subir banco:

```powershell
docker compose up -d