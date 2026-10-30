import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ValidateDocumentDto } from './dto/validate-document.dto';
import { DocumentType } from '@prisma/client';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

// Documents requis par type de crédit
const REQUIRED_DOCS: Record<string, DocumentType[]> = {
  IMMOBILIER: ['CNI', 'BULLETIN_SALAIRE', 'RELEVE_COMPTE', 'CONTRAT_TRAVAIL', 'ATTESTATION_EMPLOYEUR', 'COMPROMIS_VENTE'],
  AUTO:        ['CNI', 'BULLETIN_SALAIRE', 'RELEVE_COMPTE', 'CONTRAT_TRAVAIL'],
  CONSOMMATION:['CNI', 'BULLETIN_SALAIRE', 'RELEVE_COMPTE'],
  PROFESSIONNEL:['CNI', 'DECLARATION_FISCALE', 'RELEVE_COMPTE', 'CONTRAT_TRAVAIL'],
  ETUDIANT:    ['CNI', 'JUSTIFICATIF_DOMICILE'],
};

@Injectable()
export class DocumentService {
  constructor(private prisma: PrismaService) {}

  // ─── Uploader un document ──────────────────────────────────────────────
  async upload(
    requestId: string,
    docType: DocumentType,
    file: Express.Multer.File,
    userId: string,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');

    const doc = await this.prisma.document.create({
      data: {
        requestId,
        uploadedBy: userId,
        docType,
        fileName: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        validationStatus: 'PENDING',
      },
    });

    return doc;
  }

  // ─── Lister les documents d'un dossier ────────────────────────────────
  async findByRequest(requestId: string) {
    const docs = await this.prisma.document.findMany({
      where: { requestId },
      orderBy: { uploadedAt: 'desc' },
    });

    // Vérifier la complétude pour chaque type de crédit
    return { documents: docs, total: docs.length };
  }

  // ─── Vérifier la complétude d'un dossier ──────────────────────────────
  async checkCompleteness(requestId: string, creditType: string) {
    const docs = await this.prisma.document.findMany({
      where: { requestId, validationStatus: { not: 'REJECTED' } },
    });

    const uploadedTypes = docs.map(d => d.docType);
    const required = REQUIRED_DOCS[creditType] ?? [];
    const missing = required.filter(r => !uploadedTypes.includes(r));
    const isComplete = missing.length === 0;

    return {
      isComplete,
      uploadedCount: docs.length,
      requiredCount: required.length,
      missingDocuments: missing,
      uploadedDocuments: uploadedTypes,
    };
  }

  // ─── Détail d'un document ─────────────────────────────────────────────
  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException(`Document ${id} introuvable`);
    return doc;
  }

  // ─── Télécharger un document ──────────────────────────────────────────
  async getFilePath(id: string) {
    const doc = await this.findOne(id);
    if (!existsSync(doc.filePath)) {
      throw new NotFoundException('Fichier physique introuvable');
    }
    return { filePath: doc.filePath, originalName: doc.originalName, mimeType: doc.mimeType };
  }

  // ─── Valider / Rejeter un document ────────────────────────────────────
  async validate(id: string, dto: ValidateDocumentDto, userId: string, userRole: string) {
    if (!['AGENT', 'ANALYST', 'ADMIN'].includes(userRole)) {
      throw new ForbiddenException('Seul un agent ou analyste peut valider les documents');
    }

    await this.findOne(id);

    return this.prisma.document.update({
      where: { id },
      data: {
        validationStatus: dto.status,
        validatedBy: userId,
        validationNote: dto.note,
        validatedAt: new Date(),
      },
    });
  }

  // ─── Supprimer un document ────────────────────────────────────────────
  async remove(id: string, userId: string, userRole: string) {
    const doc = await this.findOne(id);

    // Seul l'uploader ou un admin peut supprimer
    if (doc.uploadedBy !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Vous ne pouvez pas supprimer ce document');
    }

    // Supprimer le fichier physique
    if (existsSync(doc.filePath)) {
      unlinkSync(doc.filePath);
    }

    await this.prisma.document.delete({ where: { id } });
    return { message: 'Document supprimé avec succès' };
  }

  // ─── Statistiques documents ────────────────────────────────────────────
  async getStats(requestId: string) {
    const [total, validated, rejected, pending] = await Promise.all([
      this.prisma.document.count({ where: { requestId } }),
      this.prisma.document.count({ where: { requestId, validationStatus: 'VALIDATED' } }),
      this.prisma.document.count({ where: { requestId, validationStatus: 'REJECTED' } }),
      this.prisma.document.count({ where: { requestId, validationStatus: 'PENDING' } }),
    ]);

    return { total, validated, rejected, pending };
  }
}
