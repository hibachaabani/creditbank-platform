import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DecisionType } from '@prisma/client';

export class CreateDecisionDto {
  @ApiProperty({ description: 'ID du dossier concerné' })
  @IsUUID()
  @IsNotEmpty()
  requestId: string;

  @ApiPropertyOptional({ description: 'ID de l\'analyse associée' })
  @IsUUID()
  @IsOptional()
  analysisId?: string;

  @ApiProperty({ enum: DecisionType })
  @IsEnum(DecisionType)
  decisionType: DecisionType;

  // Champs si approuvé
  @ApiPropertyOptional({ example: 70000 })
  @IsNumber()
  @IsOptional()
  approvedAmount?: number;

  @ApiPropertyOptional({ example: 240 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  approvedDuration?: number;

  @ApiPropertyOptional({ example: 4.25 })
  @IsNumber()
  @IsOptional()
  interestRate?: number;

  @ApiPropertyOptional({ example: ['Apport de 10%', 'Assurance obligatoire'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  conditions?: string[];

  // Champs si refusé
  @ApiPropertyOptional({ example: 'TAUX_ENDETTEMENT_ELEVE' })
  @IsString()
  @IsOptional()
  refusalReason?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  refusalDetails?: string;
}
