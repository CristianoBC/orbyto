import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma, UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDailyLogDto } from './dto/create-daily-log.dto';
import { ListDailyLogsQueryDto } from './dto/list-daily-logs-query.dto';
import { UpdateDailyLogDto } from './dto/update-daily-log.dto';

const administrativeRoles: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

const dailyLogInclude = {
  user: {
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
  },
  project: {
    select: { id: true, title: true, ownerId: true, status: true },
  },
} satisfies Prisma.DailyLogInclude;

type DailyLogResult = Prisma.DailyLogGetPayload<{
  include: typeof dailyLogInclude;
}>;

@Injectable()
export class DailyLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, dto: CreateDailyLogDto) {
    this.ensureSupportedFields(dto);
    const project = dto.projectId
      ? await this.findProject(dto.projectId, user.tenantId)
      : null;

    if (!administrativeRoles.includes(user.role)) {
      if (!project || project.ownerId !== user.id) {
        throw new ForbiddenException(
          'Você não possui vínculo com o projeto ou tarefa deste registro.',
        );
      }
    }

    return this.prisma.$transaction(async (transaction) => {
      const dailyLog = await transaction.dailyLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          projectId: project?.id,
          title: dto.title,
          description: dto.content,
          type: dto.type,
          date: dto.logDate ?? new Date(),
          time:
            dto.workedHours === undefined ? undefined : String(dto.workedHours),
        },
        include: dailyLogInclude,
      });

      await transaction.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: AuditAction.CREATE,
          entity: 'DailyLog',
          entityId: dailyLog.id,
          metadata: { projectId: project?.id ?? null },
        },
      });

      return this.toResponse(dailyLog);
    });
  }

  async findMy(user: AuthUser, query: ListDailyLogsQueryDto) {
    this.ensureQuerySupported(query);
    const logs = await this.prisma.dailyLog.findMany({
      where: this.buildWhere(query, {
        tenantId: user.tenantId,
        userId: user.id,
      }),
      include: dailyLogInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return logs.map((log) => this.toResponse(log));
  }

  async findByProject(
    user: AuthUser,
    projectId: string,
    query: ListDailyLogsQueryDto,
  ) {
    this.ensureQuerySupported(query);
    const project = await this.findProject(projectId, user.tenantId);
    if (!(await this.canAccessProject(user, project))) {
      throw new ForbiddenException(
        'Você não pode visualizar os registros deste projeto.',
      );
    }

    const logs = await this.prisma.dailyLog.findMany({
      where: this.buildWhere(query, { tenantId: user.tenantId, projectId }),
      include: dailyLogInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return logs.map((log) => this.toResponse(log));
  }

  async findByTask(
    user: AuthUser,
    taskId: string,
    query: ListDailyLogsQueryDto,
  ) {
    this.ensureQuerySupported(query);
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, tenantId: user.tenantId },
      select: {
        id: true,
        assigneeId: true,
        project: { select: { id: true, ownerId: true } },
      },
    });
    if (!task) throw new NotFoundException('Tarefa não encontrada.');

    if (
      !administrativeRoles.includes(user.role) &&
      task.project.ownerId !== user.id &&
      task.assigneeId !== user.id
    ) {
      throw new ForbiddenException(
        'Você não pode visualizar os registros desta tarefa.',
      );
    }

    throw new BadRequestException(
      'O schema atual não possui vínculo entre registros diários e tarefas.',
    );
  }

  async findOne(user: AuthUser, id: string) {
    const log = await this.prisma.dailyLog.findFirst({
      where: { id, tenantId: user.tenantId },
      include: dailyLogInclude,
    });
    if (!log) throw new NotFoundException('Registro diário não encontrado.');

    if (!(await this.canAccessLog(user, log))) {
      throw new ForbiddenException(
        'Você não pode visualizar este registro diário.',
      );
    }
    return this.toResponse(log);
  }

  async update(user: AuthUser, id: string, dto: UpdateDailyLogDto) {
    this.ensureSupportedFields(dto);
    const current = await this.prisma.dailyLog.findFirst({
      where: { id, tenantId: user.tenantId },
      select: { id: true, userId: true },
    });
    if (!current)
      throw new NotFoundException('Registro diário não encontrado.');

    if (
      !administrativeRoles.includes(user.role) &&
      current.userId !== user.id
    ) {
      throw new ForbiddenException(
        'Você não pode atualizar este registro diário.',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.dailyLog.updateMany({
        where: { id: current.id, tenantId: user.tenantId },
        data: {
          title: dto.title,
          description: dto.content,
          type: dto.type,
          date: dto.logDate,
          time:
            dto.workedHours === undefined ? undefined : String(dto.workedHours),
        },
      });
      await transaction.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: AuditAction.UPDATE,
          entity: 'DailyLog',
          entityId: current.id,
          metadata: { updatedFields: Object.keys(dto) },
        },
      });
      const updated = await transaction.dailyLog.findFirst({
        where: { id: current.id, tenantId: user.tenantId },
        include: dailyLogInclude,
      });
      if (!updated)
        throw new NotFoundException('Registro diário não encontrado.');
      return this.toResponse(updated);
    });
  }

  private findProject(id: string, tenantId: string) {
    return this.prisma.project
      .findFirst({
        where: { id, tenantId },
        select: { id: true, ownerId: true },
      })
      .then((project) => {
        if (!project) throw new NotFoundException('Projeto não encontrado.');
        return project;
      });
  }

  private async canAccessProject(
    user: AuthUser,
    project: { id: string; ownerId: string },
  ) {
    if (
      administrativeRoles.includes(user.role) ||
      project.ownerId === user.id
    ) {
      return true;
    }
    return this.prisma.task
      .findFirst({
        where: {
          tenantId: user.tenantId,
          projectId: project.id,
          assigneeId: user.id,
        },
        select: { id: true },
      })
      .then(Boolean);
  }

  private async canAccessLog(user: AuthUser, log: DailyLogResult) {
    if (administrativeRoles.includes(user.role) || log.userId === user.id) {
      return true;
    }
    return log.project ? this.canAccessProject(user, log.project) : false;
  }

  private buildWhere(
    query: ListDailyLogsQueryDto,
    required: Prisma.DailyLogWhereInput,
  ): Prisma.DailyLogWhereInput {
    return {
      AND: [
        required,
        {
          projectId: query.projectId,
          type: query.type,
          date:
            query.startDate || query.endDate
              ? { gte: query.startDate, lte: query.endDate }
              : undefined,
        },
      ],
    };
  }

  private ensureSupportedFields(dto: CreateDailyLogDto | UpdateDailyLogDto) {
    if ('taskId' in dto && dto.taskId !== undefined) {
      throw new BadRequestException(
        'O schema atual não possui vínculo entre registros diários e tarefas.',
      );
    }
    if (dto.blockers !== undefined || dto.nextSteps !== undefined) {
      throw new BadRequestException(
        'O schema atual não possui campos para blockers e nextSteps.',
      );
    }
  }

  private ensureQuerySupported(query: ListDailyLogsQueryDto) {
    if (query.taskId !== undefined) {
      throw new BadRequestException(
        'O schema atual não possui vínculo entre registros diários e tarefas.',
      );
    }
  }

  private toResponse(log: DailyLogResult) {
    const { user, date, time, description, ...rest } = log;
    const workedHours = time === null ? null : Number(time);
    return {
      ...rest,
      authorId: log.userId,
      author: user,
      taskId: null,
      logDate: date,
      content: description,
      workedHours: Number.isNaN(workedHours) ? null : workedHours,
      blockers: null,
      nextSteps: null,
    };
  }
}
