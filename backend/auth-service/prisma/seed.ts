import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Début du seeding...');

  // ────────────────────────────────────────────────────────────────────────
  // 1. CRÉATION DES RÔLES
  // ────────────────────────────────────────────────────────────────────────
  console.log('📋 Création des rôles...');

  const roles = [
    { name: 'CLIENT', description: 'Client de la banque demandant un crédit' },
    { name: 'AGENT', description: 'Conseiller bancaire en agence' },
    { name: 'ANALYST', description: 'Analyste crédit évaluant les dossiers' },
    { name: 'DECIDER', description: 'Responsable crédit prenant les décisions' },
    { name: 'ADMIN', description: 'Administrateur de la plateforme' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  console.log('✅ Rôles créés');

  // ────────────────────────────────────────────────────────────────────────
  // 2. CRÉATION DES AGENCES
  // ────────────────────────────────────────────────────────────────────────
  console.log('🏢 Création des agences...');

  const agencies = [
    { name: 'Agence Centrale Casablanca', code: 'AG-CASA-001', city: 'Casablanca', address: '123 Boulevard Mohammed V', phone: '+212 522 123456' },
    { name: 'Agence Rabat Centre', code: 'AG-RABAT-001', city: 'Rabat', address: '456 Avenue Hassan II', phone: '+212 537 654321' },
    { name: 'Agence Marrakech', code: 'AG-MARR-001', city: 'Marrakech', address: '789 Rue de la Liberté', phone: '+212 524 987654' },
  ];

  for (const agency of agencies) {
    await prisma.agency.upsert({
      where: { code: agency.code },
      update: {},
      create: agency,
    });
  }

  console.log('✅ Agences créées');

  // ────────────────────────────────────────────────────────────────────────
  // 3. CRÉATION DES UTILISATEURS DE TEST
  // ────────────────────────────────────────────────────────────────────────
  console.log('👥 Création des utilisateurs de test...');

  const passwordHash = await bcrypt.hash('password123', 12);

  // Récupérer les IDs
  const clientRole = await prisma.role.findUnique({ where: { name: 'CLIENT' } });
  const agentRole = await prisma.role.findUnique({ where: { name: 'AGENT' } });
  const analystRole = await prisma.role.findUnique({ where: { name: 'ANALYST' } });
  const deciderRole = await prisma.role.findUnique({ where: { name: 'DECIDER' } });
  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });

  const casaAgency = await prisma.agency.findUnique({ where: { code: 'AG-CASA-001' } });

  // Admin
  await prisma.user.upsert({
    where: { email: 'admin@bank.ma' },
    update: {},
    create: {
      email: 'admin@bank.ma',
      passwordHash,
      firstName: 'Admin',
      lastName: 'System',
      phone: '+212 600 000000',
      isVerified: true,
      roleId: adminRole!.id,
    },
  });

  // Client
  await prisma.user.upsert({
    where: { email: 'client@example.com' },
    update: {},
    create: {
      email: 'client@example.com',
      passwordHash,
      firstName: 'Mohammed',
      lastName: 'Benali',
      phone: '+212 600 111111',
      dateOfBirth: new Date('1990-05-15'),
      nationalId: 'AB123456',
      isVerified: true,
      roleId: clientRole!.id,
    },
  });

  // Agent
  await prisma.user.upsert({
    where: { email: 'agent@bank.ma' },
    update: {},
    create: {
      email: 'agent@bank.ma',
      passwordHash,
      firstName: 'Fatima',
      lastName: 'El Amrani',
      phone: '+212 600 222222',
      isVerified: true,
      roleId: agentRole!.id,
      agencyId: casaAgency!.id,
    },
  });

  // Analyste
  await prisma.user.upsert({
    where: { email: 'analyst@bank.ma' },
    update: {},
    create: {
      email: 'analyst@bank.ma',
      passwordHash,
      firstName: 'Youssef',
      lastName: 'Alaoui',
      phone: '+212 600 333333',
      isVerified: true,
      roleId: analystRole!.id,
    },
  });

  // Décideur
  await prisma.user.upsert({
    where: { email: 'decider@bank.ma' },
    update: {},
    create: {
      email: 'decider@bank.ma',
      passwordHash,
      firstName: 'Karim',
      lastName: 'Bennani',
      phone: '+212 600 444444',
      isVerified: true,
      roleId: deciderRole!.id,
    },
  });

  console.log('✅ Utilisateurs créés');

  console.log('\n🎉 Seeding terminé avec succès!\n');
  console.log('📝 Comptes de test créés:');
  console.log('┌─────────────────────┬───────────────┬───────────────┐');
  console.log('│ Email               │ Mot de passe  │ Rôle          │');
  console.log('├─────────────────────┼───────────────┼───────────────┤');
  console.log('│ admin@bank.ma       │ password123   │ ADMIN         │');
  console.log('│ agent@bank.ma       │ password123   │ AGENT         │');
  console.log('│ analyst@bank.ma     │ password123   │ ANALYST       │');
  console.log('│ decider@bank.ma     │ password123   │ DECIDER       │');
  console.log('│ client@example.com  │ password123   │ CLIENT        │');
  console.log('└─────────────────────┴───────────────┴───────────────┘\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
