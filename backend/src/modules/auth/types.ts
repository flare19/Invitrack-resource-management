export interface RegisterDTO {
  email: string;
  full_name: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthTokensDTO {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponseDTO {
  id: string;
  email: string;
  is_verified: boolean;
  created_at: Date;
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponseDTO {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface MessageResponseDTO {
  message: string;
}