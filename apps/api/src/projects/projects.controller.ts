import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(user, dto);
  }

  @Get('my')
  findMy(@CurrentUser() user: AuthUser, @Query() query: ListProjectsQueryDto) {
    return this.projectsService.findMy(user, query);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListProjectsQueryDto) {
    return this.projectsService.findAll(user.tenantId, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projectsService.findOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(user, id, dto);
  }
}
