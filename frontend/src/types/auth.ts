export type LoginResponse = {
  access_token: string
  token_type: string
  expires_in: number
}

export type RegisterResponse = {
  id: string
  email: string
  is_verified: boolean
  created_at: string
}

export type Session = {
  id: string
  user_agent: string | null
  ip_address: string | null
  expires_at: string
  created_at: string
}

export type RefreshResponse = {
  access_token: string
  token_type: string
  expires_in: number
}