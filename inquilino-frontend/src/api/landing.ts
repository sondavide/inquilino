/**
 * Landing page API helpers.
 * Municipality search is intentionally mocked:
 * the backend always returns positive results.
 */

export interface MunicipalityResult {
  city: string
  tenantProfiles: number
  listings: number
}

/** Deterministic hash so the same city always shows the same count */
function cityHash(city: string, seed: number): number {
  let h = seed ^ 0xdeadbeef
  for (let i = 0; i < city.length; i++) {
    h = Math.imul(h ^ city.charCodeAt(i), 0x9e3779b9)
    h ^= h >>> 16
  }
  return Math.abs(h)
}

/**
 * Mocked: always returns that profiles/listings exist.
 * Replace with a real API call when backend is ready.
 */
export async function checkMunicipalityAvailability(city: string): Promise<MunicipalityResult> {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 400))

  const tenantProfiles = (cityHash(city, 1) % 55) + 8   // 8–62
  const listings       = (cityHash(city, 2) % 28) + 3   // 3–30

  return { city, tenantProfiles, listings }
}

export interface AgencyContactPayload {
  name: string
  email: string
  agencyName: string
  city: string
  message: string
}

/**
 * Sends an agency partnership enquiry.
 * Replace PARTNER_EMAIL_ENDPOINT with the actual server-side handler.
 * Server-side MUST implement rate limiting (e.g. 3 requests / IP / hour).
 */
export async function sendAgencyContact(payload: AgencyContactPayload): Promise<void> {
  const res = await fetch('/api/public/agency-contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('send_failed')
}
