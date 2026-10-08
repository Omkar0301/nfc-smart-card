import { prisma } from '../lib/prisma.js';

export const analyticsRepository = {
  findCardByPublicToken(publicToken: string) {
    return prisma.nFCCard.findUnique({
      where: { publicToken },
      select: {
        id: true,
        cardNumber: true,
        status: true,
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
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [viewsTotal, viewsToday, viewsThisWeek, recentEventsRaw, recentDailyEvents] =
      await Promise.all([
        prisma.profileEvent.count({
          where: { cardId, eventType: 'PROFILE_VIEW' },
        }),
        prisma.profileEvent.count({
          where: {
            cardId,
            eventType: 'PROFILE_VIEW',
            timestamp: { gte: startOfToday },
          },
        }),
        prisma.profileEvent.count({
          where: {
            cardId,
            eventType: 'PROFILE_VIEW',
            timestamp: { gte: sevenDaysAgo },
          },
        }),
        prisma.profileEvent.findMany({
          where: { cardId },
          orderBy: { timestamp: 'desc' },
          take: 15,
          select: {
            id: true,
            eventType: true,
            timestamp: true,
            metadata: true,
          },
        }),
        prisma.profileEvent.findMany({
          where: {
            cardId,
            eventType: 'PROFILE_VIEW',
            timestamp: { gte: fourteenDaysAgo },
          },
          select: {
            timestamp: true,
          },
        }),
      ]);

    // Group daily counts for the last 14 days
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

    return {
      viewsTotal,
      viewsToday,
      viewsThisWeek,
      recentEvents: recentEventsRaw.map((ev) => ({
        id: ev.id,
        eventType: ev.eventType,
        timestamp: ev.timestamp,
        metadata: ev.metadata as Record<string, any> | null,
      })),
      dailyViews,
    };
  },
};
