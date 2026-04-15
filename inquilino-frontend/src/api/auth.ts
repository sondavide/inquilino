import apiClient from './client'

export interface RegisterPayload { email: string; password: string; phone?: string; verificationCode: string }
export interface LoginPayload    { email: string; password: string }
export interface AuthResponse    { token: string; userId: string; email: string }
export interface MeResponse      { userId: string; email: string; userType: string; verificationStatus?: string; onboardingCompleted?: boolean }

export const authApi = {
  /** Step 1: controlla unicità email e invia OTP. Lancia 409 se email già registrata. */
  requestEmailVerification: (email: string) =>
    apiClient.post('/auth/request-email-verification', { email }),

  /** Step 2: crea l'account includendo il codice OTP ricevuto per email. */
  register: (data: RegisterPayload) =>
    apiClient.post<AuthResponse>('/auth/register', data).then(r => r.data),

  login: (data: LoginPayload) =>
    apiClient.post<AuthResponse>('/auth/login', data).then(r => r.data),

  me: () =>
    apiClient.get<MeResponse>('/auth/me').then(r => r.data),

  /** Invia il link di reset password all'email. Risponde sempre 204 (no enumeration). */
  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  /** Valida il token e aggiorna la password. Lancia 422 se token scaduto/non valido. */
  resetPassword: (token: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, newPassword }),
}
