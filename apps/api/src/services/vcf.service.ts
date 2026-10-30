import { CardStatus, ErrorCode } from '@nfc-card/shared';
import type { FieldSchemaItem } from '@nfc-card/shared';
import { profileRepository } from '../repositories/profile.repository.js';
import type { ServiceResult } from './profile.service.js';

export interface VcfResult {
  vcf: string;
  filename: string;
}

/**
 * Escapes characters for vCard 3.0 TEXT types per RFC 2426.
 * Commas, semicolons, and backslashes are escaped with backslash.
 * Newlines are replaced with literal \n.
 */
function escapeVcfText(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Normalizes and strips newlines from URI/URL values.
 */
function escapeVcfUri(uri: string): string {
  return uri.replace(/\r\n|\r|\n/g, '').trim();
}

/**
 * Creates a header-safe ASCII filename from a display name.
 */
function formatVcfFilename(name: string): string {
  const sanitized = name
    .trim()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return `${sanitized || 'contact'}.vcf`;
}

export const vcfService = {
  /**
   * Generates a vCard (.vcf) formatted according to vCard 3.0 specification.
   * Server-side visibility is strictly enforced: any field hidden by the customer
   * is completely excluded from the resulting vCard.
   *
   * Gated by card lifecycle rules:
   * - PAUSED card -> 403 CARD_PAUSED (no contact data served)
   * - SUSPENDED card -> 403 CARD_SUSPENDED
   * - DEACTIVATED card -> 403 CARD_DEACTIVATED_PERMANENT
   * - AVAILABLE card -> 404 CARD_NOT_AVAILABLE
   * - Unpublished/Draft profile -> 404 PROFILE_NOT_FOUND
   */
  async generateVcf(token: string, expectedTypeSlug?: string): Promise<ServiceResult<VcfResult>> {
    const card = await profileRepository.findByPublicTokenWithActiveProfile(token);

    if (!card) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_NOT_FOUND,
        message: 'Card not found.',
      };
    }

    const { cardType } = card;

    // Optional card type check (e.g. /p/business/:token/contact.vcf)
    if (expectedTypeSlug && cardType.slug.toLowerCase() !== expectedTypeSlug.toLowerCase()) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_TYPE_MISMATCH,
        message: 'The card type in the URL does not match this card.',
      };
    }

    // Lifecycle status checks (PRD §18, §23)
    if (card.status === CardStatus.PAUSED) {
      return {
        ok: false,
        status: 403,
        code: ErrorCode.CARD_PAUSED,
        message: 'This card profile is currently paused by its owner.',
      };
    }

    if (card.status === CardStatus.SUSPENDED) {
      return {
        ok: false,
        status: 403,
        code: ErrorCode.CARD_SUSPENDED,
        message: 'This card profile is suspended.',
      };
    }

    if (card.status === CardStatus.DEACTIVATED) {
      return {
        ok: false,
        status: 403,
        code: ErrorCode.CARD_DEACTIVATED_PERMANENT,
        message: 'This card is permanently deactivated.',
      };
    }

    if (card.status === CardStatus.AVAILABLE) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_NOT_AVAILABLE,
        message: 'This card is not yet activated.',
      };
    }

    if (card.status !== CardStatus.ACTIVE) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_NOT_ACTIVE,
        message: 'This card is not active.',
      };
    }

    // Resolve active assignment & published profile
    const activeAssignment = card.assignments?.[0];
    const user = activeAssignment?.user;
    const profile = user?.profiles?.[0];

    if (!profile || profile.status !== 'published') {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.PROFILE_NOT_FOUND,
        message: 'No published profile found for this card.',
      };
    }

    // STRICT SERVER-SIDE VISIBILITY ENFORCEMENT
    const fieldSchema = (cardType.fieldSchema as unknown as FieldSchemaItem[]) || [];
    const visibility = (profile.fieldVisibility as Record<string, boolean>) || {};
    const rawData = (profile.data as Record<string, unknown>) || {};
    const publicData: Record<string, unknown> = {};

    for (const field of fieldSchema) {
      const isVisible = field.key in visibility ? visibility[field.key] : field.defaultVisible;
      if (isVisible && rawData[field.key] !== undefined && rawData[field.key] !== null) {
        publicData[field.key] = rawData[field.key];
      }
    }

    // Extract display values
    const rawName = typeof publicData.name === 'string' ? publicData.name.trim() : '';
    const fullName = rawName || 'Digital Card';

    const company =
      typeof publicData.company === 'string' && publicData.company.trim()
        ? publicData.company.trim()
        : typeof publicData.college === 'string' && publicData.college.trim()
          ? publicData.college.trim()
          : undefined;

    const designation =
      typeof publicData.designation === 'string' && publicData.designation.trim()
        ? publicData.designation.trim()
        : typeof publicData.course === 'string' && publicData.course.trim()
          ? publicData.course.trim()
          : undefined;

    const phone =
      typeof publicData.phone === 'string' && publicData.phone.trim()
        ? publicData.phone.trim()
        : undefined;

    const whatsapp =
      typeof publicData.whatsapp === 'string' && publicData.whatsapp.trim()
        ? publicData.whatsapp.trim()
        : undefined;

    const email =
      typeof publicData.email === 'string' && publicData.email.trim()
        ? publicData.email.trim()
        : typeof publicData.student_email === 'string' && publicData.student_email.trim()
          ? publicData.student_email.trim()
          : undefined;

    const website =
      typeof publicData.website === 'string' && publicData.website.trim()
        ? publicData.website.trim()
        : typeof publicData.portfolio === 'string' && publicData.portfolio.trim()
          ? publicData.portfolio.trim()
          : undefined;

    const address =
      typeof publicData.address === 'string' && publicData.address.trim()
        ? publicData.address.trim()
        : undefined;

    const bio =
      typeof publicData.bio === 'string' && publicData.bio.trim()
        ? publicData.bio.trim()
        : typeof publicData.about === 'string' && publicData.about.trim()
          ? publicData.about.trim()
          : undefined;

    const photo =
      typeof publicData.photo === 'string' && publicData.photo.trim()
        ? publicData.photo.trim()
        : undefined;

    // Structured name parsing (Family Name; Given Name; Additional Names; Prefixes; Suffixes)
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    let givenName = '';
    let familyName = '';
    if (nameParts.length === 1) {
      givenName = nameParts[0];
    } else if (nameParts.length > 1) {
      givenName = nameParts[0];
      familyName = nameParts.slice(1).join(' ');
    }

    // Build vCard 3.0 format lines
    const vcardLines: string[] = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${escapeVcfText(fullName)}`,
      `N:${escapeVcfText(familyName)};${escapeVcfText(givenName)};;;`,
    ];

    if (company) {
      vcardLines.push(`ORG:${escapeVcfText(company)}`);
    }

    if (designation) {
      vcardLines.push(`TITLE:${escapeVcfText(designation)}`);
    }

    if (phone) {
      vcardLines.push(`TEL;TYPE=CELL,VOICE:${escapeVcfText(phone)}`);
    }

    if (whatsapp && whatsapp !== phone) {
      vcardLines.push(`TEL;TYPE=WORK,VOICE:${escapeVcfText(whatsapp)}`);
    }

    if (email) {
      vcardLines.push(`EMAIL;TYPE=PREF,INTERNET:${escapeVcfText(email)}`);
    }

    if (website) {
      vcardLines.push(`URL:${escapeVcfUri(website)}`);
    }

    if (address) {
      // ADR fields: PO Box; Extended Addr; Street; City; Region; Postal Code; Country
      const formattedAddress = escapeVcfText(address.replace(/\r\n|\r|\n/g, ', '));
      vcardLines.push(`ADR;TYPE=WORK:;;${formattedAddress};;;;`);
    }

    if (bio) {
      vcardLines.push(`NOTE:${escapeVcfText(bio)}`);
    }

    if (photo) {
      vcardLines.push(`PHOTO;VALUE=URI:${escapeVcfUri(photo)}`);
    }

    // Social links supported in standard X-SOCIALPROFILE
    const socialKeys = ['linkedin', 'twitter', 'x', 'github', 'instagram'] as const;
    for (const key of socialKeys) {
      const val = publicData[key];
      if (typeof val === 'string' && val.trim()) {
        vcardLines.push(`X-SOCIALPROFILE;TYPE=${key}:${escapeVcfUri(val.trim())}`);
      }
    }

    vcardLines.push('END:VCARD');

    // RFC 2426 requires CRLF (\r\n) line endings
    const vcf = vcardLines.join('\r\n') + '\r\n';
    const filename = formatVcfFilename(fullName);

    return {
      ok: true,
      data: {
        vcf,
        filename,
      },
    };
  },
};
