import type { ListingCardDto } from '@/types'

/**
 * Genera un'analisi di compatibilità dell'appartamento dal punto di vista dell'inquilino.
 * Usa i campi già disponibili in ListingCardDto — nessuna chiamata AI aggiuntiva.
 */
export function buildTenantListingAnalysis(m: ListingCardDto): string {
  const parts: string[] = []

  // ── Apertura basata sul match globale ──────────────────────────────────────
  if (m.matchBand === 'EXCELLENT_MATCH') {
    parts.push('Questo appartamento corrisponde molto bene al tuo profilo.')
  } else if (m.matchBand === 'GOOD_MATCH') {
    parts.push('Questo appartamento si adatta bene alle tue esigenze.')
  } else if (m.matchBand === 'MEDIUM_MATCH') {
    parts.push('Questo appartamento soddisfa alcune delle tue preferenze.')
  } else {
    parts.push('Questo appartamento presenta alcune differenze rispetto alle tue preferenze.')
  }

  // ── Prezzo ────────────────────────────────────────────────────────────────
  if (m.priceCompatible) {
    const rent = m.monthlyRent
    parts.push(
      rent
        ? `Il canone di €${rent.toLocaleString('it-IT')}/mese è in linea con il tuo budget.`
        : 'Il prezzo è in linea con il tuo budget.'
    )
  } else {
    const rent = m.monthlyRent
    parts.push(
      rent
        ? `Il canone di €${rent.toLocaleString('it-IT')}/mese è superiore al tuo budget massimo.`
        : 'Il prezzo supera il tuo budget massimo.'
    )
  }

  // ── Zona ──────────────────────────────────────────────────────────────────
  if (m.areaCompatible) {
    const location = [m.district, m.municipality].filter(Boolean).join(', ')
    parts.push(
      location
        ? `La zona (${location}) rientra tra le aree che hai indicato come preferite.`
        : 'La zona rientra tra le aree che hai indicato come preferite.'
    )
  } else {
    parts.push('La zona non è tra le tue aree di interesse principali.')
  }

  // ── Timing ────────────────────────────────────────────────────────────────
  if (m.timingCompatible) {
    if (m.availableFrom) {
      const d = new Date(m.availableFrom).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
      parts.push(`È disponibile dal ${d}, compatibile con la tua data d'ingresso desiderata.`)
    } else {
      parts.push('La disponibilità è compatibile con la tua data d\'ingresso desiderata.')
    }
  } else {
    if (m.availabilityStatus === 'available_now') {
      parts.push('È disponibile subito, prima della tua data d\'ingresso prevista.')
    } else if (m.availableFrom) {
      const d = new Date(m.availableFrom).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
      parts.push(`È disponibile dal ${d}, che potrebbe non coincidere con le tue esigenze di tempistica.`)
    }
  }

  // ── Regole: animali, fumo, occupanti ──────────────────────────────────────
  const rules: string[] = []

  if (m.petsAllowed) {
    rules.push('sono ammessi animali domestici')
  } else {
    rules.push('non sono ammessi animali domestici')
  }

  if (m.smokingAllowed) {
    rules.push('è consentito fumare')
  }

  if (m.maxOccupants && m.maxOccupants > 1) {
    rules.push(`possono soggiornare fino a ${m.maxOccupants} persone`)
  }

  if (rules.length > 0) {
    const first = rules[0].charAt(0).toUpperCase() + rules[0].slice(1)
    if (rules.length === 1) {
      parts.push(`${first}.`)
    } else if (rules.length === 2) {
      parts.push(`${first} e ${rules[1]}.`)
    } else {
      const last = rules[rules.length - 1]
      const rest = rules.slice(0, -1).join(', ')
      parts.push(`${first.charAt(0).toUpperCase() + first.slice(1)}, ${rest} e ${last}.`)
    }
  }

  // ── Arredamento ───────────────────────────────────────────────────────────
  if (m.furnishedStatus === 'furnished') {
    parts.push('L\'appartamento è completamente arredato.')
  } else if (m.furnishedStatus === 'partially_furnished') {
    parts.push('L\'appartamento è parzialmente arredato.')
  } else if (m.furnishedStatus === 'unfurnished') {
    parts.push('L\'appartamento non è arredato.')
  }

  // ── Utenze incluse ────────────────────────────────────────────────────────
  if (m.utilitiesIncluded) {
    parts.push('Le utenze sono incluse nel canone.')
  }

  // ── Durata minima contratto ───────────────────────────────────────────────
  if (m.minimumContractDurationMonths && m.minimumContractDurationMonths > 0) {
    parts.push(`La durata minima del contratto è di ${m.minimumContractDurationMonths} mesi.`)
  }

  return parts.join(' ')
}
