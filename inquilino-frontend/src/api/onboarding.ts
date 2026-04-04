import apiClient from './client'
import type { OnboardingStateDto, DocumentUploadResponse, InterestArea } from '@/types'

export const onboardingApi = {
  getState: () =>
    apiClient.get<OnboardingStateDto>('/onboarding/state').then(r => r.data),

  goBack: () =>
    apiClient.post<OnboardingStateDto>('/onboarding/back').then(r => r.data),

  uploadDocument: (file: File, type: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('type', type)
    return apiClient.post<DocumentUploadResponse>('/onboarding/documents', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  listDocuments: () =>
    apiClient.get('/onboarding/documents').then(r => r.data),

  saveInterestArea: (area: InterestArea) =>
    apiClient.post('/onboarding/interest-area', area).then(r => r.data),
}
