export const AUTH_TOKEN_TYPES = {
  access: 'access',
  refresh: 'refresh',
  emailVerification: 'email_verification',
  passwordReset: 'password_reset',
} as const;

export type AuthTokenType = (typeof AUTH_TOKEN_TYPES)[keyof typeof AUTH_TOKEN_TYPES];

export const AUTH_COOKIE_NAMES = {
  accessToken: 'graphology_access_token',
  refreshToken: 'graphology_refresh_token',
} as const;

export const AUTH_EXPIRATION_NAMES = {
  accessToken: 'JWT_EXPIRES_IN',
  refreshToken: 'REFRESH_TOKEN_EXPIRES_IN',
} as const;

export const AUTH_ROLES = {
  admin: 'Admin',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
} as const;

export const DEFAULT_ORGANIZATION = {
  name: 'Graphology Academy',
  slug: 'graphology-academy',
} as const;

export const DEFAULT_REGISTRATION_ROLE = AUTH_ROLES.student;

export const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;

export const PASSWORD_RESET_EXPIRY_MINUTES = 30;

export type AuthRoleName = (typeof AUTH_ROLES)[keyof typeof AUTH_ROLES];

export const AUTH_PERMISSIONS = {
  courseCreate: 'course.create',
  courseUpdate: 'course.update',
  studentView: 'student.view',
  teacherUpdate: 'teacher.update',
  paymentManage: 'payment.manage',
} as const;

export type AuthPermissionName = (typeof AUTH_PERMISSIONS)[keyof typeof AUTH_PERMISSIONS];
