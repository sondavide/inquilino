import apiClient from './client'
import type { TenantProfileDto, FieldValidationDto, GuarantorDto, GuarantorRequest, SupervisorNoteDto } from '@/types'

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

  // Garanti
  listGuarantors: () =>
    apiClient.get<GuarantorDto[]>('/tenant/guarantors').then(r => r.data),

  addGuarantor: (req: GuarantorRequest) =>
    apiClient.post<GuarantorDto>('/tenant/guarantors', req).then(r => r.data),

  updateGuarantor: (id: string, req: GuarantorRequest) =>
    apiClient.put<GuarantorDto>(`/tenant/guarantors/${id}`, req).then(r => r.data),

  deleteGuarantor: (id: string) =>
    apiClient.delete(`/tenant/guarantors/${id}`),

  // Azioni pending dal supervisore
  getPendingActions: () =>
    apiClient.get<SupervisorNoteDto[]>('/tenant/pending-actions').then(r => r.data),

  markActionReplied: (noteId: string) =>
    apiClient.post<SupervisorNoteDto>(`/tenant/pending-actions/${noteId}/reply`).then(r => r.data),
}
