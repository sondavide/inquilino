import apiClient from './client'
import type {
  SupervisorProfileSummary,
  SupervisorProfileDetail,
  PagedResponse,
  FieldValidationDto,
  SupervisorDocumentDto,
  ChatMessageDto,
  InterestAreaDto,
  InterestArea,
  FiscalCodeAnalysis,
} from '@/types'

export const supervisorApi = {
  // Lista profili
  listProfiles: (statuses = 'PENDING_VALIDATION,IN_VALIDATION,NEEDS_CORRECTION', page = 0, size = 20) =>
    apiClient.get<PagedResponse<SupervisorProfileSummary>>('/supervisor/profiles', { params: { statuses, page, size } })
      .then(r => r.data),

  // Dettaglio profilo (apre IN_VALIDATION automaticamente)
  getProfile: (profileId: string) =>
    apiClient.get<SupervisorProfileDetail>(`/supervisor/profiles/${profileId}`)
      .then(r => r.data),

  // Field validations
  getValidations: (profileId: string) =>
    apiClient.get<FieldValidationDto[]>(`/supervisor/profiles/${profileId}/validations`)
      .then(r => r.data),

  approveField: (profileId: string, fieldName: string) =>
    apiClient.post<FieldValidationDto>(
      `/supervisor/profiles/${profileId}/fields/${fieldName}/approve`)
      .then(r => r.data),

  flagField: (profileId: string, fieldName: string, note: string) =>
    apiClient.post<FieldValidationDto>(
      `/supervisor/profiles/${profileId}/fields/${fieldName}/flag`, { note })
      .then(r => r.data),

  completeValidation: (profileId: string) =>
    apiClient.post<{ verificationStatus: string }>(
      `/supervisor/profiles/${profileId}/complete-validation`)
      .then(r => r.data),

  resetFieldApproval: (profileId: string, fieldName: string) =>
    apiClient.delete(`/supervisor/profiles/${profileId}/fields/${fieldName}/approve`),

  getFiscalCodeAnalysis: (profileId: string) =>
    apiClient.get<FiscalCodeAnalysis>(`/supervisor/profiles/${profileId}/tools/fiscal-code`)
      .then(r => r.data),

  // Chat history
  getChatHistory: (profileId: string) =>
    apiClient.get<ChatMessageDto[]>(`/supervisor/profiles/${profileId}/chat`)
      .then(r => r.data),

  // Documenti
  getDocuments: (profileId: string) =>
    apiClient.get<SupervisorDocumentDto[]>(`/supervisor/profiles/${profileId}/documents`)
      .then(r => r.data),

  getDocumentPreviewUrl: (profileId: string, docId: string) =>
    `/api/supervisor/profiles/${profileId}/documents/${docId}/preview`,

  // Interest areas
  getInterestAreas: (profileId: string) =>
    apiClient.get<InterestAreaDto[]>(`/supervisor/profiles/${profileId}/interest-areas`)
      .then(r => r.data),

  updateInterestAreas: (profileId: string, areas: InterestArea[]) =>
    apiClient.put(`/supervisor/profiles/${profileId}/interest-areas`, areas),
}
