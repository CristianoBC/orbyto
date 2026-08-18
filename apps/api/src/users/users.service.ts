import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const publicUserSelect = {
  id: true,
  tenantId: true,
  name: true,
  email: true,
  role: true,
  status: true,
  phone: true,
  avatarUrl: true,
  lastLoginAt: true,
  emailVerifiedAt: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId }, select: publicUserSelect });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  findAllByTenant(tenantId: string) {
    return this.prisma.user.findMany({ where: { tenantId }, select: publicUserSelect, orderBy: { createdAt: 'desc' } });
  }

  async findOne(actor: AuthUser, id: string) {
    const target = await this.getTarget(actor.tenantId, id);
    this.ensureActorCanManageTarget(actor, target.role);
    return target;
  }

  async create(actor: AuthUser, dto: CreateUserDto) {
    this.ensureCanAssignRole(actor, dto.role);
    const email = this.normalizeEmail(dto.email);
    await this.ensureEmailAvailable(actor.tenantId, email);
    const passwordHash = await bcrypt.hash(dto.temporaryPassword, 12);

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const created = await transaction.user.create({
          data: {
            tenantId: actor.tenantId,
            name: dto.name.trim(),
            email,
            role: dto.role,
            status: dto.status ?? UserStatus.ACTIVE,
            passwordHash,
            mustChangePassword: true,
            phone: this.cleanOptional(dto.phone),
            avatarUrl: this.cleanOptional(dto.avatarUrl),
          },
          select: publicUserSelect,
        });
        await transaction.auditLog.create({
          data: {
            tenantId: actor.tenantId,
            userId: actor.id,
            action: AuditAction.CREATE,
            entity: 'User',
            entityId: created.id,
            metadata: { email: created.email, role: created.role, status: created.status },
          },
        });
        return created;
      });
    } catch (error) {
      this.handleUniqueEmail(error);
      throw error;
    }
  }

  async update(actor: AuthUser, id: string, dto: UpdateUserDto) {
    const target = await this.getTarget(actor.tenantId, id);
    this.ensureActorCanManageTarget(actor, target.role);
    if (dto.role !== undefined) this.ensureCanAssignRole(actor, dto.role);

    const roleChanged = dto.role !== undefined && dto.role !== target.role;
    const statusChanged = dto.status !== undefined && dto.status !== target.status;
    if (actor.id === target.id && (roleChanged || statusChanged)) {
      throw new ForbiddenException('Você não pode alterar o próprio perfil ou status.');
    }
    if (target.role === UserRole.OWNER && target.status === UserStatus.ACTIVE &&
        ((roleChanged && dto.role !== UserRole.OWNER) || (statusChanged && dto.status !== UserStatus.ACTIVE))) {
      await this.ensureAnotherActiveOwner(actor.tenantId, target.id);
    }

    const email = dto.email === undefined ? undefined : this.normalizeEmail(dto.email);
    if (email !== undefined && email !== target.email) await this.ensureEmailAvailable(actor.tenantId, email, target.id);
    const updatedFields = Object.keys(dto).filter((field) => field !== 'tenantId');

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const updated = await transaction.user.update({
          where: { id: target.id },
          data: {
            name: dto.name?.trim(), email, role: dto.role, status: dto.status,
            ...(dto.phone !== undefined ? { phone: this.cleanOptional(dto.phone) } : {}),
            ...(dto.avatarUrl !== undefined ? { avatarUrl: this.cleanOptional(dto.avatarUrl) } : {}),
          },
          select: publicUserSelect,
        });
        await transaction.auditLog.create({
          data: {
            tenantId: actor.tenantId, userId: actor.id,
            action: statusChanged ? AuditAction.STATUS_CHANGE : AuditAction.UPDATE,
            entity: 'User', entityId: target.id,
            metadata: statusChanged
              ? { previousStatus: target.status, newStatus: updated.status, updatedFields }
              : { updatedFields },
          },
        });
        return updated;
      });
    } catch (error) {
      this.handleUniqueEmail(error);
      throw error;
    }
  }

  async resetPassword(actor: AuthUser, id: string, dto: ResetUserPasswordDto) {
    const target = await this.getTarget(actor.tenantId, id);
    this.ensureActorCanManageTarget(actor, target.role);
    const passwordHash = await bcrypt.hash(dto.temporaryPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: target.id }, data: { passwordHash, mustChangePassword: true }, select: { id: true } }),
      this.prisma.auditLog.create({
        data: {
          tenantId: actor.tenantId, userId: actor.id, action: AuditAction.UPDATE,
          entity: 'User', entityId: target.id, metadata: { operation: 'USER_PASSWORD_RESET' },
        },
      }),
    ]);
    return { message: 'Senha temporária redefinida com sucesso.' };
  }

  private async getTarget(tenantId: string, id: string) {
    const target = await this.prisma.user.findFirst({ where: { id, tenantId }, select: publicUserSelect });
    if (!target) throw new NotFoundException('Usuário não encontrado.');
    return target;
  }

  private ensureActorCanManageTarget(actor: AuthUser, targetRole: UserRole) {
    if (actor.role === UserRole.ADMIN && targetRole === UserRole.OWNER) {
      throw new ForbiddenException('Administradores não podem alterar proprietários.');
    }
  }

  private ensureCanAssignRole(actor: AuthUser, role: UserRole) {
    if (role === UserRole.OWNER && actor.role !== UserRole.OWNER) {
      throw new ForbiddenException('Somente proprietários podem atribuir o perfil Proprietário.');
    }
  }

  private async ensureAnotherActiveOwner(tenantId: string, excludedId: string) {
    const count = await this.prisma.user.count({
      where: { tenantId, id: { not: excludedId }, role: UserRole.OWNER, status: UserStatus.ACTIVE },
    });
    if (count === 0) throw new ForbiddenException('O tenant deve manter pelo menos um proprietário ativo.');
  }

  private async ensureEmailAvailable(tenantId: string, email: string, excludedId?: string) {
    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email, ...(excludedId ? { id: { not: excludedId } } : {}) }, select: { id: true },
    });
    if (existing) throw new ConflictException('Já existe um usuário com este e-mail neste ambiente.');
  }

  private handleUniqueEmail(error: unknown): never | void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Já existe um usuário com este e-mail neste ambiente.');
    }
  }

  private normalizeEmail(email: string) { return email.trim().toLowerCase(); }
  private cleanOptional(value?: string | null) { return value?.trim() || null; }
}
