import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  Prisma,
  Priority,
  ServiceOrderStatus,
  UserRole,
} from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { ListServiceOrdersQueryDto } from './dto/list-service-orders-query.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';

const serviceOrderInclude = {
  requester: { select: { id: true, name: true, email: true } },
  responsible: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ServiceOrderInclude;

const administrativeRoles: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

@Injectable()
export class ServiceOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  create(user: AuthUser, dto: CreateServiceOrderDto) {
    return this.prisma.$transaction(async (transaction) => {
      const created = await transaction.serviceOrder.create({ data: {
        ...dto,
        tenantId: user.tenantId,
        requesterId: user.id,
        status: ServiceOrderStatus.OPEN,
        priority: dto.priority ?? Priority.MEDIUM,
      }, include: serviceOrderInclude });
      await transaction.auditLog.create({ data: { tenantId: user.tenantId, userId: user.id, action: AuditAction.CREATE, entity: 'ServiceOrder', entityId: created.id, metadata: { title: created.title, status: created.status, priority: created.priority } } });
      return created;
    });
  }

  findMy(user: AuthUser, query: ListServiceOrdersQueryDto) {
    return this.prisma.serviceOrder.findMany({
      where: this.buildWhere(query, {
        tenantId: user.tenantId,
        requesterId: user.id,
      }),
      include: serviceOrderInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll(tenantId: string, query: ListServiceOrdersQueryDto) {
    return this.prisma.serviceOrder.findMany({
      where: this.buildWhere(query, { tenantId }),
      include: serviceOrderInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const serviceOrder = await this.prisma.serviceOrder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: serviceOrderInclude,
    });

    if (!serviceOrder) {
      throw new NotFoundException('Ordem de serviço não encontrada.');
    }

    const canView =
      administrativeRoles.includes(user.role) ||
      user.role === UserRole.VIEWER ||
      (user.role === UserRole.REQUESTER &&
        serviceOrder.requesterId === user.id) ||
      (user.role === UserRole.MEMBER &&
        (serviceOrder.requesterId === user.id ||
          serviceOrder.responsibleId === user.id));

    if (!canView) {
      throw new ForbiddenException(
        'Você não pode visualizar esta ordem de serviço.',
      );
    }

    return serviceOrder;
  }

  async update(user: AuthUser, id: string, dto: UpdateServiceOrderDto) {
    const current = await this.prisma.serviceOrder.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!current) {
      throw new NotFoundException('Ordem de serviço não encontrada.');
    }

    if (dto.responsibleId) {
      const responsible = await this.prisma.user.findFirst({
        where: { id: dto.responsibleId, tenantId: user.tenantId },
        select: { id: true },
      });

      if (!responsible) {
        throw new NotFoundException(
          'Responsável não encontrado neste ambiente.',
        );
      }
    }

    const statusChanged =
      dto.status !== undefined && dto.status !== current.status;
    const data: Prisma.ServiceOrderUpdateInput = { ...dto };

    if (dto.status === ServiceOrderStatus.COMPLETED && !current.finishedAt) {
      data.finishedAt = new Date();
    } else if (
      statusChanged &&
      current.status === ServiceOrderStatus.COMPLETED
    ) {
      data.finishedAt = null;
    }

    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.serviceOrder.update({
        where: { id: current.id },
        data,
        include: serviceOrderInclude,
      });

      await transaction.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: statusChanged
            ? AuditAction.STATUS_CHANGE
            : AuditAction.UPDATE,
          entity: 'ServiceOrder',
          entityId: current.id,
          metadata: statusChanged
            ? { previousStatus: current.status, newStatus: dto.status }
            : { updatedFields: Object.keys(dto) },
        },
      });

      return updated;
    });
  }

  private buildWhere(
    query: ListServiceOrdersQueryDto,
    required: Prisma.ServiceOrderWhereInput,
  ): Prisma.ServiceOrderWhereInput {
    const text = query.text?.trim();

    return {
      ...required,
      status: query.status,
      priority: query.priority,
      requesterId: required.requesterId ?? query.requesterId,
      responsibleId: query.responsibleId,
      system: query.system,
      ...(text
        ? {
            OR: [
              { title: { contains: text, mode: 'insensitive' } },
              { description: { contains: text, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }
}
