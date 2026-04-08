import client from './client'
import type { ListingCardDto, TenantProfileCardDto, PagedResponse } from '@/types'

// ─── Tenant ───────────────────────────────────────────────────────────────────

export const tenantMatchApi = {
  /** Lista annunci compatibili per il tenant autenticato. */
  list: () =>
    client.get<ListingCardDto[]>('/tenant/matches').then(r => r.data),

  /** Match reciproci (MUTUAL_INTEREST o CONTACT_UNLOCKED). */
  listMutual: () =>
    client.get<ListingCardDto[]>('/tenant/matches/mutual').then(r => r.data),

  /** Dettaglio singolo match (con disclosure progressiva). */
  get: (matchId: string) =>
    client.get<ListingCardDto>(`/tenant/matches/${matchId}`).then(r => r.data),

  /** Esprime interesse ("Sono interessato"). */
  expressInterest: (matchId: string) =>
    client.post<ListingCardDto>(`/tenant/matches/${matchId}/interest`).then(r => r.data),

  /** Scarta il match ("Non mi interessa"). */
  dismiss: (matchId: string) =>
    client.post(`/tenant/matches/${matchId}/dismiss`),

  /** Accetta l'invito del locatore. */
  acceptInvite: (matchId: string) =>
    client.post<ListingCardDto>(`/tenant/matches/${matchId}/accept-invite`).then(r => r.data),

  /** Sblocca i contatti (da MUTUAL_INTEREST). */
  unlockContact: (matchId: string) =>
    client.post<ListingCardDto>(`/tenant/matches/${matchId}/unlock-contact`).then(r => r.data),
}

// ─── Landlord ─────────────────────────────────────────────────────────────────

export const landlordMatchApi = {
  /** Lista profili compatibili per un annuncio. */
  list: (listingId: string, page = 0, size = 20) =>
    client.get<PagedResponse<TenantProfileCardDto>>(
      `/landlord/listings/${listingId}/matches`,
      { params: { page, size } }
    ).then(r => r.data),

  /** Match reciproci per un annuncio. */
  listMutual: (listingId: string) =>
    client.get<TenantProfileCardDto[]>(
      `/landlord/listings/${listingId}/matches/mutual`
    ).then(r => r.data),

  /** Dettaglio singolo match. */
  get: (listingId: string, matchId: string) =>
    client.get<TenantProfileCardDto>(
      `/landlord/listings/${listingId}/matches/${matchId}`
    ).then(r => r.data),

  /** Segnala interesse. */
  expressInterest: (listingId: string, matchId: string) =>
    client.post<TenantProfileCardDto>(
      `/landlord/listings/${listingId}/matches/${matchId}/interest`
    ).then(r => r.data),

  /** Invita al contatto (sblocca direttamente se il tenant ha già espresso interesse). */
  invite: (listingId: string, matchId: string) =>
    client.post<TenantProfileCardDto>(
      `/landlord/listings/${listingId}/matches/${matchId}/invite`
    ).then(r => r.data),

  /** Scarta il profilo ("Non interessante"). */
  dismiss: (listingId: string, matchId: string) =>
    client.post(`/landlord/listings/${listingId}/matches/${matchId}/dismiss`),

  /** Sblocca i contatti (da MUTUAL_INTEREST). */
  unlockContact: (listingId: string, matchId: string) =>
    client.post<TenantProfileCardDto>(
      `/landlord/listings/${listingId}/matches/${matchId}/unlock-contact`
    ).then(r => r.data),
}
