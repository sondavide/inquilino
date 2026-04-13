import apiClient from './client'
import type { SupervisorUser, AuditLogEntry } from '@/types'

// ─── Onboarding config types ──────────────────────────────────────────────────

export interface StepConfigDto {
  stepId:                    string
  systemPromptOverride:      string | null
  extractionPromptOverride:  string | null
  adminNotes:                string | null
  updatedAt:                 string | null
  updatedBy:                 string | null
  /** Read-only: hardcoded default system prompt from Java (empty context, Italian). */
  defaultSystemPrompt:       string | null
  /** Read-only: hardcoded default extraction prompt from Java. */
  defaultExtractionPrompt:   string | null
}

export interface FieldPopulationDto {
  key:               string
  labelIt:           string
  required:          boolean
  populatedCount:    number
  populationRatePct: number
}

export interface StepAnalyticsDto {
  stepId:            string
  stepNumber:        number
  completedCount:    number
  currentlyAtCount:  number
  completionRatePct: number
  stuckRatePct:      number
  fields:            FieldPopulationDto[]
}

export interface OnboardingAnalyticsResponse {
  totalUsers: number
  steps:      StepAnalyticsDto[]
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const adminApi = {
  createSupervisor: (email: string, password: string, phone?: string) =>
    apiClient.post<SupervisorUser>('/admin/supervisors', { email, password, phone })
      .then(r => r.data),

  listSupervisors: () =>
    apiClient.get<SupervisorUser[]>('/admin/supervisors').then(r => r.data),

  getAuditLog: (profileId?: string, q?: string, page = 0, size = 50) =>
    apiClient.get<{ content: AuditLogEntry[]; totalPages: number; totalElements: number }>(
      '/admin/audit-log',
      { params: { profileId, q: q || undefined, page, size } }
    ).then(r => r.data),

  // ─── Onboarding prompt configs ──────────────────────────────────────────────

  listOnboardingConfigs: () =>
    apiClient.get<StepConfigDto[]>('/admin/onboarding/configs').then(r => r.data),

  getOnboardingConfig: (stepId: string) =>
    apiClient.get<StepConfigDto>(`/admin/onboarding/configs/${stepId}`).then(r => r.data),

  saveOnboardingConfig: (stepId: string, dto: Partial<StepConfigDto>) =>
    apiClient.put<StepConfigDto>(`/admin/onboarding/configs/${stepId}`, dto).then(r => r.data),

  deleteOnboardingConfig: (stepId: string) =>
    apiClient.delete(`/admin/onboarding/configs/${stepId}`),

  // ─── Onboarding analytics ────────────────────────────────────────────────────

  getOnboardingAnalytics: () =>
    apiClient.get<OnboardingAnalyticsResponse>('/admin/onboarding/analytics').then(r => r.data),
}
