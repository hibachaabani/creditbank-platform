import {
  Controller, Post, Get, Delete, Patch, Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFile, Res, HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { DocumentService } from './document.service';
import { ValidateDocumentDto } from './dto/validate-document.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { multerConfig } from './multer.config';
import { DocumentType } from '@prisma/client';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  // ─── Upload ─────────────────────────────────────────────────────────────
  @Post('upload/:requestId')
  @ApiOperation({ summary: 'Uploader un document pour un dossier' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        docType: { type: 'string', enum: Object.values(DocumentType) },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', multerConfig))
  upload(
    @Param('requestId') requestId: string,
    @Query('docType') docType: DocumentType,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    return this.documentService.upload(requestId, docType, file, user.id);
  }

  // ─── Lister par dossier ──────────────────────────────────────────────────
  @Get('request/:requestId')
  @ApiOperation({ summary: 'Lister les documents d\'un dossier' })
  findByRequest(@Param('requestId') requestId: string) {
    return this.documentService.findByRequest(requestId);
  }

  // ─── Vérifier la complétude ──────────────────────────────────────────────
  @Get('request/:requestId/completeness')
  @ApiOperation({ summary: 'Vérifier si le dossier est complet' })
  checkCompleteness(
    @Param('requestId') requestId: string,
    @Query('creditType') creditType: string,
  ) {
    return this.documentService.checkCompleteness(requestId, creditType);
  }

  // ─── Statistiques ────────────────────────────────────────────────────────
  @Get('request/:requestId/stats')
  @ApiOperation({ summary: 'Stats documents d\'un dossier' })
  getStats(@Param('requestId') requestId: string) {
    return this.documentService.getStats(requestId);
  }

  // ─── Détail ──────────────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un document' })
  findOne(@Param('id') id: string) {
    return this.documentService.findOne(id);
  }

  // ─── Télécharger le fichier ──────────────────────────────────────────────
  @Get(':id/download')
  @ApiOperation({ summary: 'Télécharger un document' })
  async download(@Param('id') id: string, @Res() res: Response) {
    const { filePath, originalName, mimeType } = await this.documentService.getFilePath(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
    createReadStream(filePath).pipe(res);
  }

  // ─── Prévisualiser ───────────────────────────────────────────────────────
  @Get(':id/preview')
  @ApiOperation({ summary: 'Prévisualiser un document (inline)' })
  async preview(@Param('id') id: string, @Res() res: Response) {
    const { filePath, originalName, mimeType } = await this.documentService.getFilePath(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
    createReadStream(filePath).pipe(res);
  }

  // ─── Valider / Rejeter ───────────────────────────────────────────────────
  @Patch(':id/validate')
  @ApiOperation({ summary: 'Valider ou rejeter un document' })
  validate(
    @Param('id') id: string,
    @Body() dto: ValidateDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.documentService.validate(id, dto, user.id, user.role);
  }

  // ─── Supprimer ───────────────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Supprimer un document' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentService.remove(id, user.id, user.role);
  }
}
