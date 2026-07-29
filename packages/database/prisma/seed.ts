import 'dotenv/config';
import {
  PrismaClient,
  PlanType,
  TenantStatus,
  UserRole,
  UserStatus,
  BillingStatus,
  AuditAction,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const now = new Date();

  const tenant = await prisma.tenant.upsert({
    where: {
      slug: 'interno',
    },
    update: {
      name: 'Ambiente Interno',
      status: TenantStatus.ACTIVE,
      plan: PlanType.INTERNAL,
      billingStatus: BillingStatus.NONE,
    },
    create: {
      name: 'Ambiente Interno',
      slug: 'interno',
      status: TenantStatus.ACTIVE,
      plan: PlanType.INTERNAL,
      billingStatus: BillingStatus.NONE,
    },
  });

  const email = 'cristiano.costa@colsan.org.br';
  const password = 'Admin@123456';
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email,
      },
    },
    update: {
      name: 'Cristiano Batista da Costa',
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: now,
      passwordHash,
    },
    create: {
      tenantId: tenant.id,
      name: 'Cristiano Batista da Costa',
      email,
      passwordHash,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: now,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      action: AuditAction.CREATE,
      entity: 'SEED',
      entityId: tenant.id,
      metadata: {
        message: 'Seed inicial executado com sucesso.',
        tenant: tenant.slug,
        user: user.email,
      },
    },
  });

  console.log('Seed executado com sucesso.');
  console.log({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
    },
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    temporaryPassword: password,
  });
}

main()
  .catch((error) => {
    console.error('Erro ao executar seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });