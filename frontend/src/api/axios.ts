import axios from 'axios'

let accessToken: string | null = null
let onTokenRefreshed: ((token: string) => void) | null = null
let onAuthFailure: (() => void) | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function setAuthHandlers(handlers: {
  onTokenRefreshed: (token: string) => void
  onAuthFailure: () => void
}) {
  onTokenRefreshed = handlers.onTokenRefreshed
  onAuthFailure = handlers.onAuthFailure
}

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url === '/auth/refresh'
    ) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          resolve(api(originalRequest))
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const response = await api.post<{ access_token: string }>('/auth/refresh')
      const newToken = response.data.access_token

      setAccessToken(newToken)
      onTokenRefreshed?.(newToken)

      refreshQueue.forEach((cb) => cb(newToken))
      refreshQueue = []

      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return api(originalRequest)
    } catch {
      onAuthFailure?.()
      refreshQueue = []
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }
)

export default api