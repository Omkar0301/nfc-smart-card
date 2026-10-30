import crypto from 'node:crypto';
import { analyticsRepository } from '../repositories/analytics.repository.js';
import { profileRepository } from '../repositories/profile.repository.js';
import { logger } from '../lib/logger.js';
import {
  ErrorCode,
  type CustomerAnalyticsSummary,
  type PlatformAnalyticsSummary,
} from '@nfc-card/shared';

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code?: string; message: string; details?: any };

export const BOT_UA_REGEX =
  /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|facebot|twitterbot|whatsapp|telegrambot|slackbot|applebot|discordbot|curl|wget|python-requests|node-fetch|axios|postman/i;

export const VALID_EVENT_TYPES = new Set([
  'SCAN',
  'PROFILE_VIEW',
  'PHONE_CLICK',
  'WHATSAPP_CLICK',
  'EMAIL_CLICK',
  'INSTAGRAM_CLICK',
  'LINKEDIN_CLICK',
  'WEBSITE_CLICK',
  'SAVE_CONTACT',
]);

export interface RecordEventInput {
  cardToken: string;
  eventType?: string;
  metadata?: Record<string, unknown>;
  isBot?: boolean;
  userAgent?: string;
  clientIp?: string;
}

export const analyticsService = {
  async recordEvent(input: RecordEventInput): Promise<
    ServiceResult<{
      recorded: boolean;
      isBot: boolean;
      isDuplicate: boolean;
    }>
  > {
    const card = await analyticsRepository.findCardByPublicToken(input.cardToken);
    if (!card) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_NOT_FOUND,
        message: 'Card not found',
      };
    }

    // Only record events for ACTIVE cards (F-014 Acceptance Criteria)
    if (card.status !== 'ACTIVE') {
      logger.info(
        { cardId: card.id, status: card.status },
        '[analytics] ignored event for non-active card'
      );
      return {
        ok: false,
        status: 400,
        code: ErrorCode.CARD_NOT_ACTIVE,
        message: 'Events can only be recorded for active cards',
      };
    }

    const rawEventType = (input.eventType || 'PROFILE_VIEW').trim().toUpperCase();
    const eventType =
      VALID_EVENT_TYPES.has(rawEventType) || rawEventType.endsWith('_CLICK')
        ? rawEventType
        : 'PROFILE_VIEW';

    // Bot detection via User-Agent and payload
    const isBot =
      Boolean(input.isBot) || Boolean(input.userAgent && BOT_UA_REGEX.test(input.userAgent));

    let isDuplicate = false;
    let sessionHash: string | undefined;

    // 30-minute session deduplication for PROFILE_VIEW and SCAN
    if (eventType === 'PROFILE_VIEW' || eventType === 'SCAN') {
      const visitorId = (input.metadata?.visitorId as string) || '';
      const ipSnippet = (input.clientIp || '').trim();
      const uaSnippet = (input.userAgent || '').trim();

      sessionHash = crypto
        .createHash('sha256')
        .update(`${card.id}:${visitorId}:${ipSnippet}:${uaSnippet}`)
        .digest('hex');

      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      try {
        const recentEvents = await analyticsRepository.findRecentEvents(
          card.id,
          eventType,
          thirtyMinutesAgo
        );

        for (const ev of recentEvents) {
          const meta = ev.metadata as Record<string, any> | null;
          if (meta?.sessionHash === sessionHash) {
            isDuplicate = true;
            break;
          }
        }
      } catch (err) {
        logger.warn({ err, cardId: card.id }, '[analytics] deduplication check failed');
      }
    }

    const cleanMetadata: Record<string, unknown> = {
      ...input.metadata,
      sessionHash,
      isDuplicate,
    };
    // Ensure raw IP addresses or client PII are never stored
    delete cleanMetadata.clientIp;
    delete cleanMetadata.ip;

    try {
      await analyticsRepository.createEvent({
        cardId: card.id,
        eventType,
        metadata: cleanMetadata,
        isBot,
      });

      return {
        ok: true,
        data: {
          recorded: true,
          isBot,
          isDuplicate,
        },
      };
    } catch (err) {
      logger.error({ err, token: input.cardToken }, '[analytics] failed to write event');
      return {
        ok: false,
        status: 500,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to record analytics event',
      };
    }
  },

  async getCustomerSummary(userId: string): Promise<ServiceResult<CustomerAnalyticsSummary>> {
    try {
      const assignment = await profileRepository.findActiveAssignmentByUserId(userId);
      if (!assignment || !assignment.card) {
        return {
          ok: false,
          status: 404,
          code: ErrorCode.NO_ACTIVE_CARD,
          message: 'No active card assigned to your account.',
        };
      }

      const stats = await analyticsRepository.getCardAnalytics(assignment.card.id);
      return {
        ok: true,
        data: stats,
      };
    } catch (err: any) {
      logger.error({ err, userId }, '[analytics] failed to fetch customer analytics');
      return {
        ok: false,
        status: 500,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to fetch customer analytics',
      };
    }
  },

  async getPlatformAnalytics(
    cardTypeId?: string
  ): Promise<ServiceResult<PlatformAnalyticsSummary>> {
    try {
      const data = await analyticsRepository.getPlatformAnalytics(cardTypeId);
      return {
        ok: true,
        data,
      };
    } catch (err: any) {
      logger.error({ err, cardTypeId }, '[analytics] failed to fetch platform analytics');
      return {
        ok: false,
        status: 500,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to fetch platform analytics',
      };
    }
  },
};
