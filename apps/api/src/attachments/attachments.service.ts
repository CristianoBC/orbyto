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
  private readonly uploadsDirectory = resolve(
    process.cwd(),
    'storage',
    'uploads',
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
  ) {}

  async onModuleInit() {
    await mkdir(this.uploadsDirectory, { recursive: true });
  }

  static getFileExtension(fileName: string) {
    return extname(basename(fileName)).toLowerCase();
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
            originalName: basename(file.originalname),
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
            message: `${user.name} adicionou o arquivo “${basename(file.originalname)}”.`,
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
      basename(file.originalname),
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

  async download(user: AuthUser, id: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado.');
    }

    if (attachment.refType !== RefType.SERVICE_ORDER) {
      throw new BadRequestException(
        `Download para o tipo ${attachment.refType} ainda não está implementado.`,
      );
    }

    await this.validateServiceOrderAccess(user, attachment.refId, 'baixar');
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
