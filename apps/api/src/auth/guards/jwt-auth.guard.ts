import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthUser } from '../auth.types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthUser>(error: unknown, user: AuthUser | false | null, info: unknown, context: ExecutionContext): TUser {
    const authenticated = super.handleRequest(error, user, info, context) as AuthUser;
    const request = context.switchToHttp().getRequest<{ url: string }>();
    if (authenticated.mustChangePassword && !request.url.includes('/auth/change-password') && !request.url.includes('/auth/me')) {
      throw new ForbiddenException('Você deve alterar a senha temporária antes de continuar.');
    }
    return authenticated as TUser;
  }
}
