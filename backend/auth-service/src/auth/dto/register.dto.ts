import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'mohammed.benali@email.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'MotDePasse123!', minLength: 6 })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'Mohammed' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Benali' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: '+212 6 12 34 56 78' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'AB123456' })
  @IsString()
  @IsOptional()
  nationalId?: string;

  @ApiProperty({ example: 'uuid-du-role-client', description: 'ID du rôle (CLIENT par défaut)' })
  @IsUUID()
  @IsNotEmpty()
  roleId: string;

  @ApiPropertyOptional({ example: 'uuid-de-agence', description: 'ID de l\'agence (pour agents uniquement)' })
  @IsUUID()
  @IsOptional()
  agencyId?: string;
}
