import 'dotenv/config';
import type { FieldSchema } from '@nfc-card/shared';
import { prisma } from '../src/lib/prisma.js';

export const businessFieldSchema: FieldSchema = [
  {
    key: 'photo',
    label: 'Profile Photo',
    type: 'image',
    required: false,
    defaultVisible: true,
    placeholder: 'Upload your profile photo',
  },
  {
    key: 'name',
    label: 'Full Name',
    type: 'text',
    required: true,
    defaultVisible: true,
    placeholder: 'e.g. John Doe',
  },
  {
    key: 'designation',
    label: 'Designation / Title',
    type: 'text',
    required: false,
    defaultVisible: true,
    placeholder: 'e.g. Founder & CEO',
  },
  {
    key: 'company',
    label: 'Company Name',
    type: 'text',
    required: false,
    defaultVisible: true,
    placeholder: 'e.g. Acme Corp',
  },
  {
    key: 'bio',
    label: 'About / Bio',
    type: 'long_text',
    required: false,
    defaultVisible: true,
    placeholder: 'Brief summary about yourself or business',
  },
  {
    key: 'phone',
    label: 'Phone Number',
    type: 'phone',
    required: false,
    defaultVisible: true,
    placeholder: 'e.g. +1234567890',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    type: 'phone',
    required: false,
    defaultVisible: true,
    placeholder: 'e.g. +1234567890',
  },
  {
    key: 'email',
    label: 'Email Address',
    type: 'email',
    required: false,
    defaultVisible: true,
    placeholder: 'e.g. john@example.com',
  },
  {
    key: 'website',
    label: 'Website',
    type: 'url',
    required: false,
    defaultVisible: true,
    placeholder: 'https://example.com',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    type: 'url',
    required: false,
    defaultVisible: true,
    placeholder: 'https://instagram.com/username',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    type: 'url',
    required: false,
    defaultVisible: true,
    placeholder: 'https://linkedin.com/in/username',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    type: 'url',
    required: false,
    defaultVisible: true,
    placeholder: 'https://facebook.com/username',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    type: 'url',
    required: false,
    defaultVisible: true,
    placeholder: 'https://youtube.com/@channel',
  },
  {
    key: 'address',
    label: 'Address',
    type: 'address',
    required: false,
    defaultVisible: false,
    placeholder: 'Street, City, Country',
  },
  {
    key: 'google_maps',
    label: 'Google Maps Link',
    type: 'url',
    required: false,
    defaultVisible: true,
    placeholder: 'https://maps.google.com/...',
  },
  {
    key: 'services',
    label: 'Services Offered',
    type: 'list_of_strings',
    required: false,
    defaultVisible: true,
    placeholder: 'e.g. Consulting, Design, Development',
  },
];

export const collegeFieldSchema: FieldSchema = [
  {
    key: 'photo',
    label: 'Profile Photo',
    type: 'image',
    required: false,
    defaultVisible: true,
    placeholder: 'Upload your student photo',
  },
  {
    key: 'name',
    label: 'Full Name',
    type: 'text',
    required: true,
    defaultVisible: true,
    placeholder: 'e.g. Jane Smith',
  },
  {
    key: 'college',
    label: 'College / University',
    type: 'text',
    required: false,
    defaultVisible: true,
    placeholder: 'e.g. Stanford University',
  },
  {
    key: 'course',
    label: 'Course / Degree',
    type: 'text',
    required: false,
    defaultVisible: true,
    placeholder: 'e.g. B.Tech Computer Science',
  },
  {
    key: 'branch',
    label: 'Branch / Specialization',
    type: 'text',
    required: false,
    defaultVisible: true,
    placeholder: 'e.g. Artificial Intelligence',
  },
  {
    key: 'semester',
    label: 'Semester / Year',
    type: 'text',
    required: false,
    defaultVisible: true,
    placeholder: 'e.g. Year 3 / Semester 6',
  },
  {
    key: 'student_id',
    label: 'Student ID',
    type: 'text',
    required: false,
    defaultVisible: false,
    placeholder: 'e.g. STU-2026-089',
  },
  {
    key: 'student_email',
    label: 'College Email',
    type: 'email',
    required: false,
    defaultVisible: true,
    placeholder: 'e.g. jane@univ.edu',
  },
  {
    key: 'phone',
    label: 'Phone Number',
    type: 'phone',
    required: false,
    defaultVisible: true,
    placeholder: 'e.g. +1234567890',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    type: 'url',
    required: false,
    defaultVisible: true,
    placeholder: 'https://linkedin.com/in/username',
  },
  {
    key: 'portfolio',
    label: 'Portfolio URL',
    type: 'url',
    required: false,
    defaultVisible: true,
    placeholder: 'https://janesmith.dev',
  },
  {
    key: 'skills',
    label: 'Skills',
    type: 'list_of_strings',
    required: false,
    defaultVisible: true,
    placeholder: 'e.g. TypeScript, React, Python',
  },
  {
    key: 'achievements',
    label: 'Achievements',
    type: 'list_of_strings',
    required: false,
    defaultVisible: true,
    placeholder: 'e.g. Hackathon Winner, Dean’s List',
  },
  {
    key: 'about',
    label: 'About / Bio',
    type: 'long_text',
    required: false,
    defaultVisible: true,
    placeholder: 'Passionate CS undergrad exploring AI systems',
  },
];

