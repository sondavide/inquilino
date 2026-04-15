import apiClient from './client'
import type {
  ListingDto,
  ListingSummary,
  PagedResponse,
  SaveListingRequest,
  ListingMediaItem,
  ListingFieldValidation,
  LandlordProfile,
} from '../types'

// ─── Landlord: CRUD annunci ───────────────────────────────────────────────────

export const getMyListings = () =>
  apiClient.get<ListingSummary[]>('/landlord/listings').then(r => r.data)

export const getListing = (id: string) =>
  apiClient.get<ListingDto>(`/landlord/listings/${id}`).then(r => r.data)

export const createListing = (req: SaveListingRequest) =>
  apiClient.post<ListingDto>('/landlord/listings', req).then(r => r.data)

export const updateListing = (id: string, req: SaveListingRequest) =>
  apiClient.put<ListingDto>(`/landlord/listings/${id}`, req).then(r => r.data)

export const submitForReview = (id: string) =>
  apiClient.post<{ status: string }>(`/landlord/listings/${id}/submit`).then(r => r.data)

export const revertToDraft = (id: string) =>
  apiClient.post<{ status: string }>(`/landlord/listings/${id}/revert-to-draft`).then(r => r.data)

export const getListingValidations = (id: string) =>
  apiClient.get<ListingFieldValidation[]>(`/landlord/listings/${id}/validations`).then(r => r.data)

// ─── Landlord: media ──────────────────────────────────────────────────────────

export const uploadMedia = (listingId: string, file: File, mediaType = 'IMAGE') => {
  const form = new FormData()
  form.append('file', file)
  form.append('mediaType', mediaType)
  return apiClient.post<ListingMediaItem>(`/landlord/listings/${listingId}/media`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export const deleteMedia = (listingId: string, mediaId: string) =>
  apiClient.delete(`/landlord/listings/${listingId}/media/${mediaId}`)

export const setCoverMedia = (listingId: string, mediaId: string) =>
  apiClient.patch(`/landlord/listings/${listingId}/media/${mediaId}/cover`)

export const reorderMedia = (listingId: string, orderedIds: string[]) =>
  apiClient.patch(`/landlord/listings/${listingId}/media/reorder`, orderedIds)

// ─── Landlord: profilo ────────────────────────────────────────────────────────

export const getLandlordProfile = () =>
  apiClient.get<LandlordProfile>('/landlord/profile').then(r => r.data)

export const updateLandlordProfile = (data: {
  phone?: string
  displayName?: string
  contactMode?: string
  contactPhone?: string
  contactEmail?: string
  agencyName?: string
  vatNumber?: string
  reaNumber?: string
  websiteUrl?: string
}) => apiClient.patch<LandlordProfile>('/landlord/profile', data).then(r => r.data)

// ─── Supervisor: coda annunci ─────────────────────────────────────────────────

export const getSupervisorListingQueue = (statuses = 'IN_REVIEW', page = 0, size = 20) =>
  apiClient.get<PagedResponse<ListingSummary>>('/supervisor/listings', { params: { statuses, page, size } }).then(r => r.data)

export const getSupervisorListing = (id: string) =>
  apiClient.get<ListingDto>(`/supervisor/listings/${id}`).then(r => r.data)

export const approveListingField = (listingId: string, fieldName: string) =>
  apiClient.post<ListingFieldValidation>(`/supervisor/listings/${listingId}/fields/${fieldName}/approve`).then(r => r.data)

export const flagListingField = (listingId: string, fieldName: string, note: string) =>
  apiClient.post<ListingFieldValidation>(`/supervisor/listings/${listingId}/fields/${fieldName}/flag`, { note }).then(r => r.data)

export const resetListingField = (listingId: string, fieldName: string) =>
  apiClient.delete(`/supervisor/listings/${listingId}/fields/${fieldName}/approve`)

export const completeListingValidation = (listingId: string) =>
  apiClient.post<{ status: string }>(`/supervisor/listings/${listingId}/complete-validation`).then(r => r.data)

// ─── Auth: registrazione landlord ─────────────────────────────────────────────

export const registerLandlord = (data: {
  email: string
  password: string
  phone?: string
  displayName: string
  publisherType: string
  agencyName?: string
  vatNumber?: string
  reaNumber?: string
  contactMode?: string
  contactPhone?: string
  contactEmail?: string
  websiteUrl?: string
  verificationCode: string
}) => apiClient.post<{ token: string; userId: string; email: string }>(
  '/auth/register/landlord', data
).then(r => r.data)
