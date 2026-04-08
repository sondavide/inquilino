import apiClient from './client'
import type { SupervisorUser, AuditLogEntry } from '@/types'

export const adminApi = {
  createSupervisor: (email: string, password: string, phone?: string) =>
    apiClient.post<SupervisorUser>('/admin/supervisors', { email, password, phone })
      .then(r => r.data),

  listSupervisors: () =>
    apiClient.get<SupervisorUser[]>('/admin/supervisors').then(r => r.data),

  getAuditLog: (profileId?: string, page = 0, size = 50) =>
    apiClient.get<{ content: AuditLogEntry[]; totalPages: number; totalElements: number }>(
      '/admin/audit-log',
      { params: { profileId, page, size } }
    ).then(r => r.data),
}
