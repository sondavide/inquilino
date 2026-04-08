import apiClient from './client'

export interface RegisterPayload { email: string; password: string; phone?: string }
export interface LoginPayload    { email: string; password: string }
export interface AuthResponse    { token: string; userId: string; email: string }
export interface MeResponse      { userId: string; email: string; userType: string; verificationStatus?: string; onboardingCompleted?: boolean }

export const authApi = {
  register: (data: RegisterPayload) =>
    apiClient.post<AuthResponse>('/auth/register', data).then(r => r.data),

  login: (data: LoginPayload) =>
    apiClient.post<AuthResponse>('/auth/login', data).then(r => r.data),

  me: () =>
    apiClient.get<MeResponse>('/auth/me').then(r => r.data),
}
