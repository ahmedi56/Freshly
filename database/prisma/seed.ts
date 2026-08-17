import { PrismaClient, Role, CleanerApplicationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var ${name} — set it in .env before seeding`,
    );
  }
  return value;
}

async function main() {
  const BCRYPT_COST = 12;

  // ---- Demo accounts (credentials from env, never hardcoded) ----
  const adminEmail = requireEnv('SEED_ADMIN_EMAIL');
  const adminPassword = requireEnv('SEED_ADMIN_PASSWORD');
  const customerEmail = requireEnv('SEED_CUSTOMER_EMAIL');
  const customerPassword = requireEnv('SEED_CUSTOMER_PASSWORD');
  const cleanerEmail = requireEnv('SEED_CLEANER_EMAIL');
  const cleanerPassword = requireEnv('SEED_CLEANER_PASSWORD');

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, BCRYPT_COST),
      role: Role.ADMIN,
      emailVerifiedAt: new Date(),
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: customerEmail },
    update: {},
    create: {
      email: customerEmail,
      passwordHash: await bcrypt.hash(customerPassword, BCRYPT_COST),
      role: Role.CUSTOMER,
      emailVerifiedAt: new Date(),
      customerProfile: {
        create: { firstName: 'Thabo', lastName: 'Mokoena', phone: '+27821234567' },
      },
    },
    include: { customerProfile: true },
  });

  const cleanerUser = await prisma.user.upsert({
    where: { email: cleanerEmail },
    update: {},
    create: {
      email: cleanerEmail,
      passwordHash: await bcrypt.hash(cleanerPassword, BCRYPT_COST),
      role: Role.CLEANER,
      emailVerifiedAt: new Date(),
      cleanerProfile: {
        create: {
          firstName: 'Sarah',
          lastName: 'Mahlangu',
          phone: '+27837654321',
          bio: 'Experienced residential cleaner, 5 years in the industry.',
        },
      },
    },
    include: { cleanerProfile: true },
  });

  if (cleanerUser.cleanerProfile) {
    await prisma.cleanerApplication.upsert({
      where: { cleanerProfileId: cleanerUser.cleanerProfile.id },
      update: {},
      create: {
        cleanerProfileId: cleanerUser.cleanerProfile.id,
        status: CleanerApplicationStatus.APPROVED,
        dateOfBirth: new Date('1990-05-14'),
        addressLine1: '45 Vilakazi St',
        city: 'Soweto',
        province: 'Gauteng',
        postalCode: '1818',
        idNumber: '9005145800086',
        criminalRecordDeclaration: true,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });
  }

  // ---- Service catalog ----
  const homeCategory = await prisma.serviceCategory.upsert({
    where: { slug: 'home-cleaning' },
    update: {},
    create: {
      name: 'Home Cleaning',
      slug: 'home-cleaning',
      description: 'Standard residential cleaning services.',
      sortOrder: 1,
    },
  });

  const officeCategory = await prisma.serviceCategory.upsert({
    where: { slug: 'office-cleaning' },
    update: {},
    create: {
      name: 'Office Cleaning',
      slug: 'office-cleaning',
      description: 'Commercial and office cleaning services.',
      sortOrder: 2,
    },
  });

  const standardHomeCleaning = await prisma.service.upsert({
    where: { slug: 'standard-home-cleaning' },
    update: {},
    create: {
      categoryId: homeCategory.id,
      name: 'Standard Home Cleaning',
      slug: 'standard-home-cleaning',
      description: 'Full home clean covering all living areas.',
      basePrice: '650.00',
      estimatedDurationMinutes: 150,
    },
  });

  await prisma.service.upsert({
    where: { slug: 'office-cleaning-standard' },
    update: {},
    create: {
      categoryId: officeCategory.id,
      name: 'Office Cleaning',
      slug: 'office-cleaning-standard',
      description: 'Weekday office cleaning package.',
      basePrice: '399.00',
      estimatedDurationMinutes: 120,
    },
  });

  await prisma.servicePricing.upsert({
    where: { id: 'seed-pricing-home-1-2' },
    update: {},
    create: {
      id: 'seed-pricing-home-1-2',
      serviceId: standardHomeCleaning.id,
      minRooms: 1,
      maxRooms: 2,
      multiplier: '1.00',
    },
  });
  await prisma.servicePricing.upsert({
    where: { id: 'seed-pricing-home-3-4' },
    update: {},
    create: {
      id: 'seed-pricing-home-3-4',
      serviceId: standardHomeCleaning.id,
      minRooms: 3,
      maxRooms: 4,
      multiplier: '1.35',
    },
  });

  const extraNames: Array<{ name: string; price: string }> = [
    { name: 'Windows', price: '80.00' },
    { name: 'Oven', price: '90.00' },
    { name: 'Fridge', price: '70.00' },
  ];
  for (const e of extraNames) {
    const extra = await prisma.serviceExtra.upsert({
      where: { id: `seed-extra-${e.name.toLowerCase()}` },
      update: {},
      create: {
        id: `seed-extra-${e.name.toLowerCase()}`,
        name: e.name,
        price: e.price,
      },
    });
    await prisma.serviceExtraOnService.upsert({
      where: {
        serviceId_serviceExtraId: {
          serviceId: standardHomeCleaning.id,
          serviceExtraId: extra.id,
        },
      },
      update: {},
      create: {
        serviceId: standardHomeCleaning.id,
        serviceExtraId: extra.id,
      },
    });
  }

  // ---- Sample address + promotion ----
  if (customerUser.customerProfile) {
    await prisma.address.upsert({
      where: { id: 'seed-address-1' },
      update: {},
      create: {
        id: 'seed-address-1',
        customerProfileId: customerUser.customerProfile.id,
        label: 'Home',
        line1: '123 Main Rd',
        city: 'Sandton',
        province: 'Gauteng',
        postalCode: '2196',
        isDefault: true,
      },
    });

    await prisma.loyaltyAccount.upsert({
      where: { customerProfileId: customerUser.customerProfile.id },
      update: {},
      create: { customerProfileId: customerUser.customerProfile.id, pointsBalance: 0 },
    });
  }

  await prisma.promotion.upsert({
    where: { code: 'WELCOME50' },
    update: {},
    create: {
      code: 'WELCOME50',
      description: 'R50 off your first booking',
      type: 'FIXED_AMOUNT',
      value: '50.00',
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2027-01-01'),
      usageLimit: 1000,
      active: true,
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete:', {
    admin: admin.email,
    customer: customerUser.email,
    cleaner: cleanerUser.email,
  });
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
