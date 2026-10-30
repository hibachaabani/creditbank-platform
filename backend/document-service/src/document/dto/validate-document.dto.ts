import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ValidationStatus } from '@prisma/client';

export class ValidateDocumentDto {
  @ApiProperty({ enum: ValidationStatus })
  @IsEnum(ValidationStatus)
  status: ValidationStatus;

  @ApiPropertyOptional({ example: 'Document illisible, merci de renvoyer' })
  @IsString()
  @IsOptional()
  note?: string;
}
