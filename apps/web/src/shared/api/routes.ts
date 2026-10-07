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
  },

  profile: {
    get: '/profile',
    save: '/profile',
    update: '/profile',
    public: (token: string) => `/profile/public/${token}`,
  },
} as const;

export type ApiRoute = string;
