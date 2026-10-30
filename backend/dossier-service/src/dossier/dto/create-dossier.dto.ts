import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreditType } from '@prisma/client';

export class CreateDossierDto {
  @ApiProperty({ enum: CreditType, example: 'IMMOBILIER' })
  @IsEnum(CreditType)
  creditType: CreditType;

  @ApiProperty({ example: 70000 })
  @IsNumber()
  @IsPositive()
  requestedAmount: number;

  @ApiProperty({ example: 240, description: 'Durée en mois' })
  @IsNumber()
  @Min(1)
  requestedDuration: number;

  @ApiProperty({ example: 5000, description: 'Revenus mensuels nets' })
  @IsNumber()
  @IsPositive()
  monthlyIncome: number;

  @ApiPropertyOptional({ example: 500, description: 'Mensualités de crédits en cours' })
  @IsNumber()
  @IsOptional()
  existingDebts?: number;

  @ApiPropertyOptional({ example: 'Achat appartement à Casablanca' })
  @IsString()
  @IsOptional()
  purpose?: string;

  @ApiPropertyOptional({ description: 'ID de l\'agence (rempli par l\'agent)' })
  @IsUUID()
  @IsOptional()
  agencyId?: string;
}
