import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ─── INSCRIPTION ────────────────────────────────────────────────────────
  async register(dto: RegisterDto, ipAddress?: string) {
    // Vérifier si l'email existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Un compte avec cet email existe déjà');
    }

    // Vérifier si le nationalId est déjà utilisé
    if (dto.nationalId) {
      const existingNationalId = await this.prisma.user.findUnique({
        where: { nationalId: dto.nationalId },
      });
      if (existingNationalId) {
        throw new ConflictException('Ce numéro national est déjà enregistré');
      }
    }

    // Vérifier que le rôle existe
    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });
    if (!role) {
      throw new NotFoundException('Rôle non trouvé');
    }

    // Vérifier l'agence si fournie
    if (dto.agencyId) {
      const agency = await this.prisma.agency.findUnique({
        where: { id: dto.agencyId },
      });
      if (!agency) {
        throw new NotFoundException('Agence non trouvée');
      }
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Créer l'utilisateur
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        nationalId: dto.nationalId,
        roleId: dto.roleId,
        agencyId: dto.agencyId,
      },
      include: { role: true, agency: true },
    });

    // Journaliser l'action
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REGISTER',
        entityType: 'user',
        entityId: user.id,
        newValue: { email: user.email, role: role.name },
        ipAddress,
      },
    });

    // Générer les tokens
    const tokens = await this.generateTokens(user.id, user.email, role.name);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ─── CONNEXION ──────────────────────────────────────────────────────────
  async login(dto: LoginDto, ipAddress?: string) {
    // Trouver l'utilisateur
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true, agency: true },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Compte désactivé. Contactez votre administrateur');
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN_FAILED',
          entityType: 'user',
          entityId: user.id,
          ipAddress,
        },
      });
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Journaliser la connexion réussie
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entityType: 'user',
        entityId: user.id,
        ipAddress,
      },
    });

    // Générer les tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role.name);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ─── DÉCONNEXION ────────────────────────────────────────────────────────
  async logout(userId: string, refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, token: refreshToken },
      data: { isRevoked: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'LOGOUT',
        entityType: 'user',
        entityId: userId,
      },
    });

    return { message: 'Déconnexion réussie' };
  }

  // ─── RAFRAÎCHIR LE TOKEN ─────────────────────────────────────────────────
  async refreshTokens(refreshToken: string) {
    // Vérifier que le token existe et n'est pas révoqué
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { role: true } } },
    });

    if (!storedToken || storedToken.isRevoked) {
      throw new UnauthorizedException('Token de rafraîchissement invalide');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Token de rafraîchissement expiré');
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    // Révoquer l'ancien token et générer de nouveaux
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const tokens = await this.generateTokens(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.role.name,
    );

    return {
      user: this.sanitizeUser(storedToken.user),
      ...tokens,
    };
  }

  // ─── TOUS LES UTILISATEURS (admin) ───────────────────────────────────────
  async getAllUsers() {
    return this.prisma.user.findMany({
      include: { role: true, agency: true },
      orderBy: { createdAt: 'desc' },
    }).then(users => users.map(u => this.sanitizeUser(u)));
  }

  // ─── MODIFIER UN UTILISATEUR ──────────────────────────────────────────────
  async updateUser(id: string, data: { isActive?: boolean }) {
    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: { role: true, agency: true },
    });
    return this.sanitizeUser(user);
  }

  // ─── RÉCUPÉRER RÔLES ET AGENCES (pour l'inscription) ────────────────────
  async getRolesAndAgencies() {
    const [roles, agencies] = await Promise.all([
      this.prisma.role.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.agency.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    ]);
    return { roles, agencies };
  }

  // ─── PROFIL UTILISATEUR COURANT ──────────────────────────────────────────
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, agency: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return this.sanitizeUser(user);
  }

  // ─── UTILITAIRES PRIVÉS ──────────────────────────────────────────────────
  private async generateTokens(userId: string, email: string, role: string) {
    const payload: { sub: string; email: string; role: string } = { 
      sub: userId, 
      email, 
      role 
    };

    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!jwtSecret || !jwtRefreshSecret) {
      throw new Error('JWT secrets are not configured');
    }

    const accessToken = await this.jwtService.signAsync<typeof payload>(payload, {
      secret: jwtSecret,
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync<typeof payload>(payload, {
      secret: jwtRefreshSecret,
      expiresIn: '7d',
    });

    // Sauvegarder le refresh token en base
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 jours

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, twoFaSecret, ...sanitized } = user;
    return sanitized;
  }
}
