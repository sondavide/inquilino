import apiClient from './client'
import type { AppNotification } from '@/types'

export const notificationsApi = {
  getAll: () =>
    apiClient.get<AppNotification[]>('/notifications').then(r => r.data),

  getUnreadCount: () =>
    apiClient.get<{ count: number }>('/notifications/unread-count').then(r => r.data),

  markRead: (id: string) =>
    apiClient.post(`/notifications/${id}/read`),

  markAllRead: () =>
    apiClient.post('/notifications/read-all'),

  subscribePush: (endpoint: string, p256dh: string, auth: string) =>
    apiClient.post('/notifications/push/subscribe', { endpoint, p256dh, auth }),

  unsubscribePush: (endpoint: string) =>
    apiClient.delete('/notifications/push/subscribe', { data: { endpoint } }),
}
