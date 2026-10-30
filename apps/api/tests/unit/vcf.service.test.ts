import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CardStatus, ErrorCode } from '@nfc-card/shared';
import { vcfService } from '../../src/services/vcf.service.js';
import { profileRepository } from '../../src/repositories/profile.repository.js';

describe('VCF Contact Service Unit Tests (F-013)', () => {
  const dummyFieldSchema = [
    {
      key: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      defaultVisible: true,
    },
    {
      key: 'designation',
      label: 'Designation',
      type: 'text',
      required: false,
      defaultVisible: true,
    },
    {
      key: 'company',
      label: 'Company',
      type: 'text',
      required: false,
      defaultVisible: true,
    },
    {
      key: 'phone',
      label: 'Phone Number',
      type: 'phone',
      required: false,
      defaultVisible: true,
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      type: 'phone',
      required: false,
      defaultVisible: true,
    },
    {
      key: 'email',
      label: 'Email',
      type: 'email',
      required: false,
      defaultVisible: true,
    },
    {
      key: 'website',
      label: 'Website',
      type: 'url',
      required: false,
      defaultVisible: true,
    },
    {
      key: 'address',
      label: 'Address',
      type: 'address',
      required: false,
      defaultVisible: false,
    },
    {
      key: 'bio',
      label: 'Bio',
      type: 'long_text',
      required: false,
      defaultVisible: true,
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      type: 'url',
      required: false,
      defaultVisible: true,
    },
  ];

  const dummyCardType = {
    id: 'ct-business',
    name: 'Business Card',
    slug: 'business',
    fieldSchema: dummyFieldSchema,
  };

  const dummyCard = {
    id: 'card-1',
    cardNumber: 'BC-000001',
    publicToken: 'tok-vcf-test',
    cardTypeId: 'ct-business',
    status: CardStatus.ACTIVE,
    cardType: dummyCardType,
    assignments: [
      {
        id: 'assign-1',
        userId: 'user-1',
        cardId: 'card-1',
        status: 'ACTIVE',
        user: {
          id: 'user-1',
          profiles: [
            {
              id: 'prof-1',
              userId: 'user-1',
              cardTypeId: 'ct-business',
              status: 'published',
              data: {
                name: 'Jane Doe',
                designation: 'Senior Architect',
                company: 'Acme Corp',
                phone: '+15551234567',
                whatsapp: '+15559876543',
                email: 'jane@acme.com',
                website: 'https://jane.dev',
                address: '123 Market St, Suite 400\nSan Francisco, CA',
                bio: 'Passionate software designer & speaker.',
                linkedin: 'https://linkedin.com/in/janedoe',
              },
              fieldVisibility: {
                name: true,
                designation: true,
                company: true,
                phone: true,
                whatsapp: true,
                email: true,
                website: true,
                address: true,
                bio: true,
                linkedin: true,
              },
            },
          ],
        },
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates a valid vCard 3.0 with all visible public fields and CRLF line breaks', async () => {
    vi.spyOn(profileRepository, 'findByPublicTokenWithActiveProfile').mockResolvedValue(
      dummyCard as any
    );

    const result = await vcfService.generateVcf('tok-vcf-test', 'business');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.filename).toBe('Jane_Doe.vcf');
    const vcf = result.data.vcf;

    // Check vCard structure & RFC 2426 compliance
    expect(vcf).toContain('BEGIN:VCARD\r\n');
    expect(vcf).toContain('VERSION:3.0\r\n');
    expect(vcf).toContain('FN:Jane Doe\r\n');
    expect(vcf).toContain('N:Doe;Jane;;;\r\n');
    expect(vcf).toContain('ORG:Acme Corp\r\n');
    expect(vcf).toContain('TITLE:Senior Architect\r\n');
    expect(vcf).toContain('TEL;TYPE=CELL,VOICE:+15551234567\r\n');
    expect(vcf).toContain('TEL;TYPE=WORK,VOICE:+15559876543\r\n');
    expect(vcf).toContain('EMAIL;TYPE=PREF,INTERNET:jane@acme.com\r\n');
    expect(vcf).toContain('URL:https://jane.dev\r\n');
    expect(vcf).toContain('NOTE:Passionate software designer & speaker.\r\n');
    expect(vcf).toContain('X-SOCIALPROFILE;TYPE=linkedin:https://linkedin.com/in/janedoe\r\n');
    expect(vcf).toContain('END:VCARD\r\n');
  });

  it('strictly excludes hidden phone and email from the vCard when visibility is false', async () => {
    const cardWithHiddenFields = JSON.parse(JSON.stringify(dummyCard));
    cardWithHiddenFields.assignments[0].user.profiles[0].fieldVisibility = {
      name: true,
      phone: false, // Phone hidden by customer!
      email: false, // Email hidden by customer!
      address: false, // Address hidden
    };

    vi.spyOn(profileRepository, 'findByPublicTokenWithActiveProfile').mockResolvedValue(
      cardWithHiddenFields as any
    );

    const result = await vcfService.generateVcf('tok-vcf-test');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const vcf = result.data.vcf;
    expect(vcf).not.toContain('TEL;TYPE=CELL');
    expect(vcf).not.toContain('+15551234567');
    expect(vcf).not.toContain('EMAIL');
    expect(vcf).not.toContain('jane@acme.com');
    expect(vcf).not.toContain('ADR');
    expect(vcf).toContain('FN:Jane Doe');
    expect(vcf).toContain('ORG:Acme Corp');
  });

  it('escapes commas, semicolons, and newlines per RFC 2426', async () => {
    const cardWithSpecialChars = JSON.parse(JSON.stringify(dummyCard));
    cardWithSpecialChars.assignments[0].user.profiles[0].data = {
      name: 'Dr. Jane Doe, Jr.',
      company: 'Acme; Widgets, Inc.',
      bio: 'Line 1\nLine 2',
    };
    cardWithSpecialChars.assignments[0].user.profiles[0].fieldVisibility = {
      name: true,
      company: true,
      bio: true,
    };

    vi.spyOn(profileRepository, 'findByPublicTokenWithActiveProfile').mockResolvedValue(
      cardWithSpecialChars as any
    );

    const result = await vcfService.generateVcf('tok-vcf-test');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const vcf = result.data.vcf;
    expect(vcf).toContain('FN:Dr. Jane Doe\\, Jr.\r\n');
    expect(vcf).toContain('ORG:Acme\\; Widgets\\, Inc.\r\n');
    expect(vcf).toContain('NOTE:Line 1\\nLine 2\r\n');
  });

  it('returns 403 CARD_PAUSED when card is paused (no contact data served)', async () => {
    const pausedCard = {
      ...dummyCard,
      status: CardStatus.PAUSED,
    };

    vi.spyOn(profileRepository, 'findByPublicTokenWithActiveProfile').mockResolvedValue(
      pausedCard as any
    );

    const result = await vcfService.generateVcf('tok-vcf-test');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.code).toBe(ErrorCode.CARD_PAUSED);
  });

  it('returns 403 CARD_SUSPENDED when card is suspended', async () => {
    const suspendedCard = {
      ...dummyCard,
      status: CardStatus.SUSPENDED,
    };

    vi.spyOn(profileRepository, 'findByPublicTokenWithActiveProfile').mockResolvedValue(
      suspendedCard as any
    );

    const result = await vcfService.generateVcf('tok-vcf-test');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.code).toBe(ErrorCode.CARD_SUSPENDED);
  });

  it('returns 404 CARD_NOT_AVAILABLE when card is available (unactivated)', async () => {
    const availableCard = {
      ...dummyCard,
      status: CardStatus.AVAILABLE,
    };

    vi.spyOn(profileRepository, 'findByPublicTokenWithActiveProfile').mockResolvedValue(
      availableCard as any
    );

    const result = await vcfService.generateVcf('tok-vcf-test');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.code).toBe(ErrorCode.CARD_NOT_AVAILABLE);
  });

  it('returns 404 CARD_NOT_FOUND when token does not match any card', async () => {
    vi.spyOn(profileRepository, 'findByPublicTokenWithActiveProfile').mockResolvedValue(null);

    const result = await vcfService.generateVcf('non-existent');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.code).toBe(ErrorCode.CARD_NOT_FOUND);
  });

  it('returns 404 CARD_TYPE_MISMATCH when URL card type slug differs from actual card type', async () => {
    vi.spyOn(profileRepository, 'findByPublicTokenWithActiveProfile').mockResolvedValue(
      dummyCard as any
    );

    const result = await vcfService.generateVcf('tok-vcf-test', 'college');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.code).toBe(ErrorCode.CARD_TYPE_MISMATCH);
  });

  it('returns 404 PROFILE_NOT_FOUND when profile is still in draft status', async () => {
    const draftCard = JSON.parse(JSON.stringify(dummyCard));
    draftCard.assignments[0].user.profiles[0].status = 'draft';

    vi.spyOn(profileRepository, 'findByPublicTokenWithActiveProfile').mockResolvedValue(
      draftCard as any
    );

    const result = await vcfService.generateVcf('tok-vcf-test');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.code).toBe(ErrorCode.PROFILE_NOT_FOUND);
  });
});
