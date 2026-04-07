import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, User, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import PageError from '@/components/shared/PageError'
import { useAuth } from '@/context/AuthContext'
import { useUsers } from '@/hooks/useUsers'
import type { GetUsersParams } from '@/types/users'

function getErrorMessage(err: unknown): string {
  const status =
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as { response?: { status?: number } }).response?.status === 'number'
      ? (err as { response: { status: number } }).response.status
      : 0
  if (status === 403) return 'You do not have permission to view users.'
  if (status === 401) return 'You must be logged in to view users.'
  return 'Something went wrong. Please try again.'
}

export function UsersListPage() {
  const navigate = useNavigate()
  const { roles } = useAuth()
  const isAdmin = roles.some(r => r.name === 'admin')

  const [filters, setFilters] = useState<GetUsersParams>({
    page: 1,
    per_page: 20,
  })

  // Local filter UI state — committed to query only on Apply
  const [departmentInput, setDepartmentInput] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const { data, isLoading, isError, error } = useUsers(filters)

  const users = data?.data ?? []
  const meta = data?.meta

  const totalPages = meta ? Math.ceil(meta.total / meta.per_page) : 1
  const isFirstPage = (filters.page ?? 1) === 1
  const isLastPage = (filters.page ?? 1) === totalPages

  function applyFilters() {
    setFilters(prev => ({
        ...prev,
        page: 1,
        ...(departmentInput.trim() && { department: departmentInput.trim() }),
        ...(roleFilter && { role: roleFilter }),
        ...(activeFilter === 'active' && { is_active: true }),
        ...(activeFilter === 'inactive' && { is_active: false }),
    }))
  }

  function clearFilters() {
    setDepartmentInput('')
    setRoleFilter('')
    setActiveFilter('all')
    setFilters({ page: 1, per_page: 20 })
  }

  function handlePrev() {
    setFilters(prev => ({ ...prev, page: (prev.page ?? 1) - 1 }))
  }

  function handleNext() {
    setFilters(prev => ({ ...prev, page: (prev.page ?? 1) + 1 }))
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  if (isError) {
    return (
      <PageError
        message={getErrorMessage(error)}
        onRetry={() => window.location.reload()}
      />
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        {meta && (
          <p className="text-sm text-gray-500 mt-1">
            {meta.total} {meta.total === 1 ? 'user' : 'users'} total
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Department
          </label>
          <input
            type="text"
            value={departmentInput}
            onChange={e => setDepartmentInput(e.target.value)}
            placeholder="e.g. Engineering"
            className="block rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Role
          </label>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="block rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Status
          </label>
          <select
            value={activeFilter}
            onChange={e => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="block rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button onClick={applyFilters} size="sm">
            Apply
          </Button>
          <Button onClick={clearFilters} variant="outline" size="sm">
            Clear
          </Button>
        </div>
      </div>

      {/* Table */}
      {users.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <User className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">No users found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {users.map(user => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/users/${user.id}`)}
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-medium shrink-0">
                        {(user.display_name ?? user.full_name)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.full_name}
                        </p>
                        {user.display_name && (
                          <p className="text-xs text-gray-500">{user.display_name}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {user.email}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {user.department ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length > 0
                        ? user.roles.map(r => <RoleBadge key={r.id} role={r.name} />)
                        : <span className="text-sm text-gray-400">—</span>
                      }
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <StatusBadge isActive={user.is_active} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <span className="text-blue-600 hover:underline">View</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.total > meta.per_page && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {filters.page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={isFirstPage}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={isLastPage}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

export function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'admin'
  const isManager = role === 'manager'
  const colorClass = isAdmin
    ? 'bg-purple-100 text-purple-700'
    : isManager
    ? 'bg-blue-100 text-blue-700'
    : 'bg-gray-100 text-gray-600'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {isAdmin && <Shield className="h-3 w-3" />}
      {role}
    </span>
  )
}

export function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}