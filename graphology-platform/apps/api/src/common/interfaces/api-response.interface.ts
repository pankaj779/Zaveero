export const REQUEST_ID_HEADER = 'x-request-id';

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
  errorCode?: string;
  errors?: string[];
  requestId?: string;
}

export interface ControllerSuccessPayload<T> {
  message?: string;
  data: T;
}
