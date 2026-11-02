import { describe, it, expect } from 'vitest';
import { normalizeUrl, photoUrl, socialLinks, initialOf } from '@nfc-card/shared/templates';

describe('Template Helpers', () => {
  describe('normalizeUrl', () => {
    it('returns undefined for empty or missing input', () => {
      expect(normalizeUrl(undefined)).toBeUndefined();
      expect(normalizeUrl('')).toBeUndefined();
      expect(normalizeUrl('   ')).toBeUndefined();
    });

    it('preserves existing https and http URLs', () => {
      expect(normalizeUrl('https://example.com/me')).toBe('https://example.com/me');
      expect(normalizeUrl('http://example.com/me')).toBe('http://example.com/me');
    });

    it('prepends https to raw domains and paths', () => {
      expect(normalizeUrl('example.com/profile')).toBe('https://example.com/profile');
      expect(normalizeUrl('//cdn.example.com/img.jpg')).toBe('https://cdn.example.com/img.jpg');
    });

    it('normalizes email addresses to mailto: format', () => {
      expect(normalizeUrl('user@domain.com')).toBe('mailto:user@domain.com');
    });
  });

  describe('photoUrl', () => {
    it('extracts and normalizes photo URL from profile data', () => {
      expect(photoUrl({ photo: 'https://cdn.example.com/avatar.jpg' })).toBe(
        'https://cdn.example.com/avatar.jpg'
      );
      expect(photoUrl({ photo: '' })).toBeUndefined();
      expect(photoUrl({})).toBeUndefined();
    });
  });

  describe('initialOf', () => {
    it('returns uppercase initial of person name', () => {
      expect(initialOf('John Doe')).toBe('J');
      expect(initialOf('alice')).toBe('A');
      expect(initialOf('')).toBe('#');
      expect(initialOf(undefined)).toBe('#');
    });
  });

  describe('socialLinks', () => {
    it('extracts configured social platform links', () => {
      const data = {
        linkedin: 'linkedin.com/in/johndoe',
        github: 'https://github.com/johndoe',
      };
      const links = socialLinks(data);
      expect(links.length).toBe(2);
      expect(links.find((l) => l.key === 'linkedin')?.href).toBe('https://linkedin.com/in/johndoe');
      expect(links.find((l) => l.key === 'github')?.href).toBe('https://github.com/johndoe');
    });
  });
});
