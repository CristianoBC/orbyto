# Gestão de Projetos Web

Aplicação web para gestão de projetos, tarefas, ordens de serviço, registros diários, anexos, comentários e auditoria.

## Stack planejada

- Front-end: Next.js + React + TypeScript
- Back-end: NestJS + TypeScript
- Banco de dados: PostgreSQL
- ORM: Prisma
- Deploy: Docker + VPS
- Proxy: Nginx
- Storage inicial: local no VPS
- Storage futuro: S3 compatível

## Estrutura inicial

```text
apps/api        Back-end
apps/web        Front-end
packages/database Banco de dados e Prisma