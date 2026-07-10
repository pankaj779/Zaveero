export type UserRole = 'Admin' | 'Teacher' | 'Student' | 'Parent';

/** @deprecated Prefer UserRole; kept for transitional lowercase clients */
export type UserRoleSlug = 'admin' | 'teacher' | 'student' | 'parent';

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errorCode: string;
  errors?: string[];
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

export interface EnvironmentConfig {
  nodeEnv: 'development' | 'test' | 'production';
  appName: string;
  appUrl: string;
  apiUrl: string;
}
