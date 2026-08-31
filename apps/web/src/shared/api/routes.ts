export const API_ROUTES = {
  health: '/health',

  admin: {
    health: '/admin/health',
  },

  auth: {
    sendOtp: '/auth/send-otp',
    verifyOtp: '/auth/verify-otp',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
  },
} as const;

export type ApiRoute = string;
