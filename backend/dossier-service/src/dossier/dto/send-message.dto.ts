import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Votre dossier est incomplet, merci de fournir votre dernier relevé bancaire.' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
