import apiClient from './client'
import type {
  AgencyProfileDto,
  AgencyProfileSummary,
  AgencyMembershipDto,
  AgencyArea,
  PagedResponse,
} from '../types'

// ─── Auth: registrazione agenzia ──────────────────────────────────────────────

export const registerAgency = (data: {
  email: string; password: string; phone?: string
  agencyName: string; vatNumber?: string; reaNumber?: string
  websiteUrl?: string; contactPhone?: string; verificationCode: string
}) =>
  apiClient.post<{ token: string; userId: string; email: string }>(
    '/auth/register/agency', data
  ).then(r => r.data)

// ─── Agency: profilo ──────────────────────────────────────────────────────────

export const getAgencyProfile = () =>
  apiClient.get<AgencyProfileDto>('/agency/profile').then(r => r.data)

export const updateAgencyProfile = (data: Partial<{
  agencyName: string; vatNumber: string; reaNumber: string
  websiteUrl: string; contactEmail: string; contactPhone: string
}>) =>
  apiClient.patch<AgencyProfileDto>('/agency/profile', data).then(r => r.data)

// ─── Agency: operatori ────────────────────────────────────────────────────────

export const getAgencyOperators = () =>
  apiClient.get<AgencyMembershipDto[]>('/agency/operators').then(r => r.data)

export const inviteOperator = (data: {
  email: string; displayName: string; listingScope?: string[] | null
}) =>
  apiClient.post<AgencyMembershipDto>('/agency/operators', data).then(r => r.data)

export const updateOperatorScope = (operatorUserId: string, listingScope: string[] | null) =>
  apiClient.patch<AgencyMembershipDto>(
    `/agency/operators/${operatorUserId}/scope`,
    { listingScope }
  ).then(r => r.data)

export const removeOperator = (operatorUserId: string) =>
  apiClient.delete(`/agency/operators/${operatorUserId}`)

// ─── Agency: rubrica ──────────────────────────────────────────────────────────

export const getAgencyRubrica = () =>
  apiClient.get<import('../types').TenantProfileCardDto[]>('/agency/rubrica').then(r => r.data)

export const getListingInterested = (listingId: string) =>
  apiClient.get<import('../types').TenantProfileCardDto[]>(
    `/agency/rubrica/listings/${listingId}`
  ).then(r => r.data)

// ─── Admin: gestione agenzie ──────────────────────────────────────────────────

export const adminListAgencies = (status?: string, page = 0, size = 20) =>
  apiClient.get<PagedResponse<AgencyProfileSummary>>('/admin/agencies', {
    params: { status, page, size }
  }).then(r => r.data)

export const adminGetAgency = (id: string) =>
  apiClient.get<AgencyProfileDto>(`/admin/agencies/${id}`).then(r => r.data)

export const adminApproveAgency = (id: string) =>
  apiClient.post<AgencyProfileDto>(`/admin/agencies/${id}/approve`).then(r => r.data)

export const adminRejectAgency = (id: string, note: string) =>
  apiClient.post<AgencyProfileDto>(`/admin/agencies/${id}/reject`, { note }).then(r => r.data)

export const adminSuspendAgency = (id: string, note: string) =>
  apiClient.post<AgencyProfileDto>(`/admin/agencies/${id}/suspend`, { note }).then(r => r.data)

export const adminUpdateAgencyAreas = (id: string, areas: AgencyArea[]) =>
  apiClient.patch<AgencyProfileDto>(`/admin/agencies/${id}/areas`, { areas }).then(r => r.data)
