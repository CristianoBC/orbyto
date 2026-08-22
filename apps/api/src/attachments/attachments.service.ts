import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  StreamableFile,
} from '@nestjs/common';
import {
  AuditAction,
  NotificationEntity,
  NotificationType,
  Prisma,
  RefType,
  PermissionModule,
  UserRole,
} from '@prisma/client';
import type { Express } from 'express';
import { createReadStream } from 'node:fs';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { PermissionsService } from '../permissions/permissions.service';
import { ConfigService } from '@nestjs/config';

const attachmentInclude = {
  uploadedBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.AttachmentInclude;

const administrativeRoles: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

@Injectable()
export class AttachmentsService implements OnModuleInit {
  private readonly uploadsDirectory: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly permissions: PermissionsService,
    config: ConfigService,
  ) {
    this.uploadsDirectory = resolve(
      process.cwd(),
      config.get<string>('UPLOAD_DIR')?.trim() || 'storage/uploads',
    );
  }

  async onModuleInit() {
    await mkdir(this.uploadsDirectory, { recursive: true });
  }

  static getFileExtension(fileName: string) {
    return extname(basename(fileName)).toLowerCase();
  }

  private safeOriginalName(fileName: string) {
    const cleaned = basename(fileName).replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, '_').trim();
    return cleaned.slice(0, 240) || 'arquivo';
  }

  private validateFileSignature(file: Express.Multer.File) {
    const extension = AttachmentsService.getFileExtension(file.originalname);
    const bytes = file.buffer;
    const valid = extension === '.pdf' ? bytes.subarray(0, 5).toString() === '%PDF-'
      : extension === '.png' ? bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : extension === '.jpg' || extension === '.jpeg' ? bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : true;
    if (!valid) throw new BadRequestException('O conteúdo do arquivo não corresponde ao tipo informado.');
  }

  async uploadForServiceOrder(
    user: AuthUser,
    serviceOrderId: string,
    file?: Express.Multer.File,
  ) {
    if (user.role === UserRole.VIEWER) {
      throw new ForbiddenException(
        'O perfil Visualizador não pode enviar anexos.',
      );
    }
    if (!file) {
      throw new BadRequestException('Envie um arquivo no campo file.');
    }
    this.validateFileSignature(file);
    const originalName = this.safeOriginalName(file.originalname);

    const serviceOrder = await this.validateServiceOrderAccess(
      user,
      serviceOrderId,
      'anexar',
    );
    const recipients =
      user.id === serviceOrder.requesterId
        ? await this.notifications.serviceOrderStaffRecipientIds(
            user.tenantId,
            user.id,
          )
        : [serviceOrder.requesterId].filter((id) => id !== user.id);

    const extension = AttachmentsService.getFileExtension(file.originalname);
    const fileName = `${randomUUID()}${extension}`;
    const directory = this.resolveInsideUploads(
      user.tenantId,
      'service-orders',
      serviceOrderId,
    );
    const filePath = this.resolveInsideUploads(
      user.tenantId,
      'service-orders',
      serviceOrderId,
      fileName,
    );
    const storageKey = relative(this.uploadsDirectory, filePath).replaceAll(
      sep,
      '/',
    );

    await mkdir(directory, { recursive: true });
    await writeFile(filePath, file.buffer, { flag: 'wx' });

    let attachment: Prisma.AttachmentGetPayload<{
      include: typeof attachmentInclude;
    }>;
    try {
      attachment = await this.prisma.$transaction(async (transaction) => {
        const attachment = await transaction.attachment.create({
          data: {
            tenantId: user.tenantId,
            uploadedById: user.id,
            refType: RefType.SERVICE_ORDER,
            refId: serviceOrderId,
            serviceOrderId,
            fileName,
            originalName,
            mimeType: file.mimetype || 'application/octet-stream',
            size: file.size,
            storageKey,
          },
          include: attachmentInclude,
        });

        await transaction.auditLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            action: AuditAction.ATTACHMENT,
            entity: 'ServiceOrder',
            entityId: serviceOrderId,
            metadata: { attachmentId: attachment.id, fileName },
          },
        });

        await this.notifications.createForUsers(
          recipients,
          {
            tenantId: user.tenantId,
            title: 'Novo anexo na ordem de serviço',
            message: `${user.name} adicionou o arquivo “${originalName}”.`,
            type: NotificationType.INFO,
            entity: NotificationEntity.SERVICE_ORDER,
            entityId: serviceOrderId,
          },
          transaction,
        );

        return attachment;
      });
    } catch (error) {
      await unlink(filePath).catch(() => undefined);
      throw error;
    }
    await this.emailRecipients(
      user,
      serviceOrder,
      recipients,
      originalName,
    ).catch(() => undefined);
    return attachment;
  }

  async findByServiceOrder(user: AuthUser, serviceOrderId: string) {
    await this.validateServiceOrderAccess(user, serviceOrderId, 'visualizar');

    return this.prisma.attachment.findMany({
      where: {
        tenantId: user.tenantId,
        refType: RefType.SERVICE_ORDER,
        refId: serviceOrderId,
        serviceOrderId,
      },
      include: attachmentInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  uploadForProject(user: AuthUser, projectId: string, file?: Express.Multer.File) { return this.uploadForTarget(user, RefType.PROJECT, projectId, file); }
  uploadForTask(user: AuthUser, taskId: string, file?: Express.Multer.File) { return this.uploadForTarget(user, RefType.TASK, taskId, file); }
  async findByProject(user: AuthUser, projectId: string) { await this.validateProjectAccess(user, projectId, false); return this.findForTarget(user, RefType.PROJECT, projectId); }
  async findByTask(user: AuthUser, taskId: string) { await this.validateTaskAccess(user, taskId, false); return this.findForTarget(user, RefType.TASK, taskId); }

  private findForTarget(user: AuthUser, refType: RefType, refId: string) {
    return this.prisma.attachment.findMany({ where: { tenantId: user.tenantId, refType, refId, ...(refType === RefType.PROJECT ? { projectId: refId } : { taskId: refId }) }, include: attachmentInclude, orderBy: { createdAt: 'desc' } });
  }

  private async uploadForTarget(user: AuthUser, refType: RefType, refId: string, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Envie um arquivo no campo file.');
    this.validateFileSignature(file);
    const originalName = this.safeOriginalName(file.originalname);
    const recipients = refType === RefType.PROJECT
      ? [(await this.validateProjectAccess(user, refId, true)).ownerId]
      : await this.validateTaskAccess(user, refId, true).then((task) => [task.assigneeId, task.project.ownerId]);
    const folder = refType === RefType.PROJECT ? 'projects' : 'tasks';
    const extension = AttachmentsService.getFileExtension(file.originalname);
    const fileName = `${randomUUID()}${extension}`;
    const directory = this.resolveInsideUploads(user.tenantId, folder, refId);
    const filePath = this.resolveInsideUploads(user.tenantId, folder, refId, fileName);
    const storageKey = relative(this.uploadsDirectory, filePath).replaceAll(sep, '/');
    await mkdir(directory, { recursive: true });
    await writeFile(filePath, file.buffer, { flag: 'wx' });
    try {
      return await this.prisma.$transaction(async (tx) => {
        const attachment = await tx.attachment.create({ data: { tenantId: user.tenantId, uploadedById: user.id, refType, refId, ...(refType === RefType.PROJECT ? { projectId: refId } : { taskId: refId }), fileName, originalName, mimeType: file.mimetype || 'application/octet-stream', size: file.size, storageKey }, include: attachmentInclude });
        const isProject = refType === RefType.PROJECT;
        await tx.auditLog.create({ data: { tenantId: user.tenantId, userId: user.id, action: AuditAction.ATTACHMENT, entity: isProject ? 'Project' : 'Task', entityId: refId, metadata: { event: isProject ? 'PROJECT_ATTACHMENT_UPLOADED' : 'TASK_ATTACHMENT_UPLOADED', attachmentId: attachment.id, fileName } } });
        await this.notifications.createForUsers(recipients.filter((id): id is string => Boolean(id) && id !== user.id), { tenantId: user.tenantId, title: isProject ? 'Novo anexo no projeto' : 'Novo anexo na tarefa', message: `${user.name} adicionou o arquivo “${originalName}”.`, type: NotificationType.INFO, entity: isProject ? NotificationEntity.PROJECT : NotificationEntity.TASK, entityId: refId }, tx);
        return attachment;
      });
    } catch (error) { await unlink(filePath).catch(() => undefined); throw error; }
  }

  async download(user: AuthUser, id: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado.');
    }

    if (attachment.refType === RefType.SERVICE_ORDER) await this.validateServiceOrderAccess(user, attachment.refId, 'baixar');
    else if (attachment.refType === RefType.PROJECT) await this.validateProjectAccess(user, attachment.refId, false);
    else if (attachment.refType === RefType.TASK) await this.validateTaskAccess(user, attachment.refId, false);
    else throw new BadRequestException(`Download para o tipo ${attachment.refType} ainda não está implementado.`);
    const filePath = this.resolveStorageKey(attachment.storageKey);

    try {
      await access(filePath);
    } catch {
      throw new NotFoundException('Arquivo do anexo não encontrado no disco.');
    }

    return new StreamableFile(createReadStream(filePath), {
      type: attachment.mimeType,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(
        attachment.originalName || attachment.fileName,
      )}`,
      length: attachment.size,
    });
  }

  private resolveInsideUploads(...segments: string[]) {
    const target = resolve(this.uploadsDirectory, ...segments);
    const relativeTarget = relative(this.uploadsDirectory, target);

    if (
      relativeTarget === '' ||
      relativeTarget.startsWith(`..${sep}`) ||
      relativeTarget === '..' ||
      resolve(target) === this.uploadsDirectory
    ) {
      throw new BadRequestException('Caminho de armazenamento inválido.');
    }

    return target;
  }

  private resolveStorageKey(storageKey: string) {
    if (!storageKey || storageKey.includes('\0')) {
      throw new BadRequestException('Caminho de armazenamento inválido.');
    }

    return this.resolveInsideUploads(...storageKey.split(/[\\/]+/));
  }

  private async validateServiceOrderAccess(
    user: AuthUser,
    serviceOrderId: string,
    action: 'anexar' | 'visualizar' | 'baixar',
  ) {
    const serviceOrder = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, tenantId: user.tenantId },
      select: { id: true, title: true, requesterId: true, responsibleId: true },
    });

    if (!serviceOrder) {
      throw new NotFoundException('Ordem de serviço não encontrada.');
    }

    const hasAccess =
      administrativeRoles.includes(user.role) ||
      user.role === UserRole.VIEWER ||
      (user.role === UserRole.REQUESTER &&
        serviceOrder.requesterId === user.id) ||
      (user.role === UserRole.MEMBER &&
        (serviceOrder.requesterId === user.id ||
          serviceOrder.responsibleId === user.id));

    if (!hasAccess) {
      throw new ForbiddenException(
        `Você não pode ${action} anexos desta ordem de serviço.`,
      );
    }

    return serviceOrder;
  }

  private async canWrite(user: AuthUser, module: PermissionModule) { return user.role === UserRole.OWNER || await this.permissions.has(user, module, 'edit') || await this.permissions.has(user, module, 'manage'); }
  private async validateProjectAccess(user: AuthUser, projectId: string, write: boolean) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, tenantId: user.tenantId }, select: { id: true, title: true, ownerId: true, tasks: { where: { tenantId: user.tenantId, assigneeId: user.id }, select: { id: true }, take: 1 } } });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    if (write && !(await this.canWrite(user, PermissionModule.PROJECTS))) throw new ForbiddenException('Você não pode anexar arquivos neste projeto.');
    if (!administrativeRoles.includes(user.role) && user.role !== UserRole.VIEWER && project.ownerId !== user.id && !project.tasks.length) throw new ForbiddenException('Você não pode acessar este projeto.');
    return project;
  }
  private async validateTaskAccess(user: AuthUser, taskId: string, write: boolean) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, tenantId: user.tenantId }, select: { id: true, title: true, assigneeId: true, project: { select: { ownerId: true } } } });
    if (!task) throw new NotFoundException('Tarefa não encontrada.');
    if (write && !(await this.canWrite(user, PermissionModule.TASKS))) throw new ForbiddenException('Você não pode anexar arquivos nesta tarefa.');
    if (!administrativeRoles.includes(user.role) && user.role !== UserRole.VIEWER && task.assigneeId !== user.id && task.project.ownerId !== user.id) throw new ForbiddenException('Você não pode acessar esta tarefa.');
    return task;
  }

  private async emailRecipients(
    user: AuthUser,
    serviceOrder: {
      id: string;
      title: string;
      requesterId: string;
      responsibleId: string | null;
    },
    ids: string[],
    fileName: string,
  ) {
    for (const recipient of await this.notifications.activeRecipients(
      user.tenantId,
      ids,
    )) {
      const requesterLink = recipient.id === serviceOrder.requesterId;
      const delivery = await this.mail.sendServiceOrderAttachmentEmail({
        tenantId: user.tenantId,
        to: recipient.email,
        recipientName: recipient.name,
        title: serviceOrder.title,
        url: this.mail.webUrl(
          `${requesterLink ? '/requester' : ''}/service-orders/${serviceOrder.id}`,
        ),
        fields: [
          { label: 'Enviado por', value: user.name },
          { label: 'Arquivo', value: fileName },
        ],
      });
      await this.mail.auditOperationalDelivery(
        {
          tenantId: user.tenantId,
          actorId: user.id,
          entity: 'ServiceOrder',
          entityId: serviceOrder.id,
          event: 'SERVICE_ORDER_ATTACHMENT',
          recipient: recipient.email,
        },
        delivery,
      );
    }
  }
}
