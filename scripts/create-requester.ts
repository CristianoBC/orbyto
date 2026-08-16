import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL não encontrada no .env da raiz do projeto.');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const tenant = await prisma.tenant.findFirst({
    where: {
      slug: 'interno',
    },
  });

  if (!tenant) {
    throw new Error('Tenant com slug "interno" não encontrado.');
  }

  const email = 'solicitante.teste@colsan.org.br';
  const passwordHash = await bcrypt.hash('Solicitante@123456', 10);

  const user = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email,
      },
    },
    update: {
      name: 'Usuario Solicitante Teste',
      passwordHash,
      role: 'REQUESTER',
      status: 'ACTIVE',
    },
    create: {
      name: 'Usuario Solicitante Teste',
      email,
      passwordHash,
      role: 'REQUESTER',
      status: 'ACTIVE',
      tenantId: tenant.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      tenantId: true,
    },
  });

  console.log('Usuario REQUESTER criado/atualizado com sucesso:');
  console.log(user);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Erro ao criar usuario REQUESTER:');
  console.error(error);
  process.exit(1);
});
