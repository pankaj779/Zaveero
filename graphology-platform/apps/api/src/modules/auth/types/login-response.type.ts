export interface LoginUserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface LoginResponseData {
  accessToken: string;
  expiresIn: string;
  user: LoginUserSummary;
}
