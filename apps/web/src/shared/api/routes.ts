export const API_ROUTES = {
  health: '/health',

  admin: {
    health: '/admin/health',
    cardTypes: '/admin/card-types',
    cards: {
      generate: '/admin/cards/generate',
      jobs: '/admin/cards/jobs',
      jobStatus: (id: string) => `/admin/cards/jobs/${id}`,
      export: '/admin/cards/export',
      invalidateBatch: (batchId: string) => `/admin/cards/batches/${batchId}/invalidate`,
    },
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
} as const;

export type ApiRoute = string;
