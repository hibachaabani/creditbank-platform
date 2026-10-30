import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreditType, RequestStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class FilterDossierDto {
  @ApiPropertyOptional({ enum: RequestStatus })
  @IsEnum(RequestStatus)
  @IsOptional()
  status?: RequestStatus;

  @ApiPropertyOptional({ enum: CreditType })
  @IsEnum(CreditType)
  @IsOptional()
  creditType?: CreditType;

  @ApiPropertyOptional({ example: '1' })
  @Transform(({ value }) => parseInt(value))
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: '10' })
  @Transform(({ value }) => parseInt(value))
  @IsOptional()
  limit?: number = 10;
}
