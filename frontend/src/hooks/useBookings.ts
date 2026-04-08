import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import {
  getResources,
  getResource,
  createResource,
  updateResource,
  getAvailability,
  getReservations,
  getReservation,
  createReservation,
  updateReservation,
  reviewReservation,
  type GetResourcesParams,
  type CreateResourceBody,
  type UpdateResourceBody,
  type GetReservationsParams,
  type CreateReservationBody,
  type UpdateReservationBody,
  type ReviewReservationBody,
} from '@/api/bookings'
import type { PaginatedResponse } from '@/types/common'
import type {
  Resource,
  Reservation,
  Availability,
} from '@/types/bookings'

// --- Query keys ---

export const bookingKeys = {
  all: ['bookings'] as const,
  resources: () => [...bookingKeys.all, 'resources'] as const,
  resource: (id: string) => [...bookingKeys.all, 'resources', id] as const,
  reservations: () => [...bookingKeys.all, 'reservations'] as const,
  reservation: (id: string) => [...bookingKeys.all, 'reservations', id] as const,
  availability: (resourceId: string, startTime: string, endTime: string) =>
    [...bookingKeys.all, 'availability', resourceId, startTime, endTime] as const,
}

// --- Resources ---

export function useResources(
  params: GetResourcesParams = {},
  options?: Omit<
    UseQueryOptions<PaginatedResponse<Resource>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: [...bookingKeys.resources(), params],
    queryFn: () => getResources(params),
    ...options,
  })
}

export function useResource(
  id: string,
  options?: Omit<
    UseQueryOptions<Resource>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: bookingKeys.resource(id),
    queryFn: () => getResource(id),
    ...options,
  })
}

export function useCreateResource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateResourceBody) => createResource(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.resources() })
    },
  })
}

export function useUpdateResource(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: UpdateResourceBody) => updateResource(id, body),
    onSuccess: (updatedResource) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.resources() })
      queryClient.setQueryData(bookingKeys.resource(id), updatedResource)
    },
  })
}

// --- Availability ---

export function useAvailability(
  resourceId: string | undefined,
  startTime: string | undefined,
  endTime: string | undefined,
  options?: Omit<
    UseQueryOptions<Availability>,
    'queryKey' | 'queryFn'
  >
) {
  const isEnabled = !!(resourceId && startTime && endTime)

  return useQuery({
    queryKey: isEnabled
      ? bookingKeys.availability(resourceId!, startTime!, endTime!)
      : ['availability-disabled'],
    queryFn: () => {
      if (!isEnabled) return Promise.reject('Availability query not ready')
      return getAvailability(resourceId!, startTime!, endTime!)
    },
    enabled: isEnabled,
    ...options,
  })
}

// --- Reservations ---

export function useReservations(
  params: GetReservationsParams = {},
  options?: Omit<
    UseQueryOptions<PaginatedResponse<Reservation>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: [...bookingKeys.reservations(), params],
    queryFn: () => getReservations(params),
    ...options,
  })
}

export function useReservation(
  id: string,
  options?: Omit<
    UseQueryOptions<Reservation>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: bookingKeys.reservation(id),
    queryFn: () => getReservation(id),
    ...options,
  })
}

export function useCreateReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateReservationBody) => createReservation(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.reservations() })
    },
  })
}

export function useUpdateReservation(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: UpdateReservationBody) => updateReservation(id, body),
    onSuccess: (updatedReservation) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.reservations() })
      queryClient.setQueryData(bookingKeys.reservation(id), updatedReservation)
    },
  })
}

export function useCancelReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => updateReservation(id, { status: 'cancelled' }),
    onSuccess: (updatedReservation) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.reservations() })
      queryClient.setQueryData(
        bookingKeys.reservation(updatedReservation.id),
        updatedReservation
      )
    },
  })
}

export function useReviewReservation(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: ReviewReservationBody) => reviewReservation(id, body),
    onSuccess: (updatedReservation) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.reservations() })
      queryClient.setQueryData(bookingKeys.reservation(id), updatedReservation)
    },
  })
}
