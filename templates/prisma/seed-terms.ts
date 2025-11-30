import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function seedTerms() {
  console.log('🌱 Seeding terms of service...');

  // Read terms from markdown file
  const termsPath = path.join(process.cwd(), 'legal', 'terms-of-service-v1.md');

  if (!fs.existsSync(termsPath)) {
    console.error(`❌ Terms file not found at: ${termsPath}`);
    console.error('Please create legal/terms-of-service-v1.md before running this seed script.');
    process.exit(1);
  }

  const termsContent = fs.readFileSync(termsPath, 'utf-8');

  // Check if terms already exist
  const existingTerms = await prisma.terms.findFirst({
    where: { version: '1.0.0' }
  });

  if (existingTerms) {
    console.log('ℹ️  Terms v1.0.0 already exist, skipping...');
    return;
  }

  // Create initial terms
  await prisma.terms.create({
    data: {
      version: '1.0.0',
      content: termsContent,
      effectiveDate: new Date(),
      isCurrent: true,
    },
  });

  console.log('✅ Seeded Terms v1.0.0');
}

seedTerms()
  .catch((e) => {
    console.error('❌ Error seeding terms:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
