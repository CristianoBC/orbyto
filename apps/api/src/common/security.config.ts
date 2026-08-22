import type { ConfigService } from '@nestjs/config';

export const DEFAULT_UPLOAD_EXTENSIONS = [
  '.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv',
];

export function getJwtSecret(config: ConfigService): string {
  const production = config.get<string>('NODE_ENV') === 'production';
  const secret = config.get<string>('JWT_SECRET') ?? (production ? undefined : config.get<string>('JWT_ACCESS_SECRET'));
  if (!secret) throw new Error('JWT_SECRET não configurado. Defina um segredo aleatório forte no ambiente.');
  if (production && secret.length < 32) throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres em produção.');
  return secret;
}

export function getJwtExpiresIn(config: ConfigService) {
  return config.get<string>('JWT_EXPIRES_IN') ?? config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '8h';
}

export function getUploadLimitBytes(): number {
  const configured = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 10);
  const megabytes = Number.isFinite(configured) && configured > 0 ? Math.min(configured, 50) : 10;
  return Math.floor(megabytes * 1024 * 1024);
}

export function getAllowedUploadExtensions(): Set<string> {
  const configured = process.env.ALLOWED_UPLOAD_EXTENSIONS?.split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .map((value) => value.startsWith('.') ? value : `.${value}`);
  const dangerous = new Set(['.exe', '.bat', '.cmd', '.ps1', '.sh', '.js', '.vbs', '.scr', '.msi']);
  return new Set((configured?.length ? configured : DEFAULT_UPLOAD_EXTENSIONS).filter((item) => !dangerous.has(item)));
}
