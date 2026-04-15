import apiClient from './client'
import type { OnboardingStateDto, DocumentUploadResponse, InterestArea } from '@/types'

export interface ChatHistoryItem {
  id:        string
  role:      string
  content:   string
  createdAt: string
}

export const onboardingApi = {
  getState: () =>
    apiClient.get<OnboardingStateDto>('/onboarding/state').then(r => r.data),

  getHistory: () =>
    apiClient.get<ChatHistoryItem[]>('/onboarding/history').then(r => r.data),

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

  saveInterestAreas: (areas: InterestArea[]) =>
    apiClient.post('/onboarding/interest-area', areas).then(r => r.data),

  skipStep: () =>
    apiClient.post<OnboardingStateDto>('/onboarding/skip-step').then(r => r.data),
}
