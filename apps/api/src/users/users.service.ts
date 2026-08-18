import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditAction, Prisma, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import type { AuthUser } from '../auth/auth.types';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';

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
  invitedAt: true,
  inviteExpiresAt: true,
  inviteAcceptedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly mail: MailService) {}

  async invite(actor: AuthUser, dto: InviteUserDto) {
    this.ensureInvitableRole(actor, dto.role);
    const email = this.normalizeEmail(dto.email);
    await this.ensureEmailAvailable(actor.tenantId, email);
    const invitation = this.createInvitation();
    const placeholderHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
    let created: { id: string; name: string; email: string; role: UserRole };
    try {
      created = await this.prisma.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: {
            tenantId: actor.tenantId,
            name: dto.name.trim(),
            email,
            role: dto.role,
            status: UserStatus.PENDING,
            passwordHash: placeholderHash,
            mustChangePassword: false,
            phone: this.cleanOptional(dto.phone),
            inviteTokenHash: invitation.tokenHash,
            inviteExpiresAt: invitation.expiresAt,
            invitedAt: new Date(),
          },
          select: publicUserSelect,
        });
        await transaction.auditLog.create({
          data: { tenantId: actor.tenantId, userId: actor.id, action: AuditAction.CREATE, entity: 'User', entityId: user.id, metadata: { operation: 'USER_INVITED', email, role: dto.role, expiresAt: invitation.expiresAt } },
        });
        return user;
      });
    } catch (error) {
      this.handleUniqueEmail(error);
      throw error;
    }
    await this.deliverInvitation(actor, created, invitation.token, invitation.expiresAt, 'USER_INVITE_FAILED');
    return { message: 'Usuário convidado com sucesso. O convite foi enviado por e-mail.', user: created };
  }

  async resendInvite(actor: AuthUser, id: string) {
    const target = await this.prisma.user.findFirst({
      where: { id, tenantId: actor.tenantId },
      select: { id: true, name: true, email: true, role: true, status: true, inviteAcceptedAt: true },
    });
    if (!target) throw new NotFoundException('Usuário não encontrado.');
    this.ensureActorCanManageTarget(actor, target.role);
    if (target.status !== UserStatus.PENDING || target.inviteAcceptedAt) throw new ConflictException('Este usuário não possui um convite pendente.');
    const invitation = this.createInvitation();
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: target.id }, data: { inviteTokenHash: invitation.tokenHash, inviteExpiresAt: invitation.expiresAt, invitedAt: new Date() } }),
      this.prisma.auditLog.create({ data: { tenantId: actor.tenantId, userId: actor.id, action: AuditAction.UPDATE, entity: 'User', entityId: target.id, metadata: { operation: 'USER_INVITE_RESENT', expiresAt: invitation.expiresAt } } }),
    ]);
    await this.deliverInvitation(actor, target, invitation.token, invitation.expiresAt, 'USER_INVITE_FAILED');
    return { message: 'Convite reenviado com sucesso.' };
  }

  async findMe(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId }, select: publicUserSelect });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  async updateMe(actor: AuthUser, dto: UpdateOwnProfileDto) {
    const target = await this.prisma.user.findFirst({
      where: { id: actor.id, tenantId: actor.tenantId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Usuário não encontrado.');

    const updatedFields = Object.keys(dto);
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.user.update({
        where: { id: target.id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.phone !== undefined ? { phone: this.cleanOptional(dto.phone) } : {}),
          ...(dto.avatarUrl !== undefined ? { avatarUrl: this.cleanOptional(dto.avatarUrl) } : {}),
        },
        select: publicUserSelect,
      });
      await transaction.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          action: AuditAction.UPDATE,
          entity: 'User',
          entityId: actor.id,
          metadata: { operation: 'USER_PROFILE_UPDATED', updatedFields },
        },
      });
      return updated;
    });
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

  private ensureInvitableRole(actor: AuthUser, role: UserRole) {
    if (role === UserRole.OWNER) throw new ForbiddenException('O perfil Proprietário não pode ser atribuído por convite.');
    this.ensureCanAssignRole(actor, role);
  }

  private createInvitation() {
    const token = randomBytes(32).toString('hex');
    const expiresInHours = this.inviteExpiryHours();
    return { token, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000) };
  }

  private inviteExpiryHours() {
    const configured = Number(this.config.get<string>('USER_INVITE_EXPIRES_HOURS') ?? 48);
    return Number.isFinite(configured) && configured > 0 ? configured : 48;
  }

  private async deliverInvitation(actor: AuthUser, target: { id: string; name: string; email: string }, token: string, expiresAt: Date, failureOperation: string) {
    const webUrl = (this.config.get<string>('APP_WEB_URL') ?? this.config.get<string>('WEB_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
    const inviteUrl = `${webUrl}/accept-invite?token=${encodeURIComponent(token)}`;
    const delivery = await this.mail.sendUserInvitation({ to: target.email, name: target.name, inviteUrl, expiresInHours: this.inviteExpiryHours() });
    if (delivery.sent) return;
    await this.prisma.auditLog.create({ data: { tenantId: actor.tenantId, userId: actor.id, action: AuditAction.UPDATE, entity: 'User', entityId: target.id, metadata: { operation: failureOperation, reason: delivery.reason } } });
    if ((this.config.get<string>('NODE_ENV') ?? 'development') !== 'production') console.warn(`[user-invite] E-mail não enviado (${delivery.reason}). Link de desenvolvimento: ${inviteUrl}`);
    throw new ServiceUnavailableException('O usuário foi criado, mas não foi possível enviar o convite. Tente reenviar em instantes.');
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
