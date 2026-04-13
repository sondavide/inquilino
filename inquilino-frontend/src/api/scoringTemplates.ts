import { ScoringTemplate } from '@/types'

const base = '/api/admin/scoring-templates'

function authHeaders() {
  const token = localStorage.getItem('auth_token')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

export const scoringTemplateApi = {
  list: (): Promise<ScoringTemplate[]> =>
    fetch(base, { headers: authHeaders() }).then(r => r.json()),

  get: (id: string): Promise<ScoringTemplate> =>
    fetch(`${base}/${id}`, { headers: authHeaders() }).then(r => r.json()),

  create: (data: Omit<ScoringTemplate, 'id' | 'createdAt' | 'updatedAt' | 'linkedProfileCount'>): Promise<ScoringTemplate> =>
    fetch(base, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }).then(r => r.json()),

  update: (id: string, data: Omit<ScoringTemplate, 'id' | 'createdAt' | 'updatedAt' | 'linkedProfileCount'>): Promise<ScoringTemplate> =>
    fetch(`${base}/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }).then(r => r.json()),

  delete: (id: string): Promise<void> =>
    fetch(`${base}/${id}`, { method: 'DELETE', headers: authHeaders() }).then(() => undefined),

  /** Assegna un template a un profilo (supervisor). templateId=null = torna ai default. */
  assignToProfile: (profileId: string, templateId: string | null): Promise<void> =>
    fetch(`/api/supervisor/profiles/${profileId}/scoring-template`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ templateId }),
    }).then(() => undefined),
}
