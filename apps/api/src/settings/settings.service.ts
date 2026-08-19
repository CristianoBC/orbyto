import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  getOrCreateSettingsForTenant(tenantId: string) {
    return this.prisma.tenantSettings.upsert({
      where: { tenantId },
      update: {},
      create: { tenantId },
    });
  }

  async updateSettings(actor: AuthUser, dto: UpdateSettingsDto) {
    const before = await this.getOrCreateSettingsForTenant(actor.tenantId);
    const data = {
      ...dto,
      ...(dto.allowedEmailDomain !== undefined
        ? { allowedEmailDomain: dto.allowedEmailDomain?.toLowerCase() ?? null }
        : {}),
    };
    const changedFields = Object.keys(data).filter((key) =>
      (before as Record<string, unknown>)[key] !== (data as Record<string, unknown>)[key],
    );
    if (!changedFields.length) return before;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.tenantSettings.update({ where: { tenantId: actor.tenantId }, data });
      const safe = (value: typeof before) => Object.fromEntries(changedFields.map((key) => [key, (value as Record<string, unknown>)[key]]));
      const metadata = { operation: 'SYSTEM_SETTINGS_UPDATED', changedFields, before: safe(before), after: safe(updated) } as Prisma.InputJsonObject;
      await tx.auditLog.create({ data: { tenantId: actor.tenantId, userId: actor.id, action: AuditAction.UPDATE, entity: 'TenantSettings', entityId: updated.id, metadata } });
      return updated;
    });
  }
}
