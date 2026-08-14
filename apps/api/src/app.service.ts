import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth() {
    return {
      ok: true,
      app: 'Gestão de Projetos API',
      timestamp: new Date().toISOString(),
    };
  }

  async getDatabaseHealth() {
    const tenantCount = await this.prisma.tenant.count();
    const userCount = await this.prisma.user.count();

    return {
      ok: true,
      database: 'connected',
      counts: {
        tenants: tenantCount,
        users: userCount,
      },
      timestamp: new Date().toISOString(),
    };
  }
}