import api from './axios'
import type { LoginResponse, RegisterResponse, RefreshResponse, Session } from '@/types/auth'

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', { email, password })
  return response.data
}

export async function register(
  email: string,
  password: string,
  full_name: string
): Promise<RegisterResponse> {
  const response = await api.post<RegisterResponse>('/auth/register', {
    email,
    password,
    full_name,
  })
  return response.data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

export async function refreshToken(): Promise<RefreshResponse> {
  const response = await api.post<RefreshResponse>('/auth/refresh')
  return response.data
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email })
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await api.post('/auth/reset-password', { token, password })
}

export async function verifyEmail(token: string): Promise<void> {
  await api.get('/auth/verify-email', { params: { token } })
}

export async function getSessions(): Promise<Session[]> {
  const response = await api.get<Session[]>('/auth/sessions')
  return response.data
}

export async function deleteSession(id: string): Promise<void> {
  await api.delete(`/auth/sessions/${id}`)
}