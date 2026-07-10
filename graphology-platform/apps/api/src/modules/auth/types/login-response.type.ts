export interface LoginUserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: LoginUserSummary;
}

export interface RefreshResponseData {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
