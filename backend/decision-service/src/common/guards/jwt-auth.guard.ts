import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('Token manquant');
    try {
      const payload = jwt.verify(authHeader.split(' ')[1], this.configService.get<string>('JWT_SECRET')!) as any;
      request.user = { id: payload.sub, email: payload.email, role: payload.role };
      return true;
    } catch { throw new UnauthorizedException('Token invalide ou expiré'); }
  }
}
