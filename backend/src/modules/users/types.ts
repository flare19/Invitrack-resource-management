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