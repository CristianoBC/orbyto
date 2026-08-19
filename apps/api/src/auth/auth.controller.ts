import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthUser } from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RegisterRequesterDto } from './dto/register-requester.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register-requester')
  registerRequester(@Body() dto: RegisterRequesterDto) { return this.authService.registerRequester(dto); }

  @Get('requester-registration-settings')
  requesterRegistrationSettings() { return this.authService.requesterRegistrationSettings(); }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) { return this.authService.forgotPassword(dto); }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) { return this.authService.resetPassword(dto); }

  @Get('validate-reset-token')
  validateResetToken(@Query('token') token: string) { return this.authService.validateResetToken(token); }

  @Get('validate-invite-token')
  validateInviteToken(@Query('token') token: string) { return this.authService.validateInviteToken(token); }

  @Post('accept-invite')
  acceptInvite(@Body() dto: AcceptInviteDto) { return this.authService.acceptInvite(dto); }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) { return this.authService.changePassword(user, dto); }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return {
      user,
    };
  }
}
