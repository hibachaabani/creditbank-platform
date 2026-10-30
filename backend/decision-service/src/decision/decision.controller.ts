import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DecisionService } from './decision.service';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Décisions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('decisions')
export class DecisionController {
  constructor(private readonly decisionService: DecisionService) {}

  @Get('pending')
  @ApiOperation({ summary: 'Dossiers en attente de décision' })
  getPending() {
    return this.decisionService.getPendingDossiers();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques des décisions' })
  getStats() {
    return this.decisionService.getStats();
  }

  @Post()
  @ApiOperation({ summary: 'Prendre une décision sur un dossier' })
  create(@Body() dto: CreateDecisionDto, @CurrentUser() user: any) {
    return this.decisionService.create(dto, user.id, user.role);
  }

  @Get()
  @ApiOperation({ summary: 'Lister toutes les décisions' })
  findAll(@CurrentUser() user: any) {
    return this.decisionService.findAll(user.id, user.role);
  }

  @Get(':requestId')
  @ApiOperation({ summary: 'Décision d\'un dossier spécifique' })
  findByRequest(@Param('requestId') requestId: string) {
    return this.decisionService.findByRequest(requestId);
  }
}
