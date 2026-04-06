export type Role = {
  id: number
  name: string
  priority: number
  description: string | null
}

export type Permission = {
  id: number
  code: string
  description: string | null
}

export type UserProfile = {
  id: string
  email: string
  is_verified: boolean
  is_active: boolean
  full_name: string
  display_name: string | null
  avatar_url: string | null
  department: string | null
  roles: Role[]
  created_at: string
  updated_at: string
}

export type PaginatedResponse<T> = {
  data: T[]
  meta: {
    page: number
    per_page: number
    total: number
  }
}