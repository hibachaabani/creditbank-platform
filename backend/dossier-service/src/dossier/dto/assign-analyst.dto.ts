import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignAnalystDto {
  @ApiProperty({ description: 'ID de l\'analyste à affecter' })
  @IsUUID()
  analystId: string;
}
