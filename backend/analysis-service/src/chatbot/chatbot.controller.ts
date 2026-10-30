import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class ChatMessageDto {
  @IsString()
  message: string;

  @IsArray()
  @IsOptional()
  history?: { role: 'user' | 'assistant'; content: string }[];

  @IsNumber()
  @IsOptional()
  monthlyIncome?: number;
}

@ApiTags('Chatbot IA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  @ApiOperation({ summary: 'Envoyer un message au conseiller IA' })
  async sendMessage(@Body() dto: ChatMessageDto, @CurrentUser() user: any) {
    // Le JWT contient sub, email, role — on extrait le prénom depuis l'email
    const emailParts = user.email?.split('@')[0]?.split('.') ?? ['Utilisateur'];
    const firstName = emailParts[0]?.charAt(0).toUpperCase() + emailParts[0]?.slice(1) || 'Utilisateur';
    const lastName = emailParts[1]?.charAt(0).toUpperCase() + emailParts[1]?.slice(1) || '';

    const response = await this.chatbotService.chat(
      dto.message,
      {
        firstName,
        lastName,
        role: user.role,
        monthlyIncome: dto.monthlyIncome,
      },
      dto.history ?? [],
    );
    return { response, timestamp: new Date().toISOString() };
  }
}
