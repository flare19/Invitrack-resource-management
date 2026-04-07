import api from './axios'
import type {
  UserProfile,
  Permission,
  Role,
  PaginatedResponse,
  UpdateMyProfileBody,
  UpdateUserByAdminBody,
  GetUsersParams,
} from '@/types/users'

// ─── Current User Profile ─────────────────────────────────────────────────

export async function getMe(): Promise<UserProfile> {
  const response = await api.get<UserProfile>('/users/me')
  return response.data
}

export async function updateMyProfile(
  body: UpdateMyProfileBody
): Promise<UserProfile> {
  const response = await api.patch<UserProfile>('/users/me', body)
  return response.data
}

// ─── User List & Management ───────────────────────────────────────────────

export async function getUsers(
  params: GetUsersParams = {}
): Promise<PaginatedResponse<UserProfile>> {
  const response = await api.get('/users', { params })
  return response.data
}

export async function getUserById(id: string): Promise<UserProfile> {
  const response = await api.get<UserProfile>(`/users/${id}`)
  return response.data
}

export async function updateUserById(
  id: string,
  body: UpdateUserByAdminBody
): Promise<UserProfile> {
  const response = await api.patch<UserProfile>(`/users/${id}`, body)
  return response.data
}

// ─── Roles ────────────────────────────────────────────────────────────────

export async function getRoles(): Promise<Role[]> {
  const response = await api.get<Role[]>('/users/roles')
  return response.data
}

export async function assignRoleToUser(
  userId: string,
  roleId: number
): Promise<void> {
  await api.post(`/users/${userId}/roles`, { role_id: roleId })
}

export async function removeRoleFromUser(
  userId: string,
  roleId: number
): Promise<void> {
  await api.delete(`/users/${userId}/roles/${roleId}`)
}

// ─── Permissions (Admin) ──────────────────────────────────────────────────

export async function getPermissions(): Promise<Permission[]> {
  const response = await api.get<Permission[]>('/users/permissions')
  return response.data
}

export async function getRolePermissions(roleId: number): Promise<Permission[]> {
  const response = await api.get<Permission[]>(`/users/roles/${roleId}/permissions`)
  return response.data
}

export async function assignPermissionToRole(
  roleId: number,
  permissionId: number
): Promise<void> {
  await api.post(`/users/roles/${roleId}/permissions`, { permission_id: permissionId })
}

export async function removePermissionFromRole(
  roleId: number,
  permissionId: number
): Promise<void> {
  await api.delete(`/users/roles/${roleId}/permissions/${permissionId}`)
}