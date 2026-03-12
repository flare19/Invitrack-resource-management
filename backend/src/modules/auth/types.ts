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