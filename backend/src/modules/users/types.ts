// ─── Profile DTOs ────────────────────────────────────────────────────────────

export interface RoleDTO {
  id: number;
  name: string;
  priority: number;
}

export interface UserProfileDTO {
  id: string;
  email: string;
  is_verified: boolean;
  is_active: boolean;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  department: string | null;
  roles: RoleDTO[];
  created_at: Date;
  updated_at: Date;
}

export interface UpdateProfileDTO {
  full_name?: string;
  display_name?: string;
  department?: string;
}

export interface AvatarResponseDTO {
  avatar_url: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface PaginatedResponseDTO<T> {
  data: T[];
  meta: PaginationMeta;
}

// ─── Admin User Management DTOs ───────────────────────────────────────────────

export interface UserListQueryDTO {
  page?: number;
  per_page?: number;
  department?: string;
  role?: string;
  is_active?: boolean;
}

export interface UpdateUserByAdminDTO {
  full_name?: string;
  display_name?: string;
  department?: string;
  is_active?: boolean;
}

// ─── Role Assignment DTOs ─────────────────────────────────────────────────────

export interface AssignRoleDTO {
  role_id: number;
}

export interface AssignRoleResponseDTO {
  account_id: string;
  role_id: number;
  granted_by: string;
  granted_at: Date;
}