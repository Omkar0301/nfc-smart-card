import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CardStatus, ErrorCode } from '@nfc-card/shared';
import { analyticsService, BOT_UA_REGEX } from '../../src/services/analytics.service.js';
import { analyticsRepository } from '../../src/repositories/analytics.repository.js';
import { profileRepository } from '../../src/repositories/profile.repository.js';

describe('Analytics Service Unit Tests (F-014)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Bot User-Agent Detection Regex', () => {
    it('detects common web crawlers and search engine bots', () => {
      const bots = [
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
        'Twitterbot/1.0',
        'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'WhatsApp/2.21.12.21 A',
        'TelegramBot (like TwitterBot)',
        'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
        'curl/7.68.0',
        'python-requests/2.25.1',
      ];

      for (const ua of bots) {
        expect(BOT_UA_REGEX.test(ua)).toBe(true);
      }
    });

    it('does not flag standard browser user agents as bots', () => {
      const browsers = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
      ];

      for (const ua of browsers) {
        expect(BOT_UA_REGEX.test(ua)).toBe(false);
      }
    });
  });

  describe('recordEvent', () => {
    it('returns 404 when card token does not exist', async () => {
      vi.spyOn(analyticsRepository, 'findCardByPublicToken').mockResolvedValue(null);

      const result = await analyticsService.recordEvent({
        cardToken: 'nonexistent-token',
        eventType: 'PROFILE_VIEW',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(404);
        expect(result.code).toBe(ErrorCode.CARD_NOT_FOUND);
      }
    });

    it('returns 400 when card is not ACTIVE (PAUSED, SUSPENDED, AVAILABLE)', async () => {
      vi.spyOn(analyticsRepository, 'findCardByPublicToken').mockResolvedValue({
        id: 'card-1',
        cardNumber: 'BC-000001',
        status: CardStatus.PAUSED,
        cardTypeId: 'ct-1',
        assignments: [],
      } as any);

      const result = await analyticsService.recordEvent({
        cardToken: 'paused-token',
        eventType: 'PROFILE_VIEW',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(400);
        expect(result.code).toBe(ErrorCode.CARD_NOT_ACTIVE);
      }
    });

    it('records PROFILE_VIEW event for an ACTIVE card', async () => {
      vi.spyOn(analyticsRepository, 'findCardByPublicToken').mockResolvedValue({
        id: 'card-1',
        cardNumber: 'BC-000001',
        status: CardStatus.ACTIVE,
        cardTypeId: 'ct-1',
        assignments: [],
      } as any);

      vi.spyOn(analyticsRepository, 'findRecentEvents').mockResolvedValue([]);
      const createEventSpy = vi
        .spyOn(analyticsRepository, 'createEvent')
        .mockResolvedValue({ id: 'event-1' } as any);

      const result = await analyticsService.recordEvent({
        cardToken: 'active-token',
        eventType: 'PROFILE_VIEW',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        clientIp: '192.168.1.1',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.recorded).toBe(true);
        expect(result.data.isBot).toBe(false);
        expect(result.data.isDuplicate).toBe(false);
      }
      expect(createEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          cardId: 'card-1',
          eventType: 'PROFILE_VIEW',
          isBot: false,
        })
      );
    });

    it('flags crawler traffic with isBot = true', async () => {
      vi.spyOn(analyticsRepository, 'findCardByPublicToken').mockResolvedValue({
        id: 'card-1',
        cardNumber: 'BC-000001',
        status: CardStatus.ACTIVE,
        cardTypeId: 'ct-1',
        assignments: [],
      } as any);

      vi.spyOn(analyticsRepository, 'findRecentEvents').mockResolvedValue([]);
      const createEventSpy = vi
        .spyOn(analyticsRepository, 'createEvent')
        .mockResolvedValue({ id: 'event-2' } as any);

      const result = await analyticsService.recordEvent({
        cardToken: 'active-token',
        eventType: 'PROFILE_VIEW',
        userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isBot).toBe(true);
      }
      expect(createEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          cardId: 'card-1',
          eventType: 'PROFILE_VIEW',
          isBot: true,
        })
      );
    });

    it('sets isDuplicate = true when same session visits within 30 minutes', async () => {
      vi.spyOn(analyticsRepository, 'findCardByPublicToken').mockResolvedValue({
        id: 'card-1',
        cardNumber: 'BC-000001',
        status: CardStatus.ACTIVE,
        cardTypeId: 'ct-1',
        assignments: [],
      } as any);

      const visitorId = 'test-visitor-123';
      const userAgent = 'Mozilla/5.0';
      const clientIp = '10.0.0.1';

      // First, simulate existing recent event with the same session hash
      vi.spyOn(analyticsRepository, 'findRecentEvents').mockImplementation(async () => {
        const crypto = await import('node:crypto');
        const sessionHash = crypto
          .createHash('sha256')
          .update(`card-1:${visitorId}:${clientIp}:${userAgent}`)
          .digest('hex');

        return [
          {
            id: 'ev-prev',
            metadata: { sessionHash },
            timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
          },
        ] as any;
      });

      const createEventSpy = vi
        .spyOn(analyticsRepository, 'createEvent')
        .mockResolvedValue({ id: 'event-dup' } as any);

      const result = await analyticsService.recordEvent({
        cardToken: 'active-token',
        eventType: 'PROFILE_VIEW',
        metadata: { visitorId },
        userAgent,
        clientIp,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isDuplicate).toBe(true);
      }
      expect(createEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ isDuplicate: true }),
        })
      );
    });

    it('records CTA click events (e.g. PHONE_CLICK, SAVE_CONTACT)', async () => {
      vi.spyOn(analyticsRepository, 'findCardByPublicToken').mockResolvedValue({
        id: 'card-1',
        cardNumber: 'BC-000001',
        status: CardStatus.ACTIVE,
        cardTypeId: 'ct-1',
        assignments: [],
      } as any);

      const createEventSpy = vi
        .spyOn(analyticsRepository, 'createEvent')
        .mockResolvedValue({ id: 'event-click' } as any);

      const result = await analyticsService.recordEvent({
        cardToken: 'active-token',
        eventType: 'PHONE_CLICK',
        metadata: { target: 'tel:+1234567890' },
      });

      expect(result.ok).toBe(true);
      expect(createEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          cardId: 'card-1',
          eventType: 'PHONE_CLICK',
          metadata: expect.objectContaining({ target: 'tel:+1234567890' }),
        })
      );
    });
  });

  describe('getCustomerSummary', () => {
    it('returns 404 when user has no active card', async () => {
      vi.spyOn(profileRepository, 'findActiveAssignmentByUserId').mockResolvedValue(null);

      const result = await analyticsService.getCustomerSummary('user-no-card');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(404);
        expect(result.code).toBe(ErrorCode.NO_ACTIVE_CARD);
      }
    });

    it('returns aggregated analytics for active card', async () => {
      vi.spyOn(profileRepository, 'findActiveAssignmentByUserId').mockResolvedValue({
        id: 'assign-1',
        card: { id: 'card-1' },
      } as any);

      vi.spyOn(analyticsRepository, 'getCardAnalytics').mockResolvedValue({
        viewsTotal: 42,
        viewsToday: 5,
        viewsThisWeek: 20,
        viewsThisMonth: 38,
        clickBreakdown: {
          phone: 4,
          whatsapp: 3,
          email: 2,
          saveContact: 6,
          website: 1,
          instagram: 0,
          linkedin: 0,
          totalClicks: 16,
        },
        recentEvents: [],
        dailyViews: [],
      });

      const result = await analyticsService.getCustomerSummary('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.viewsTotal).toBe(42);
        expect(result.data.viewsToday).toBe(5);
        expect(result.data.viewsThisMonth).toBe(38);
        expect(result.data.clickBreakdown.totalClicks).toBe(16);
      }
    });
  });

  describe('getPlatformAnalytics', () => {
    it('returns platform analytics summary', async () => {
      vi.spyOn(analyticsRepository, 'getPlatformAnalytics').mockResolvedValue({
        totalEvents: 100,
        totalViews: 60,
        humanViews: 50,
        botViews: 10,
        eventBreakdown: { PROFILE_VIEW: 60, PHONE_CLICK: 20, SAVE_CONTACT: 20 },
        dailyViews: [{ date: '2026-10-30', count: 12 }],
        cardTypeBreakdown: { Business: 80, College: 20 },
      });

      const result = await analyticsService.getPlatformAnalytics('ct-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.totalEvents).toBe(100);
        expect(result.data.humanViews).toBe(50);
        expect(result.data.botViews).toBe(10);
      }
    });
  });
});
