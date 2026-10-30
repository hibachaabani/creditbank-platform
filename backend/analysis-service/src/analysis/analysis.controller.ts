import { Controller, Post, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Analyses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analyses')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  // Score rapide sans créer l'analyse
  @Get('score/:requestId')
  @ApiOperation({ summary: 'Score de risque rapide pour un dossier' })
  getScore(@Param('requestId') requestId: string) {
    return this.analysisService.getScore(requestId);
  }

  // Lancer l'analyse complète
  @Post()
  @ApiOperation({ summary: 'Lancer l\'analyse complète d\'un dossier' })
  create(@Body() dto: CreateAnalysisDto, @CurrentUser() user: any) {
    return this.analysisService.create(dto, user.id);
  }

  // Récupérer l'analyse d'un dossier
  @Get(':requestId')
  @ApiOperation({ summary: 'Récupérer l\'analyse d\'un dossier' })
  findByRequest(@Param('requestId') requestId: string) {
    return this.analysisService.findByRequest(requestId);
  }

  // Mettre à jour le rapport de l'analyste
  @Patch(':requestId')
  @ApiOperation({ summary: 'Mettre à jour le rapport et la recommandation' })
  update(
    @Param('requestId') requestId: string,
    @Body() dto: UpdateAnalysisDto,
    @CurrentUser() user: any,
  ) {
    return this.analysisService.update(requestId, dto, user.id, user.role);
  }

  // Soumettre l'analyse finalisée
  @Post(':requestId/submit')
  @ApiOperation({ summary: 'Soumettre l\'analyse — passe le dossier en PENDING_DECISION' })
  submit(@Param('requestId') requestId: string, @CurrentUser() user: any) {
    return this.analysisService.submit(requestId, user.id, user.role);
  }
}
