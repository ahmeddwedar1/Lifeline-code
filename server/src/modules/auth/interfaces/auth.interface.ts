export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    phone?: string | null;
    profilePictureUrl?: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
}

export interface LoginResponse {
  user: AuthResponse['user'];
  accessToken: string;
  refreshToken: string;
  requiresMfa?: boolean;
  mfaToken?: string;
}
