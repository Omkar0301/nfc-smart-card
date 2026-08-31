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
    recoverRequest: '/auth/recover/request',
    recoverVerify: '/auth/recover/verify',
    recoverPhone: '/auth/recover/phone',
    updateEmail: '/auth/email',
  },
} as const;

export type ApiRoute = string;
