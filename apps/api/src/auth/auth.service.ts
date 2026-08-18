import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuditAction, NotificationEntity, NotificationType, TenantStatus, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterRequesterDto } from './dto/register-requester.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService, private readonly config: ConfigService) {}

  async login(dto: LoginDto) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findFirst({ where: { email, status: UserStatus.ACTIVE }, include: { tenant: true } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException('E-mail ou senha inválidos.');
    if (user.tenant.status !== TenantStatus.ACTIVE) throw new UnauthorizedException('Ambiente inativo ou suspenso.');
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
      this.prisma.auditLog.create({ data: { tenantId: user.tenantId, userId: user.id, action: AuditAction.LOGIN, entity: 'User', entityId: user.id, metadata: { email: user.email } } }),
    ]);
    const accessToken = await this.jwtService.signAsync({ sub: user.id, tenantId: user.tenantId, email: user.email, role: user.role });
    return {
      accessToken,
      user: { id: user.id, tenantId: user.tenantId, name: user.name, email: user.email, role: user.role, status: user.status, mustChangePassword: user.mustChangePassword },
      tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug, status: user.tenant.status, plan: user.tenant.plan },
    };
  }

  async registerRequester(dto: RegisterRequesterDto) {
    const email = this.normalizeEmail(dto.email);
    this.ensureInstitutionalEmail(email);
    const tenant = await this.getDefaultTenant();
    const existing = await this.prisma.user.findFirst({ where: { tenantId: tenant.id, email }, select: { id: true } });
    if (existing) throw new ConflictException('Já existe uma conta com este e-mail. Use a recuperação de senha para acessar.');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({ data: { tenantId: tenant.id, name: dto.name.trim(), email, passwordHash, role: UserRole.REQUESTER, status: UserStatus.ACTIVE, mustChangePassword: false }, select: { id: true, name: true, email: true, role: true, status: true, mustChangePassword: true } });
        await tx.auditLog.create({ data: { tenantId: tenant.id, userId: created.id, action: AuditAction.CREATE, entity: 'User', entityId: created.id, metadata: { operation: 'REQUESTER_SELF_REGISTERED', email } } });
        const admins = await tx.user.findMany({ where: { tenantId: tenant.id, status: UserStatus.ACTIVE, role: { in: [UserRole.OWNER, UserRole.ADMIN] } }, select: { id: true } });
        if (admins.length) await tx.notification.createMany({ data: admins.map(({ id }) => ({ tenantId: tenant.id, userId: id, title: 'Novo solicitante cadastrado', message: `${created.name} se cadastrou no Portal do Solicitante.`, type: NotificationType.INFO, entity: NotificationEntity.USER, entityId: created.id })) });
        return created;
      });
      return { message: 'Cadastro realizado com sucesso. Você já pode entrar no Portal do Solicitante.', user };
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') throw new ConflictException('Já existe uma conta com este e-mail. Use a recuperação de senha para acessar.');
      throw error;
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const neutral = 'Se o e-mail estiver cadastrado, enviaremos instruções para recuperação.';
    const tenant = await this.getDefaultTenant();
    const user = await this.prisma.user.findFirst({ where: { tenantId: tenant.id, email: this.normalizeEmail(dto.email), status: UserStatus.ACTIVE }, select: { id: true, tenantId: true, email: true } });
    if (!user) return { message: neutral };
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt, passwordResetUsedAt: null } }),
      this.prisma.auditLog.create({ data: { tenantId: user.tenantId, userId: user.id, action: AuditAction.UPDATE, entity: 'User', entityId: user.id, metadata: { operation: 'PASSWORD_RESET_REQUESTED', expiresAt } } }),
    ]);
    const resetUrl = `${this.config.get<string>('WEB_URL') ?? 'http://localhost:3000'}/reset-password?token=${token}`;
    if ((this.config.get<string>('NODE_ENV') ?? 'development') !== 'production') {
      console.log(`[password-reset] ${user.email}: ${resetUrl}`);
      return { message: neutral, developmentResetUrl: resetUrl };
    }
    return { message: neutral };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({ where: { passwordResetTokenHash: this.hashToken(dto.token), passwordResetExpiresAt: { gt: new Date() }, passwordResetUsedAt: null }, select: { id: true, tenantId: true, passwordHash: true } });
    if (!user) throw new BadRequestException('Token inválido, expirado ou já utilizado.');
    if (await bcrypt.compare(dto.newPassword, user.passwordHash)) throw new BadRequestException('A nova senha deve ser diferente da senha atual.');
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    const usedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false, passwordResetTokenHash: null, passwordResetExpiresAt: null, passwordResetUsedAt: usedAt } }),
      this.prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: usedAt } }),
      this.prisma.auditLog.create({ data: { tenantId: user.tenantId, userId: user.id, action: AuditAction.UPDATE, entity: 'User', entityId: user.id, metadata: { operation: 'PASSWORD_RESET_COMPLETED' } } }),
    ]);
    return { message: 'Senha redefinida com sucesso. Faça login com a nova senha.' };
  }

  async validateResetToken(token: string) {
    if (!token) throw new BadRequestException('Token não informado.');
    const count = await this.prisma.user.count({ where: { passwordResetTokenHash: this.hashToken(token), passwordResetExpiresAt: { gt: new Date() }, passwordResetUsedAt: null } });
    return { valid: count === 1 };
  }

  async changePassword(actor: AuthUser, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findFirst({ where: { id: actor.id, tenantId: actor.tenantId }, select: { id: true, tenantId: true, passwordHash: true } });
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) throw new BadRequestException('A senha atual está incorreta.');
    if (await bcrypt.compare(dto.newPassword, user.passwordHash)) throw new BadRequestException('A nova senha deve ser diferente da senha atual.');
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false } }),
      this.prisma.auditLog.create({ data: { tenantId: user.tenantId, userId: user.id, action: AuditAction.UPDATE, entity: 'User', entityId: user.id, metadata: { operation: 'PASSWORD_CHANGED' } } }),
    ]);
    return { message: 'Senha alterada com sucesso.', mustChangePassword: false };
  }

  private async getDefaultTenant() {
    const slug = this.config.get<string>('DEFAULT_TENANT_SLUG') ?? 'interno';
    const tenant = await this.prisma.tenant.findFirst({ where: { slug, status: TenantStatus.ACTIVE }, select: { id: true, slug: true } });
    if (!tenant) throw new NotFoundException('O ambiente de autocadastro não está disponível.');
    return tenant;
  }
  private ensureInstitutionalEmail(email: string) {
    const domain = (this.config.get<string>('AUTH_ALLOWED_EMAIL_DOMAIN') ?? 'colsan.org.br').toLowerCase().replace(/^@/, '');
    if (!email.endsWith(`@${domain}`)) throw new BadRequestException(`Use seu e-mail institucional @${domain}.`);
  }
  private normalizeEmail(email: string) { return email.trim().toLowerCase(); }
  private hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }
}
