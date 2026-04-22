import { useState, useEffect } from 'react'
import { authApi, type MeResponse } from '@/api/auth'
import { unregisterPushSubscription } from '@/lib/webPush'

const TOKEN_KEY = 'auth_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function useAuth() {
  const [user, setUser]       = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) { setLoading(false); return }

    authApi.me()
      .then((data) => { if (data?.email && data?.userId) setUser(data); else { clearToken(); window.location.replace('/login') } })
      .catch(() => { clearToken(); window.location.replace('/login') })
      .finally(() => setLoading(false))
  }, [])

  function logout() {
    unregisterPushSubscription().catch(() => {}).finally(() => {
      clearToken()
      setUser(null)
      window.location.href = '/login'
    })
  }

  return { user, loading, isAuthenticated: !!user, logout }
}