interface TemplateSeed {
  name: string;
  slug: string;
  sortOrder: number;
  isPremium: boolean;
  configuration: Record<string, unknown>;
}

/** Idempotently upsert a card type's template library and deactivate legacy rows. */
async function seedTemplates(cardTypeId: string, templates: TemplateSeed[]) {
  for (const t of templates) {
    const existing = await prisma.template.findFirst({
      where: { cardTypeId, slug: t.slug },
    });

    if (existing) {
      await prisma.template.update({
        where: { id: existing.id },
        data: {
          name: t.name,
          sortOrder: t.sortOrder,
          isPremium: t.isPremium,
          isActive: true,
          configuration: t.configuration as any,
        },
      });
    } else {
      await prisma.template.create({
        data: {
          cardTypeId,
          name: t.name,
          slug: t.slug,
          sortOrder: t.sortOrder,
          isPremium: t.isPremium,
          isActive: true,
          configuration: t.configuration as any,
        },
      });
    }
  }

  // Retire any legacy/placeholder templates that are no longer part of the library.
  const activeSlugs = templates.map((t) => t.slug);
  await prisma.template.updateMany({
    where: { cardTypeId, slug: { notIn: activeSlugs } },
    data: { isActive: false },
  });
}

async function main() {
  console.log('Seeding CardTypes and template library...');

  // 1. Seed Business CardType
  const businessCardType = await prisma.cardType.upsert({
    where: { slug: 'business' },
    update: {
      name: 'Business Card',
      cardNumberPrefix: 'BC',
      description: 'Professional digital business card for founders, executives, and freelancers',
      fieldSchema: businessFieldSchema as any,
      status: 'ACTIVE',
    },
    create: {
      slug: 'business',
      name: 'Business Card',
      cardNumberPrefix: 'BC',
      description: 'Professional digital business card for founders, executives, and freelancers',
      fieldSchema: businessFieldSchema as any,
      status: 'ACTIVE',
    },
  });

  console.log(
    `✓ Seeded Business CardType: ${businessCardType.id} (${businessFieldSchema.length} fields)`
  );

  // 2. Seed College CardType
  const collegeCardType = await prisma.cardType.upsert({
    where: { slug: 'college' },
    update: {
      name: 'College / Student Card',
      cardNumberPrefix: 'CC',
      description: 'Digital identity card for college students, academics, and interns',
      fieldSchema: collegeFieldSchema as any,
      status: 'ACTIVE',
    },
    create: {
      slug: 'college',
      name: 'College / Student Card',
      cardNumberPrefix: 'CC',
      description: 'Digital identity card for college students, academics, and interns',
      fieldSchema: collegeFieldSchema as any,
      status: 'ACTIVE',
    },
  });

  console.log(
    `✓ Seeded College CardType: ${collegeCardType.id} (${collegeFieldSchema.length} fields)`
  );

  // 3. Seed the MVP template library (F-009): 3 Business + 3 College templates.
  // Slugs are globally unique and prefixed by card type to match the registry
  // keys in `packages/shared/src/templates`.
  const businessTemplates = [
    {
      name: 'Modern',
      slug: 'business-modern',
      sortOrder: 1,
      isPremium: false,
      configuration: {
        description: 'Clean layout with a large photo, accent bar, and icon social links.',
      },
    },
    {
      name: 'Minimal',
      slug: 'business-minimal',
      sortOrder: 2,
      isPremium: false,
      configuration: { description: 'Text-first, monochrome, generous whitespace.' },
    },
    {
      name: 'Premium',
      slug: 'business-premium',
      sortOrder: 3,
      isPremium: true,
      configuration: {
        description: 'Gradient backdrop, card-style layout, dominant save-contact CTA.',
      },
    },
  ];

  const collegeTemplates = [
    {
      name: 'Academic',
      slug: 'college-academic',
      sortOrder: 1,
      isPremium: false,
      configuration: {
        description: 'Formal institution-style layout with clean skills and achievements lists.',
      },
    },
    {
      name: 'Modern',
      slug: 'college-modern',
      sortOrder: 2,
      isPremium: false,
      configuration: { description: 'Colourful card layout, circular photo, social chips.' },
    },
    {
      name: 'Creative',
      slug: 'college-creative',
      sortOrder: 3,
      isPremium: true,
      configuration: { description: 'Portfolio-forward, bold typography, skills as tags.' },
    },
  ];

  await seedTemplates(businessCardType.id, businessTemplates);
  await seedTemplates(collegeCardType.id, collegeTemplates);

  console.log('✓ Seeded 6 MVP Templates (Business + College)');
  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
