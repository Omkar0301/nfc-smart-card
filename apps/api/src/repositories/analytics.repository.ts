import { prisma } from '../lib/prisma.js';

export const analyticsRepository = {
  findCardByPublicToken(publicToken: string) {
    return prisma.nFCCard.findUnique({
      where: { publicToken },
      select: {
        id: true,
        cardNumber: true,
        status: true,
        cardTypeId: true,
        assignments: {
          where: { status: 'ACTIVE' },
          take: 1,
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });
  },

  findRecentEvents(cardId: string, eventType: string, since: Date) {
    return prisma.profileEvent.findMany({
      where: {
        cardId,
        eventType,
        timestamp: { gte: since },
      },
      select: {
        id: true,
        metadata: true,
        timestamp: true,
      },
    });
  },

  createEvent(data: {
    cardId: string;
    profileId?: string | null;
    eventType: string;
    metadata?: Record<string, unknown> | null;
    isBot?: boolean;
  }) {
    return prisma.profileEvent.create({
      data: {
        cardId: data.cardId,
        profileId: data.profileId ?? null,
        eventType: data.eventType,
        metadata: (data.metadata ?? {}) as any,
        isBot: data.isBot ?? false,
      },
    });
  },

  async getCardAnalytics(cardId: string) {
    const now = new Date();
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [viewEventsRaw, recentEventsRaw, clickEventsRaw] = await Promise.all([
      // Fetch non-bot profile view events to accurately deduplicate and count
      prisma.profileEvent.findMany({
        where: {
          cardId,
          eventType: 'PROFILE_VIEW',
          isBot: false,
        },
        select: {
          timestamp: true,
          metadata: true,
        },
      }),

      // Recent interactions (non-bot)
      prisma.profileEvent.findMany({
        where: {
          cardId,
          isBot: false,
        },
        orderBy: { timestamp: 'desc' },
        take: 15,
        select: {
          id: true,
          eventType: true,
          timestamp: true,
          metadata: true,
        },
      }),

      // Group all interaction events for this card by eventType
      prisma.profileEvent.groupBy({
        by: ['eventType'],
        where: {
          cardId,
          isBot: false,
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    // Filter out duplicates from view counts
    const uniqueViews = viewEventsRaw.filter((ev) => {
      const meta = ev.metadata as Record<string, any> | null;
      return !meta?.isDuplicate;
    });

    const viewsTotal = uniqueViews.length;
    const viewsToday = uniqueViews.filter(
      (ev) => new Date(ev.timestamp).getTime() >= startOfToday.getTime()
    ).length;
    const viewsThisWeek = uniqueViews.filter(
      (ev) => new Date(ev.timestamp).getTime() >= sevenDaysAgo.getTime()
    ).length;
    const viewsThisMonth = uniqueViews.filter(
      (ev) => new Date(ev.timestamp).getTime() >= thirtyDaysAgo.getTime()
    ).length;

    // Group daily counts for the last 14 days
    const dailyMap = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dailyMap.set(key, 0);
    }

    for (const ev of uniqueViews) {
      const evDate = new Date(ev.timestamp);
      if (evDate.getTime() >= fourteenDaysAgo.getTime()) {
        const key = evDate.toISOString().split('T')[0];
        if (dailyMap.has(key)) {
          dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
        }
      }
    }

    const dailyViews = Array.from(dailyMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // Build click breakdown
    const clickBreakdown = {
      phone: 0,
      whatsapp: 0,
      email: 0,
      saveContact: 0,
      website: 0,
      instagram: 0,
      linkedin: 0,
      totalClicks: 0,
    };

    for (const item of clickEventsRaw) {
      const count = item._count._all;
      switch (item.eventType) {
        case 'PHONE_CLICK':
          clickBreakdown.phone += count;
          clickBreakdown.totalClicks += count;
          break;
        case 'WHATSAPP_CLICK':
          clickBreakdown.whatsapp += count;
          clickBreakdown.totalClicks += count;
          break;
        case 'EMAIL_CLICK':
          clickBreakdown.email += count;
          clickBreakdown.totalClicks += count;
          break;
        case 'SAVE_CONTACT':
          clickBreakdown.saveContact += count;
          clickBreakdown.totalClicks += count;
          break;
        case 'WEBSITE_CLICK':
          clickBreakdown.website += count;
          clickBreakdown.totalClicks += count;
          break;
        case 'INSTAGRAM_CLICK':
          clickBreakdown.instagram += count;
          clickBreakdown.totalClicks += count;
          break;
        case 'LINKEDIN_CLICK':
          clickBreakdown.linkedin += count;
          clickBreakdown.totalClicks += count;
          break;
        default:
          if (item.eventType.endsWith('_CLICK')) {
            (clickBreakdown as Record<string, number>)[item.eventType.toLowerCase()] = count;
            clickBreakdown.totalClicks += count;
          }
          break;
      }
    }

    // Sanitize recent events to ensure zero visitor PII is returned
    const sanitizedRecentEvents = recentEventsRaw.map((ev) => {
      const rawMeta = (ev.metadata ?? {}) as Record<string, any>;
      // Remove any IP or raw User-Agent that might have been stored
      const { clientIp, ip, userAgent, ...safeMeta } = rawMeta;
      return {
        id: ev.id,
        eventType: ev.eventType,
        timestamp: ev.timestamp,
        metadata: safeMeta,
      };
    });

    return {
      viewsTotal,
      viewsToday,
      viewsThisWeek,
      viewsThisMonth,
      clickBreakdown,
      recentEvents: sanitizedRecentEvents,
      dailyViews,
    };
  },

  async getPlatformAnalytics(cardTypeId?: string) {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const cardFilter = cardTypeId ? { card: { cardTypeId } } : {};

    const [
      totalEvents,
      totalViews,
      humanViews,
      botViews,
      eventsByTypeRaw,
      recentDailyEvents,
      cardTypes,
    ] = await Promise.all([
      prisma.profileEvent.count({
        where: cardFilter,
      }),
      prisma.profileEvent.count({
        where: {
          ...cardFilter,
          eventType: 'PROFILE_VIEW',
        },
      }),
      prisma.profileEvent.count({
        where: {
          ...cardFilter,
          eventType: 'PROFILE_VIEW',
          isBot: false,
        },
      }),
      prisma.profileEvent.count({
        where: {
          ...cardFilter,
          eventType: 'PROFILE_VIEW',
          isBot: true,
        },
      }),
      prisma.profileEvent.groupBy({
        by: ['eventType'],
        where: cardFilter,
        _count: {
          _all: true,
        },
      }),
      prisma.profileEvent.findMany({
        where: {
          ...cardFilter,
          eventType: 'PROFILE_VIEW',
          isBot: false,
          timestamp: { gte: fourteenDaysAgo },
        },
        select: {
          timestamp: true,
        },
      }),
      prisma.cardType.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              cards: true,
            },
          },
        },
      }),
    ]);

    const dailyMap = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dailyMap.set(key, 0);
    }

    for (const ev of recentDailyEvents) {
      const key = new Date(ev.timestamp).toISOString().split('T')[0];
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
      }
    }

    const dailyViews = Array.from(dailyMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    const eventBreakdown: Record<string, number> = {};
    for (const item of eventsByTypeRaw) {
      eventBreakdown[item.eventType] = item._count._all;
    }

    const cardTypeBreakdown: Record<string, number> = {};
    for (const ct of cardTypes) {
      cardTypeBreakdown[ct.name] = ct._count.cards;
    }

    return {
      totalEvents,
      totalViews,
      humanViews,
      botViews,
      eventBreakdown,
      dailyViews,
      cardTypeBreakdown,
    };
  },
};
