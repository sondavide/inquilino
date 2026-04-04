import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { setToken } from '@/hooks/useAuth'

export default function OAuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token  = params.get('token')
    if (token) {
      setToken(token)
      navigate('/onboarding', { replace: true })
    } else {
      navigate('/login?error=oauth', { replace: true })
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
      Autenticazione in corso…
    </div>
  )
}
