export const API_ROUTES = {
  health: '/health',

  admin: {
    health: '/admin/health',
    cardTypes: '/admin/card-types',
    cards: {
      list: '/admin/cards',
      detail: (id: string) => `/admin/cards/${id}`,
      assign: (id: string) => `/admin/cards/${id}/assign`,
      activate: (id: string) => `/admin/cards/${id}/activate`,
      suspend: (id: string) => `/admin/cards/${id}/suspend`,
      unsuspend: (id: string) => `/admin/cards/${id}/unsuspend`,
      deactivate: (id: string) => `/admin/cards/${id}/deactivate`,
      replace: (id: string) => `/admin/cards/${id}/replace`,
      replacements: '/admin/cards/replacements/available',
      searchUsers: '/admin/cards/users/search',
      generate: '/admin/cards/generate',
      jobs: '/admin/cards/jobs',
      jobStatus: (id: string) => `/admin/cards/jobs/${id}`,
      export: '/admin/cards/export',
      invalidateBatch: (batchId: string) => `/admin/cards/batches/${batchId}/invalidate`,
    },
    replacementRequests: {
      list: (params?: { status?: string; page?: number; limit?: number }) => {
        const query = new URLSearchParams();
        if (params?.status) query.set('status', params.status);
        if (params?.page) query.set('page', String(params.page));
        if (params?.limit) query.set('limit', String(params.limit));
        const qStr = query.toString();
        return `/admin/replacement-requests${qStr ? `?${qStr}` : ''}`;
      },
      updateStatus: (id: string) => `/admin/replacement-requests/${id}`,
    },
    metrics: (cardTypeId?: string) =>
      `/admin/metrics${cardTypeId ? `?cardTypeId=${encodeURIComponent(cardTypeId)}` : ''}`,
    analytics: (cardTypeId?: string) =>
      `/admin/analytics${cardTypeId ? `?cardTypeId=${encodeURIComponent(cardTypeId)}` : ''}`,
    customers: (query?: string) =>
      `/admin/customers${query ? `?query=${encodeURIComponent(query)}` : ''}`,
    templates: {
      list: '/admin/templates',
      create: '/admin/templates',
      update: (id: string) => `/admin/templates/${id}`,
      remove: (id: string) => `/admin/templates/${id}`,
    },
  },

  templates: {
    list: (cardType: string) => `/templates?cardType=${encodeURIComponent(cardType)}`,
  },

  auth: {
    sendOtp: '/auth/send-otp',
    verifyOtp: '/auth/verify-otp',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
    recoverRequest: '/auth/recover/request',
    recoverVerify: '/auth/recover/verify',
    recoverPhone: '/auth/recover/phone',
    updateEmail: '/auth/email',
  },

  cards: {
    lookup: (token: string) => `/cards/${token}`,
    claim: (token: string) => `/cards/${token}/claim`,
    reportLost: '/cards/report-lost',
    requestReplacement: '/cards/request-replacement',
    replacementRequests: '/cards/replacement-requests',
    vcf: (token: string) => `/cards/${token}/contact.vcf`,
  },

  profile: {
    get: '/profile',
    save: '/profile',
    update: '/profile',
    pause: '/profile/pause',
    resume: '/profile/resume',
    analytics: '/profile/analytics',
    public: (token: string) => `/profile/public/${token}`,
    vcf: (token: string) => `/profile/public/${token}/contact.vcf`,
    publicVcf: (type: string, token: string) => `/p/${type}/${token}/contact.vcf`,
  },

  analytics: {
    event: '/analytics/event',
    events: '/analytics/events',
    summary: '/analytics/summary',
  },

  upload: {
    profilePhoto: '/upload/profile-photo',
    templateThumbnail: '/upload/template-thumbnail',
  },
} as const;

export type ApiRoute = string;
