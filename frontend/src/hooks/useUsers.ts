import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import {
  assignPermissionToRole,
  assignRoleToUser,
  getMe,
  getPermissions,
  getRolePermissions,
  getRoles,
  getUserById,
  getUsers,
  removePermissionFromRole,
  removeRoleFromUser,
  updateMyProfile,
  updateUserById,
} from '@/api/users'
import type { PaginatedResponse } from '@/types/common'
import type {
  Permission,
  Role,
  UpdateMyProfileBody,
  UpdateUserByAdminBody,
  UserProfile,
  GetUsersParams,
} from '@/types/users'

// --- Query keys ---

export const userKeys = {
  all: ['users'] as const,
  me: () => [...userKeys.all, 'me'] as const,
  list: () => [...userKeys.all, 'list'] as const,
  user: (id: string) => [...userKeys.all, id] as const,
  roles: () => [...userKeys.all, 'roles'] as const,
  rolePermissions: (roleId: number) =>
    [...userKeys.all, 'roles', roleId, 'permissions'] as const,
  permissions: () => [...userKeys.all, 'permissions'] as const,
}

// --- Current user ---

export function useMe(
  options?: Omit<UseQueryOptions<UserProfile>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: getMe,
    ...options,
  })
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateMyProfileBody) => updateMyProfile(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me() })
    },
  })
}

// --- User list & management ---

export function useUsers(
  params: GetUsersParams = {},
  options?: Omit <
    UseQueryOptions<PaginatedResponse<UserProfile>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: [...userKeys.list(), params],
    queryFn: () => getUsers(params),
    ...options,
  })
}

export function useUser(
  id: string,
  options?: Omit<UseQueryOptions<UserProfile>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userKeys.user(id),
    queryFn: () => getUserById(id),
    ...options,
  })
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateUserByAdminBody) => updateUserById(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.user(id) })
      queryClient.invalidateQueries({ queryKey: userKeys.list() })
    },
  })
}

// --- Roles ---

export function useRoles(
  options?: Omit<UseQueryOptions<Role[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userKeys.roles(),
    queryFn: getRoles,
    ...options,
  })
}

export function useAssignRole(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roleId: number) => assignRoleToUser(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.user(userId) })
      queryClient.invalidateQueries({ queryKey: userKeys.list() })
    },
  })
}

export function useRemoveRole(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roleId: number) => removeRoleFromUser(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.user(userId) })
      queryClient.invalidateQueries({ queryKey: userKeys.list() })
    },
  })
}

// --- Permissions (admin) ---

export function usePermissions(
  options?: Omit<UseQueryOptions<Permission[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userKeys.permissions(),
    queryFn: getPermissions,
    ...options,
  })
}

export function useRolePermissions(
  roleId: number,
  options?: Omit<UseQueryOptions<Permission[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userKeys.rolePermissions(roleId),
    queryFn: () => getRolePermissions(roleId),
    ...options,
  })
}

export function useAssignPermissionToRole(roleId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (permissionId: number) =>
      assignPermissionToRole(roleId, permissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: userKeys.rolePermissions(roleId),
      })
    },
  })
}

export function useRemovePermissionFromRole(roleId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (permissionId: number) =>
      removePermissionFromRole(roleId, permissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: userKeys.rolePermissions(roleId),
      })
    },
  })
}