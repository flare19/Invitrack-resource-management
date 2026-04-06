import api from './axios'
import type { UserProfile, Permission } from '@/types/users'

export async function getMe(): Promise<UserProfile> {
  const response = await api.get<UserProfile>('/users/me')
  return response.data
}

export async function getRolePermissions(roleId: number): Promise<Permission[]> {
  const response = await api.get<Permission[]>(`/users/roles/${roleId}/permissions`)
  return response.data
}