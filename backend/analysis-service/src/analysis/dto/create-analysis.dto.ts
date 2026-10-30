import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnalysisDto {
  @ApiProperty({ description: 'ID du dossier de crédit à analyser' })
  @IsUUID()
  @IsNotEmpty()
  requestId: string;
}
