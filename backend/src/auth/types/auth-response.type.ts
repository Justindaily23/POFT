export interface AuthSuccessResponse {
  message: string;
}

export interface AuthTokenResponse {
  id: string;
  role: string;
  email: string;
  name: string;
  mustChangePassword: boolean;
  accessToken: string;
}
