import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  Prisma,
  Priority,
  ProjectStatus,
  TaskStatus,
  UserRole,
} from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const ownerSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const projectInclude = {
  owner: { select: ownerSelect },
} satisfies Prisma.ProjectInclude;

const projectWithTaskCountInclude = {
  ...projectInclude,
  _count: { select: { tasks: true } },
} satisfies Prisma.ProjectInclude;

type ProjectResult = Prisma.ProjectGetPayload<{
  include: typeof projectInclude;
}>;

type ProjectWithTaskCountResult = Prisma.ProjectGetPayload<{
  include: typeof projectWithTaskCountInclude;
}>;

const administrativeRoles: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, dto: CreateProjectDto) {
    this.ensureSupportedFields(dto);
    const ownerId = dto.ownerId ?? user.id;

    if (ownerId !== user.id && !administrativeRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Somente perfis administrativos podem definir outro responsável.',
      );
    }

    await this.validateOwner(ownerId, user.tenantId);

    const project = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.project.create({ data: {
        tenantId: user.tenantId,
        ownerId,
        title: dto.name,
        description: dto.description,
        area: dto.department,
        unit: dto.unit,
        priority: dto.priority ?? Priority.MEDIUM,
        status: dto.status ?? ProjectStatus.PLANNED,
        startDate: dto.startDate,
        dueDate: dto.endDate,
        tags: this.serializeTags(dto.tags),
      }, include: projectInclude });
      await transaction.auditLog.create({ data: { tenantId: user.tenantId, userId: user.id, action: AuditAction.CREATE, entity: 'Project', entityId: created.id, metadata: { title: created.title, status: created.status, priority: created.priority, ownerId: created.ownerId } } });
      return created;
    });

    return this.toProjectResponse(project);
  }

  async findMy(user: AuthUser, query: ListProjectsQueryDto) {
    const projects = await this.prisma.project.findMany({
      where: this.buildWhere(query, {
        tenantId: user.tenantId,
        OR: [
          { ownerId: user.id },
          { tasks: { some: { tenantId: user.tenantId, assigneeId: user.id } } },
        ],
      }),
      include: projectInclude,
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((project) => this.toProjectResponse(project));
  }

  async findAll(tenantId: string, query: ListProjectsQueryDto) {
    const projects = await this.prisma.project.findMany({
      where: this.buildWhere(query, { tenantId }),
      include: projectInclude,
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((project) => this.toProjectResponse(project));
  }

  async findOne(user: AuthUser, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
      include: projectWithTaskCountInclude,
    });

    if (!project) {
      throw new NotFoundException('Projeto não encontrado.');
    }

    const canView =
      administrativeRoles.includes(user.role) ||
      user.role === UserRole.VIEWER ||
      project.ownerId === user.id ||
      (await this.hasAssignedTask(user, project.id));

    if (!canView) {
      throw new ForbiddenException('Você não pode visualizar este projeto.');
    }

    const completedTasks = await this.prisma.task.count({
      where: {
        tenantId: user.tenantId,
        projectId: project.id,
        status: TaskStatus.DONE,
      },
    });

    return this.toProjectResponse(project, {
      tasks: project._count.tasks,
      completedTasks,
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateProjectDto) {
    this.ensureSupportedFields(dto);
    const current = await this.prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
      select: {
        id: true,
        ownerId: true,
        status: true,
        finishedAt: true,
      },
    });

    if (!current) {
      throw new NotFoundException('Projeto não encontrado.');
    }

    if (
      !administrativeRoles.includes(user.role) &&
      current.ownerId !== user.id
    ) {
      throw new ForbiddenException('Você não pode atualizar este projeto.');
    }

    const ownerChanged =
      dto.ownerId !== undefined && dto.ownerId !== current.ownerId;

    if (ownerChanged) {
      if (!administrativeRoles.includes(user.role)) {
        throw new ForbiddenException(
          'Somente perfis administrativos podem alterar o responsável.',
        );
      }

      await this.validateOwner(dto.ownerId!, user.tenantId);
    }

    const statusChanged =
      dto.status !== undefined && dto.status !== current.status;
    const data: Prisma.ProjectUpdateManyMutationInput = {
      title: dto.name,
      description: dto.description,
      area: dto.department,
      unit: dto.unit,
      priority: dto.priority,
      status: dto.status,
      startDate: dto.startDate,
      dueDate: dto.endDate,
      ...(dto.tags !== undefined ? { tags: this.serializeTags(dto.tags) } : {}),
      ...(dto.ownerId !== undefined ? { ownerId: dto.ownerId } : {}),
    };

    if (dto.status === ProjectStatus.COMPLETED && !current.finishedAt) {
      data.finishedAt = new Date();
    } else if (statusChanged && current.status === ProjectStatus.COMPLETED) {
      data.finishedAt = null;
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.project.updateMany({
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
          entity: 'Project',
          entityId: current.id,
          metadata: statusChanged
            ? { previousStatus: current.status, newStatus: dto.status }
            : { updatedFields: Object.keys(dto) },
        },
      });

      const updated = await transaction.project.findFirst({
        where: { id: current.id, tenantId: user.tenantId },
        include: projectInclude,
      });

      if (!updated) {
        throw new NotFoundException('Projeto não encontrado.');
      }

      return this.toProjectResponse(updated);
    });
  }

  private async validateOwner(ownerId: string, tenantId: string) {
    const owner = await this.prisma.user.findFirst({
      where: { id: ownerId, tenantId },
      select: { id: true },
    });

    if (!owner) {
      throw new NotFoundException('Responsável não encontrado neste ambiente.');
    }
  }

  private hasAssignedTask(user: AuthUser, projectId: string) {
    return this.prisma.task
      .findFirst({
        where: {
          tenantId: user.tenantId,
          projectId,
          assigneeId: user.id,
        },
        select: { id: true },
      })
      .then(Boolean);
  }

  private buildWhere(
    query: ListProjectsQueryDto,
    required: Prisma.ProjectWhereInput,
  ): Prisma.ProjectWhereInput {
    const text = query.text?.trim();

    return {
      AND: [
        required,
        {
          status: query.status,
          priority: query.priority,
          ownerId: query.ownerId,
          area: query.department,
          unit: query.unit,
          ...(text
            ? {
                OR: [
                  { title: { contains: text, mode: 'insensitive' } },
                  { description: { contains: text, mode: 'insensitive' } },
                  { area: { contains: text, mode: 'insensitive' } },
                  { unit: { contains: text, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
      ],
    };
  }

  private ensureSupportedFields(dto: CreateProjectDto | UpdateProjectDto) {
    if (dto.objective !== undefined || dto.scope !== undefined) {
      throw new BadRequestException(
        'O schema atual não possui campos para objective e scope.',
      );
    }
  }

  private serializeTags(tags?: string[]) {
    return tags === undefined ? undefined : JSON.stringify(tags);
  }

  private parseTags(tags: string | null) {
    if (!tags) return [];

    try {
      const parsed: unknown = JSON.parse(tags);
      return Array.isArray(parsed) &&
        parsed.every((tag) => typeof tag === 'string')
        ? parsed
        : [tags];
    } catch {
      return [tags];
    }
  }

  private toProjectResponse(
    project: ProjectResult | ProjectWithTaskCountResult,
    counts?: { tasks: number; completedTasks: number },
  ) {
    const { title, area, dueDate, finishedAt, tags, ...rest } = project;

    return {
      ...rest,
      name: title,
      description: project.description,
      objective: null,
      scope: null,
      department: area,
      dueDate,
      finishedAt,
      // Keep the legacy aliases while clients migrate to the Prisma field names.
      endDate: dueDate,
      completedAt: finishedAt,
      tags: this.parseTags(tags),
      ...(counts ? { taskCounts: counts } : {}),
    };
  }
}
