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
  OnboardingStateInfo,
  ScoreDetailDto,
  ScoreOverrideRequest,
  ScoreBreakdownDto,
  GuarantorDto,
  GuarantorRequest,
  SupervisorNoteDto,
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

  // Onboarding
  getOnboardingState: (profileId: string) =>
    apiClient.get<OnboardingStateInfo>(`/supervisor/profiles/${profileId}/onboarding-state`)
      .then(r => r.data),

  advanceOnboardingStep: (profileId: string) =>
    apiClient.post<OnboardingStateInfo>(`/supervisor/profiles/${profileId}/advance-onboarding-step`)
      .then(r => r.data),

  // Score override
  setScoreOverride: (profileId: string, req: ScoreOverrideRequest) =>
    apiClient.put<ScoreDetailDto>(`/supervisor/profiles/${profileId}/score-override`, req)
      .then(r => r.data),

  deleteScoreOverride: (profileId: string) =>
    apiClient.delete(`/supervisor/profiles/${profileId}/score-override`),

  // Score breakdown completo
  getScoreBreakdown: (profileId: string) =>
    apiClient.get<ScoreBreakdownDto>(`/supervisor/profiles/${profileId}/score-breakdown`)
      .then(r => r.data),

  // Verified value su campo
  setVerifiedValue: (profileId: string, fieldName: string, verifiedValue: string | null) =>
    apiClient.patch<FieldValidationDto>(
      `/supervisor/profiles/${profileId}/fields/${fieldName}/verified-value`,
      { verifiedValue })
      .then(r => r.data),

  // Garanti
  listGuarantors: (profileId: string) =>
    apiClient.get<GuarantorDto[]>(`/supervisor/profiles/${profileId}/guarantors`)
      .then(r => r.data),

  addGuarantor: (profileId: string, req: GuarantorRequest) =>
    apiClient.post<GuarantorDto>(`/supervisor/profiles/${profileId}/guarantors`, req)
      .then(r => r.data),

  updateGuarantor: (profileId: string, guarantorId: string, req: GuarantorRequest) =>
    apiClient.put<GuarantorDto>(`/supervisor/profiles/${profileId}/guarantors/${guarantorId}`, req)
      .then(r => r.data),

  verifyGuarantorIncome: (profileId: string, guarantorId: string, verifiedMonthlyIncome: number | null) =>
    apiClient.put<GuarantorDto>(
      `/supervisor/profiles/${profileId}/guarantors/${guarantorId}/verify-income`,
      { verifiedMonthlyIncome })
      .then(r => r.data),

  deleteGuarantor: (profileId: string, guarantorId: string) =>
    apiClient.delete(`/supervisor/profiles/${profileId}/guarantors/${guarantorId}`),

  // Note al tenant
  listNotes: (profileId: string) =>
    apiClient.get<SupervisorNoteDto[]>(`/supervisor/profiles/${profileId}/notes`)
      .then(r => r.data),

  sendNote: (profileId: string, message: string, requestedItems: string[]) =>
    apiClient.post<SupervisorNoteDto>(`/supervisor/profiles/${profileId}/notes`, { message, requestedItems })
      .then(r => r.data),

  resolveNote: (profileId: string, noteId: string) =>
    apiClient.put<SupervisorNoteDto>(`/supervisor/profiles/${profileId}/notes/${noteId}/resolve`)
      .then(r => r.data),

  deleteNote: (profileId: string, noteId: string) =>
    apiClient.delete(`/supervisor/profiles/${profileId}/notes/${noteId}`),

  // Per-document supervisor check (stores supervisor_verified in extractedData)
  supervisorVerifyDocument: (profileId: string, docId: string, checked: boolean) =>
    apiClient.patch<{ id: string; supervisorVerified: boolean }>(
      `/supervisor/profiles/${profileId}/documents/${docId}/supervisor-verify`,
      { checked })
      .then(r => r.data),
}
