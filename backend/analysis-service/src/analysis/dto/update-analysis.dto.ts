import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Recommendation } from '@prisma/client';

export class UpdateAnalysisDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  narrativeReport?: string;

  @ApiPropertyOptional({ enum: Recommendation })
  @IsEnum(Recommendation)
  @IsOptional()
  recommendation?: Recommendation;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  recommendationNotes?: string;
}
