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

async function main() {
  console.log('Seeding CardTypes and placeholder Templates...');

  // 1. Seed Business CardType
  const businessCardType = await prisma.cardType.upsert({
    where: { slug: 'business' },
    update: {
      name: 'Business Card',
      description: 'Professional digital business card for founders, executives, and freelancers',
      fieldSchema: businessFieldSchema as any,
      status: 'ACTIVE',
    },
    create: {
      slug: 'business',
      name: 'Business Card',
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
      description: 'Digital identity card for college students, academics, and interns',
      fieldSchema: collegeFieldSchema as any,
      status: 'ACTIVE',
    },
    create: {
      slug: 'college',
      name: 'College / Student Card',
      description: 'Digital identity card for college students, academics, and interns',
      fieldSchema: collegeFieldSchema as any,
      status: 'ACTIVE',
    },
  });

  console.log(
    `✓ Seeded College CardType: ${collegeCardType.id} (${collegeFieldSchema.length} fields)`
  );

  // 3. Seed placeholder Template rows (isActive = false until F-009 template components)
  const businessTemplates = [
    { name: 'Minimal Business', slug: 'minimal' },
    { name: 'Modern Business', slug: 'modern' },
    { name: 'Premium Business', slug: 'premium' },
  ];

  for (const t of businessTemplates) {
    const existing = await prisma.template.findFirst({
      where: { cardTypeId: businessCardType.id, slug: t.slug },
    });
    if (!existing) {
      await prisma.template.create({
        data: {
          cardTypeId: businessCardType.id,
          name: t.name,
          slug: t.slug,
          isActive: false,
          configuration: {},
        },
      });
    }
  }

  const collegeTemplates = [
    { name: 'Academic College', slug: 'academic' },
    { name: 'Creative College', slug: 'creative' },
    { name: 'Modern College', slug: 'modern' },
  ];

  for (const t of collegeTemplates) {
    const existing = await prisma.template.findFirst({
      where: { cardTypeId: collegeCardType.id, slug: t.slug },
    });
    if (!existing) {
      await prisma.template.create({
        data: {
          cardTypeId: collegeCardType.id,
          name: t.name,
          slug: t.slug,
          isActive: false,
          configuration: {},
        },
      });
    }
  }

  console.log('✓ Seeded placeholder Templates for Business and College');
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
