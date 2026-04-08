import apiClient from './client'
import type { TenantProfileDto, FieldValidationDto } from '@/types'

export interface TenantUpdatePayload {
  // User fields
  phone?:      string | null
  // Always editable
  maxBudget?:  number | null
  moveInDate?: string | null
  occupants?:  number | null
  hasPets?:    boolean
  smoker?:     boolean
  // Editable only if not APPROVED by supervisor
  fullName?:            string | null
  birthDate?:           string | null
  birthPlace?:          string | null
  residence?:           string | null
  fiscalCode?:          string | null
  employmentType?:      string | null
  monthlyIncome?:       number | null
  contractType?:        string | null
  employmentStartDate?: string | null
  hasGuarantor?:        boolean
  guarantorIncome?:     number | null
}

export const tenantApi = {
  getProfile: () =>
    apiClient.get<TenantProfileDto>('/tenant/profile').then(r => r.data),

  updateProfile: (data: TenantUpdatePayload) =>
    apiClient.patch<TenantProfileDto>('/tenant/profile', data).then(r => r.data),

  setActive: (active: boolean) =>
    apiClient.patch<{ active: boolean }>('/tenant/status', { active }).then(r => r.data),

  deleteDocument: (id: string) =>
    apiClient.delete(`/tenant/documents/${id}`),

  deleteArea: () =>
    apiClient.delete('/onboarding/interest-area'),

  getMyValidations: () =>
    apiClient.get<FieldValidationDto[]>('/tenant/validations').then(r => r.data),
}
