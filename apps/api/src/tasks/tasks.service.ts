import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  NotificationEntity,
  NotificationType,
  Prisma,
  Priority,
  TaskStatus,
  UserRole,
} from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

const taskInclude = {
  project: { select: { id: true, title: true, ownerId: true, status: true } },
  assignee: {
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
  },
} satisfies Prisma.TaskInclude;

type TaskResult = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

const administrativeRoles: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  async create(user: AuthUser, dto: CreateTaskDto) {
    this.ensureSupportedFields(dto);
    const project = await this.findProject(dto.projectId, user.tenantId);

    if (
      !administrativeRoles.includes(user.role) &&
      project.ownerId !== user.id
    ) {
      throw new ForbiddenException(
        'Você não pode criar tarefas neste projeto.',
      );
    }

    if (dto.assigneeId) {
      await this.validateAssignee(dto.assigneeId, user.tenantId);
    }

    return this.prisma.$transaction(async (transaction) => {
      const task = await transaction.task.create({
        data: {
          tenantId: user.tenantId,
          projectId: project.id,
          title: dto.title,
          description: dto.description,
          assigneeId: dto.assigneeId,
          priority: dto.priority ?? Priority.MEDIUM,
          status: dto.status ?? TaskStatus.TODO,
          dueDate: dto.dueDate,
        },
        include: taskInclude,
      });

      await transaction.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: AuditAction.CREATE,
          entity: 'Task',
          entityId: task.id,
          metadata: { projectId: project.id },
        },
      });

      if (task.assigneeId && task.assigneeId !== user.id) {
        await this.notifications.createForUser({
          tenantId: user.tenantId, userId: task.assigneeId, title: 'Nova tarefa atribuída',
          message: `A tarefa “${task.title}” foi atribuída a você.`, type: NotificationType.ACTION_REQUIRED,
          entity: NotificationEntity.TASK, entityId: task.id,
        }, transaction);
      }

      return this.toTaskResponse(task);
    });
  }

  async findMy(user: AuthUser, query: ListTasksQueryDto) {
    const tasks = await this.prisma.task.findMany({
      where: this.buildWhere(query, {
        tenantId: user.tenantId,
        assigneeId: user.id,
      }),
      include: taskInclude,
      orderBy: { createdAt: 'desc' },
    });

    return tasks.map((task) => this.toTaskResponse(task));
  }

  async findAll(tenantId: string, query: ListTasksQueryDto) {
    const tasks = await this.prisma.task.findMany({
      where: this.buildWhere(query, { tenantId }),
      include: taskInclude,
      orderBy: { createdAt: 'desc' },
    });
    return tasks.map((task) => this.toTaskResponse(task));
  }

  async findByProject(
    user: AuthUser,
    projectId: string,
    query: ListTasksQueryDto,
  ) {
    const project = await this.findProject(projectId, user.tenantId);
    const isAdmin = administrativeRoles.includes(user.role) || user.role === UserRole.VIEWER;

    if (!isAdmin && project.ownerId !== user.id) {
      const assignedTask = await this.prisma.task.findFirst({
        where: { tenantId: user.tenantId, projectId, assigneeId: user.id },
        select: { id: true },
      });

      if (!assignedTask) {
        throw new ForbiddenException(
          'Você não pode visualizar as tarefas deste projeto.',
        );
      }
    }

    const tasks = await this.prisma.task.findMany({
      where: this.buildWhere(query, { tenantId: user.tenantId, projectId }),
      include: taskInclude,
      orderBy: { createdAt: 'desc' },
    });

    return tasks.map((task) => this.toTaskResponse(task));
  }

  async findOne(user: AuthUser, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, tenantId: user.tenantId },
      include: taskInclude,
    });

    if (!task) throw new NotFoundException('Tarefa não encontrada.');

    if (!this.canAccess(user, task)) {
      throw new ForbiddenException('Você não pode visualizar esta tarefa.');
    }

    return this.toTaskResponse(task);
  }

  async update(user: AuthUser, id: string, dto: UpdateTaskDto) {
    this.ensureSupportedFields(dto);
    const current = await this.prisma.task.findFirst({
      where: { id, tenantId: user.tenantId },
      include: taskInclude,
    });

    if (!current) throw new NotFoundException('Tarefa não encontrada.');

    const canFullyUpdate =
      administrativeRoles.includes(user.role) ||
      current.project.ownerId === user.id;
    const isAssignee = current.assigneeId === user.id;

    if (!canFullyUpdate && !isAssignee) {
      throw new ForbiddenException('Você não pode atualizar esta tarefa.');
    }

    if (
      !canFullyUpdate &&
      Object.keys(dto).some((field) => field !== 'status')
    ) {
      throw new ForbiddenException(
        'O responsável pode atualizar apenas o status da tarefa.',
      );
    }

    if (dto.assigneeId) {
      await this.validateAssignee(dto.assigneeId, user.tenantId);
    }

    const statusChanged =
      dto.status !== undefined && dto.status !== current.status;
    const data: Prisma.TaskUncheckedUpdateManyInput = {
      title: dto.title,
      description: dto.description,
      assigneeId: dto.assigneeId,
      priority: dto.priority,
      status: dto.status,
      dueDate: dto.dueDate,
    };

    if (dto.status === TaskStatus.DONE && !current.finishedAt) {
      data.finishedAt = new Date();
    } else if (statusChanged && current.status === TaskStatus.DONE) {
      data.finishedAt = null;
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.task.updateMany({
        where: { id: current.id, tenantId: user.tenantId },
        data,
      });

      await transaction.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: statusChanged
            ? AuditAction.STATUS_CHANGE
            : AuditAction.UPDATE,
          entity: 'Task',
          entityId: current.id,
          metadata: statusChanged
            ? { previousStatus: current.status, newStatus: dto.status }
            : { updatedFields: Object.keys(dto) },
        },
      });

      const recipients = new Set<string>();
      if (dto.assigneeId && dto.assigneeId !== current.assigneeId && dto.assigneeId !== user.id) recipients.add(dto.assigneeId);
      if (statusChanged && current.assigneeId && current.assigneeId !== user.id) recipients.add(current.assigneeId);
      if (statusChanged && current.project.ownerId !== user.id) recipients.add(current.project.ownerId);
      await this.notifications.createForUsers([...recipients], {
        tenantId: user.tenantId,
        title: dto.assigneeId && dto.assigneeId !== current.assigneeId ? 'Tarefa atribuída a você' : 'Status de tarefa alterado',
        message: statusChanged ? `A tarefa “${current.title}” mudou para ${dto.status}.` : `A tarefa “${current.title}” foi atribuída a você.`,
        type: NotificationType.INFO, entity: NotificationEntity.TASK, entityId: current.id,
      }, transaction);

      const updated = await transaction.task.findFirst({
        where: { id: current.id, tenantId: user.tenantId },
        include: taskInclude,
      });

      if (!updated) throw new NotFoundException('Tarefa não encontrada.');
      return this.toTaskResponse(updated);
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

  private async validateAssignee(assigneeId: string, tenantId: string) {
    const assignee = await this.prisma.user.findFirst({
      where: { id: assigneeId, tenantId },
      select: { id: true },
    });
    if (!assignee)
      throw new NotFoundException('Responsável não encontrado neste ambiente.');
  }

  private canAccess(user: AuthUser, task: TaskResult) {
    return (
      administrativeRoles.includes(user.role) ||
      user.role === UserRole.VIEWER ||
      task.project.ownerId === user.id ||
      task.assigneeId === user.id
    );
  }

  private buildWhere(
    query: ListTasksQueryDto,
    required: Prisma.TaskWhereInput,
  ) {
    const text = query.text?.trim();
    return {
      AND: [
        required,
        {
          status: query.status,
          priority: query.priority,
          projectId: query.projectId,
          assigneeId: query.assigneeId,
          ...(text
            ? {
                OR: [
                  { title: { contains: text, mode: 'insensitive' as const } },
                  {
                    description: {
                      contains: text,
                      mode: 'insensitive' as const,
                    },
                  },
                ],
              }
            : {}),
        },
      ],
    } satisfies Prisma.TaskWhereInput;
  }

  private ensureSupportedFields(dto: CreateTaskDto | UpdateTaskDto) {
    if (dto.tags !== undefined) {
      throw new BadRequestException(
        'O schema atual não possui campo de tags para tarefas.',
      );
    }
  }

  private toTaskResponse(task: TaskResult) {
    const { finishedAt, ...rest } = task;
    return { ...rest, completedAt: finishedAt, tags: [] };
  }
}
