import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, LookupType, Prisma } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLookupDto } from './dto/create-lookup.dto';
import { ListLookupsQueryDto } from './dto/list-lookups-query.dto';
import { UpdateLookupDto } from './dto/update-lookup.dto';

@Injectable()
export class LookupsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, query: ListLookupsQueryDto) {
    const search = query.search?.trim();
    return this.prisma.lookupItem.findMany({
      where: {
        tenantId,
        type: query.type,
        isActive: query.isActive,
        ...(search ? { OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ] } : {}),
      },
      include: { parent: { select: { id: true, name: true, type: true } } },
      orderBy: [{ sortOrder: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
    });
  }

  listType(tenantId: string, type: LookupType, activeOnly = false) {
    return this.list(tenantId, { type, ...(activeOnly ? { isActive: true } : {}) });
  }

  async serviceOrderOptions(tenantId: string) {
    const items = await this.prisma.lookupItem.findMany({
      where: { tenantId, isActive: true, type: { in: [LookupType.UNIT, LookupType.SERVICE_ORDER_CATEGORY, LookupType.SYSTEM_PROCESS] } },
      select: { id: true, type: true, name: true, code: true, description: true, sortOrder: true },
      orderBy: [{ sortOrder: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
    });
    return {
      units: items.filter((item) => item.type === LookupType.UNIT),
      categories: items.filter((item) => item.type === LookupType.SERVICE_ORDER_CATEGORY),
      systems: items.filter((item) => item.type === LookupType.SYSTEM_PROCESS),
    };
  }

  async create(actor: AuthUser, dto: CreateLookupDto) {
    const data = await this.prepare(actor.tenantId, dto.type, dto);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.lookupItem.create({ data: { ...data, tenantId: actor.tenantId, type: dto.type } });
        await this.audit(tx, actor, created.id, AuditAction.CREATE, 'LOOKUP_CREATED', { type: created.type, name: created.name });
        return created;
      });
    } catch (error) { this.handleUnique(error); }
  }

  async update(actor: AuthUser, id: string, dto: UpdateLookupDto) {
    const current = await this.find(actor.tenantId, id);
    const data = await this.prepare(actor.tenantId, current.type, dto, current.name);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.lookupItem.update({ where: { id: current.id }, data });
        await this.audit(tx, actor, updated.id, AuditAction.UPDATE, 'LOOKUP_UPDATED', { type: updated.type, updatedFields: Object.keys(dto) });
        return updated;
      });
    } catch (error) { this.handleUnique(error); }
  }

  async setStatus(actor: AuthUser, id: string, isActive: boolean) {
    const current = await this.find(actor.tenantId, id);
    if (current.isActive === isActive) return current;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lookupItem.update({ where: { id: current.id }, data: { isActive } });
      await this.audit(tx, actor, updated.id, AuditAction.STATUS_CHANGE, 'LOOKUP_STATUS_CHANGED', { type: updated.type, previousStatus: current.isActive, newStatus: isActive });
      return updated;
    });
  }

  private find(tenantId: string, id: string) {
    return this.prisma.lookupItem.findFirst({ where: { id, tenantId } }).then((item) => {
      if (!item) throw new NotFoundException('Cadastro auxiliar não encontrado.');
      return item;
    });
  }

  private async prepare(tenantId: string, type: LookupType, dto: UpdateLookupDto, fallbackName?: string) {
    const name = dto.name?.trim() ?? fallbackName;
    if (!name) throw new BadRequestException('Informe o nome do cadastro.');
    if (dto.parentId) {
      if (type !== LookupType.DEPARTMENT) throw new BadRequestException('Somente setores podem possuir uma unidade vinculada.');
      const parent = await this.prisma.lookupItem.findFirst({ where: { id: dto.parentId, tenantId, type: LookupType.UNIT } });
      if (!parent) throw new BadRequestException('A unidade vinculada não pertence a este ambiente.');
    }
    if (dto.relatedModule && type !== LookupType.CANCELLATION_REASON) throw new BadRequestException('O módulo relacionado é exclusivo dos motivos de cancelamento.');
    return {
      ...dto,
      name,
      normalizedName: this.normalize(name),
      code: dto.code === undefined ? undefined : dto.code?.trim() || null,
      description: dto.description === undefined ? undefined : dto.description?.trim() || null,
    };
  }

  private normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR'); }
  private handleUnique(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Já existe um cadastro com este nome neste tipo.');
    throw error;
  }
  private audit(tx: Prisma.TransactionClient, actor: AuthUser, entityId: string, action: AuditAction, operation: string, metadata: Prisma.InputJsonObject) {
    return tx.auditLog.create({ data: { tenantId: actor.tenantId, userId: actor.id, action, entity: 'LookupItem', entityId, metadata: { operation, ...metadata } } });
  }
}
