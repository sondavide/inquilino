import { createContext, useContext, useState } from 'react'

export type Lang = 'it' | 'en'

const LANG_KEY = 'lang'

export function hasStoredLang(): boolean {
  return localStorage.getItem(LANG_KEY) !== null
}

export function getStoredLang(): Lang {
  return (localStorage.getItem(LANG_KEY) as Lang) || 'it'
}

export function storeLang(lang: Lang): void {
  localStorage.setItem(LANG_KEY, lang)
}

// ─── Translations ─────────────────────────────────────────────────────────────

const translations = {
  it: {
    // App
    'app.loading':                  'Caricamento...',
    // Onboarding page
    'chat.placeholder':             'Scrivi un messaggio…',
    'chat.send':                    'Invia',
    'chat.error.connection':        'Errore di connessione. Riprova.',
    'chat.error.ratelimit':         '⚠️ Troppe richieste al servizio AI. Riprova tra qualche secondo.',
    'chat.error.generic':           '⚠️ Errore temporaneo del servizio AI. Riprova.',
    'chat.upload.message':          'Ho caricato il documento: {filename}',
    // Progress bar
    'progress.step':                'Step {n} / {total}',
    // Upload button
    'upload.title':                 'Carica documento',
    'upload.input_hint':            'Usa il pulsante 📎 per caricare il documento',
    'upload.camera':                'Fotocamera',
    'upload.file':                  'File',
    'upload.error':                 'Upload fallito. Riprova.',
    // Camera capture
    'camera.doc.identity_card':     "Carta d'identità",
    'camera.doc.passport':          'Passaporto',
    'camera.doc.driving_license':   'Patente di guida',
    'camera.doc.income_payslip':    'Busta paga',
    'camera.doc.tax_return':        'Dichiarazione dei redditi',
    'camera.doc.tax_declaration':   'Documento fiscale',
    'camera.doc.income_statement':  'Estratto conto',
    'camera.doc.default':           'Documento',
    'camera.select.title':          'Cosa vuoi fotografare?',
    'camera.preview.use':           'Usa questa foto',
    'camera.preview.retake':        'Riscatta',
    'camera.status.poor':           'Inquadra il documento nel riquadro',
    'camera.status.ok':             'Quasi… avvicina il documento',
    'camera.status.good.countdown': 'Scatto automatico in {n}s…',
    'camera.status.good':           'Perfetto!',
    'camera.error':                 'Fotocamera non disponibile. Usa l\'opzione "File" per caricare il documento.',
    'camera.close':                 'Chiudi',
    // Map selector
    'map.search.placeholder':       'Cerca un\'altra città…',
    'map.confirm':                  'Conferma',
    'map.message.single':           'Sono interessato a {city}',
    'map.message.multiple':         'Sono interessato a queste città: {cities}',
    'map.open':                     'Seleziona area di interesse',
    'map.mode.neighborhoods':       'Quartieri',
    'map.mode.draw':                'Disegna area',
    'map.mode.anywhere':            'Ovunque',
    'map.neighborhoods.loading':    'Caricamento quartieri…',
    'map.neighborhoods.none':       'Nessun quartiere trovato. Prova a cercare un\'altra città.',
    'map.draw.hint':                'Sposta la mappa e tocca "Aggiungi punto" per disegnare l\'area',
    'map.draw.add_point':           'Aggiungi punto',
    'map.draw.close':               'Chiudi area',
    'map.draw.reset':               'Ricomincia',
    'map.draw.points':              '{n} punti',
    'map.message.neighborhoods':    'Sono interessato a questi quartieri di {city}: {neighborhoods}',
    'map.message.area':             'Ho selezionato un\'area sulla mappa vicino a {city}',
    'map.message.anywhere':         'Sono disponibile a qualsiasi zona di {city}',
    'map.area.city_boundary':       'Confine città',
    'map.draw.confirm':             '✓ Aggiungi',
    'map.no_city':                  'Cerca una città nella barra in alto per selezionare la tua area di interesse',
    'map.badge.hint':               '— tap per eliminare',
    'map.area.delete':              'Elimina',
    'map.area.cancel':              'Annulla',
    // Ban
    'chat.ban.title':               'Chat temporaneamente bloccata',
    'chat.ban.until':               'Potrai scrivere nuovamente il {time}.',
    'chat.ban.permanent':           'Il tuo accesso alla chat è stato bloccato permanentemente per messaggi ripetuti non validi. Contatta il supporto.',
    // Language select
    'lang.title':                   'Ciao! Scegli la lingua',
    'lang.subtitle':                'Choose your language',
    'lang.it':                      'Italiano',
    'lang.en':                      'English',
    // Home page
    'home.welcome':                 'Bentornato',
    'home.logout':                  'Esci',
    'home.onboarding.title':        'Completa il tuo profilo',
    'home.onboarding.desc':         'Per accedere a tutte le funzionalità completa la procedura di verifica.',
    'home.onboarding.cta':          'Avvia la procedura',
    'home.tile.profile':            'Il mio profilo',
    'home.tile.profile.desc':       'Visualizza e modifica i tuoi dati',
    'home.tile.documents':          'Documenti',
    'home.tile.documents.desc':     'Gestisci i documenti caricati',
    'home.tile.areas':              'Aree di interesse',
    'home.tile.areas.desc':         'Modifica le zone dove cerchi casa',
    'home.tile.matching':           'Case disponibili',
    'home.tile.matching.desc':      'Presto disponibile',
    'home.active.label':            'Profilo attivo',
    'home.active.on':               'Visibile ai locatori',
    'home.active.off':              'Profilo disattivato',
    'home.status.none':             'In attesa di verifica',
    'home.status.partial':          'Verifica parziale',
    'home.status.verified':         'Verificato',
    'home.completion':              'Completamento profilo',
    // Tenant profile page
    'profile.title':                'Il mio profilo',
    'profile.back':                 'Home',
    'profile.edit':                 'Modifica',
    'profile.save':                 'Salva',
    'profile.cancel':               'Annulla',
    'profile.saving':               'Salvataggio…',
    'profile.locked':               'Campo verificato – non modificabile',
    'profile.section.personal':     'Dati personali',
    'profile.section.employment':   'Situazione lavorativa',
    'profile.section.housing':      'Preferenze abitative',
    'profile.section.guarantor':    'Garante',
    'profile.section.documents':    'Documenti',
    'profile.section.areas':        'Aree di interesse',
    'profile.fullName':             'Nome e cognome',
    'profile.birthDate':            'Data di nascita',
    'profile.birthPlace':           'Luogo di nascita',
    'profile.residence':            'Residenza',
    'profile.fiscalCode':           'Codice fiscale',
    'profile.employmentType':       'Tipo di impiego',
    'profile.employmentType.EMPLOYEE':      'Dipendente',
    'profile.employmentType.SELF_EMPLOYED': 'Autonomo / Libero professionista',
    'profile.employmentType.STUDENT':       'Studente',
    'profile.employmentType.RETIRED':       'Pensionato',
    'profile.employmentType.OTHER':         'Altro',
    'profile.monthlyIncome':        'Reddito mensile netto (€)',
    'profile.contractType':         'Tipo contratto',
    'profile.employmentStart':      'Inizio impiego',
    'profile.hasGuarantor':         'Ha un garante',
    'profile.guarantorIncome':      'Reddito garante (€/mese)',
    'profile.maxBudget':            'Budget massimo (€/mese)',
    'profile.moveInDate':           'Data ingresso desiderata',
    'profile.occupants':            'Numero occupanti',
    'profile.hasPets':              'Animali domestici',
    'profile.smoker':               'Fumatore',
    'profile.yes':                  'Sì',
    'profile.no':                   'No',
    'profile.na':                   'Non specificato',
    // Scores
    'score.rentSustainability':     'Sostenibilità canone',
    'score.incomeStability':        'Stabilità reddito',
    'score.documentReliability':    'Affidabilità documentale',
    'score.HIGH':                   'Alta',
    'score.MEDIUM':                 'Media',
    'score.LOW':                    'Bassa',
    // Documents
    'doc.add':                      'Aggiungi documento',
    'doc.delete':                   'Elimina',
    'doc.verified':                 'Verificato',
    'doc.pending':                  'In attesa',
    'doc.type.IDENTITY':            'Documento identità',
    'doc.type.PAYSLIP':             'Busta paga',
    'doc.type.EMPLOYMENT_CONTRACT': 'Contratto di lavoro',
    'doc.type.TAX_RETURN':          'Dichiarazione redditi',
    'doc.type.BANK_STATEMENT':      'Estratto conto',
    'doc.type.LANDLORD_REFERENCE':  'Referenza locatore',
    'doc.type.GUARANTOR_DOCUMENT':  'Documento garante',
    'doc.delete.confirm':           'Eliminare questo documento?',
    // Areas
    'area.type.POLYGON':            'Area personalizzata',
    'area.type.CITY_BOUNDARY':      'Città',
    'area.type.ANYWHERE':           'Ovunque',
    'area.edit':                    'Modifica area',
    'area.none':                    'Nessuna area impostata',
    // Placeholder roles
    'role.supervisor':              'Area Supervisore',
    'role.supervisor.desc':         'In sviluppo',
    'role.agency':                  'Area Agenzia',
    'role.agency.desc':             'In sviluppo',
    'role.superadmin':              'Area Super Admin',
    'role.superadmin.desc':         'In sviluppo',
  },
  en: {
    // App
    'app.loading':                  'Loading...',
    // Onboarding page
    'chat.placeholder':             'Type a message…',
    'chat.send':                    'Send',
    'chat.error.connection':        'Connection error. Please retry.',
    'chat.error.ratelimit':         '⚠️ Too many requests to the AI service. Please try again in a moment.',
    'chat.error.generic':           '⚠️ Temporary AI service error. Please try again.',
    'chat.upload.message':          'I have uploaded the document: {filename}',
    // Progress bar
    'progress.step':                'Step {n} / {total}',
    // Upload button
    'upload.title':                 'Upload document',
    'upload.input_hint':            'Use the 📎 button to upload the document',
    'upload.camera':                'Camera',
    'upload.file':                  'File',
    'upload.error':                 'Upload failed. Please try again.',
    // Camera capture
    'camera.doc.identity_card':     'ID Card',
    'camera.doc.passport':          'Passport',
    'camera.doc.driving_license':   "Driver's license",
    'camera.doc.income_payslip':    'Pay slip',
    'camera.doc.tax_return':        'Tax return',
    'camera.doc.tax_declaration':   'Tax document',
    'camera.doc.income_statement':  'Bank statement',
    'camera.doc.default':           'Document',
    'camera.select.title':          'What do you want to photograph?',
    'camera.preview.use':           'Use this photo',
    'camera.preview.retake':        'Retake',
    'camera.status.poor':           'Position the document in the frame',
    'camera.status.ok':             'Almost… hold the document still',
    'camera.status.good.countdown': 'Auto-capture in {n}s…',
    'camera.status.good':           'Perfect!',
    'camera.error':                 'Camera not available. Use the "File" option to upload the document.',
    'camera.close':                 'Close',
    // Map selector
    'map.search.placeholder':       'Search for another city…',
    'map.confirm':                  'Confirm',
    'map.message.single':           'I am interested in {city}',
    'map.message.multiple':         'I am interested in these cities: {cities}',
    'map.open':                     'Select area of interest',
    'map.mode.neighborhoods':       'Neighborhoods',
    'map.mode.draw':                'Draw area',
    'map.mode.anywhere':            'Anywhere',
    'map.neighborhoods.loading':    'Loading neighborhoods…',
    'map.neighborhoods.none':       'No neighborhoods found. Try searching for another city.',
    'map.draw.hint':                'Move the map and tap "Add point" to draw the area',
    'map.draw.add_point':           'Add point',
    'map.draw.close':               'Close area',
    'map.draw.reset':               'Reset',
    'map.draw.points':              '{n} points',
    'map.message.neighborhoods':    'I am interested in these neighborhoods of {city}: {neighborhoods}',
    'map.message.area':             'I selected an area on the map near {city}',
    'map.message.anywhere':         'I am open to any area of {city}',
    'map.area.city_boundary':       'City boundary',
    'map.draw.confirm':             '✓ Add',
    'map.no_city':                  'Search for a city above to select your area of interest',
    'map.badge.hint':               '— tap to remove',
    'map.area.delete':              'Delete',
    'map.area.cancel':              'Cancel',
    // Ban
    'chat.ban.title':               'Chat temporarily blocked',
    'chat.ban.until':               'You will be able to write again on {time}.',
    'chat.ban.permanent':           'Your chat access has been permanently blocked for repeated invalid messages. Contact support.',
    // Language select
    'lang.title':                   'Ciao! Scegli la lingua',
    'lang.subtitle':                'Choose your language',
    'lang.it':                      'Italiano',
    'lang.en':                      'English',
    // Home page
    'home.welcome':                 'Welcome back',
    'home.logout':                  'Logout',
    'home.onboarding.title':        'Complete your profile',
    'home.onboarding.desc':         'Complete the verification process to access all features.',
    'home.onboarding.cta':          'Start now',
    'home.tile.profile':            'My profile',
    'home.tile.profile.desc':       'View and edit your information',
    'home.tile.documents':          'Documents',
    'home.tile.documents.desc':     'Manage your uploaded documents',
    'home.tile.areas':              'Areas of interest',
    'home.tile.areas.desc':         'Edit the areas where you are looking for a home',
    'home.tile.matching':           'Available properties',
    'home.tile.matching.desc':      'Coming soon',
    'home.active.label':            'Active profile',
    'home.active.on':               'Visible to landlords',
    'home.active.off':              'Profile deactivated',
    'home.status.none':             'Awaiting verification',
    'home.status.partial':          'Partially verified',
    'home.status.verified':         'Verified',
    'home.completion':              'Profile completion',
    // Tenant profile page
    'profile.title':                'My profile',
    'profile.back':                 'Home',
    'profile.edit':                 'Edit',
    'profile.save':                 'Save',
    'profile.cancel':               'Cancel',
    'profile.saving':               'Saving…',
    'profile.locked':               'Verified field – cannot be edited',
    'profile.section.personal':     'Personal information',
    'profile.section.employment':   'Employment',
    'profile.section.housing':      'Housing preferences',
    'profile.section.guarantor':    'Guarantor',
    'profile.section.documents':    'Documents',
    'profile.section.areas':        'Areas of interest',
    'profile.fullName':             'Full name',
    'profile.birthDate':            'Date of birth',
    'profile.birthPlace':           'Place of birth',
    'profile.residence':            'Residence',
    'profile.fiscalCode':           'Tax code',
    'profile.employmentType':       'Employment type',
    'profile.employmentType.EMPLOYEE':      'Employee',
    'profile.employmentType.SELF_EMPLOYED': 'Self-employed / Freelance',
    'profile.employmentType.STUDENT':       'Student',
    'profile.employmentType.RETIRED':       'Retired',
    'profile.employmentType.OTHER':         'Other',
    'profile.monthlyIncome':        'Net monthly income (€)',
    'profile.contractType':         'Contract type',
    'profile.employmentStart':      'Employment start date',
    'profile.hasGuarantor':         'Has a guarantor',
    'profile.guarantorIncome':      'Guarantor income (€/month)',
    'profile.maxBudget':            'Maximum budget (€/month)',
    'profile.moveInDate':           'Desired move-in date',
    'profile.occupants':            'Number of occupants',
    'profile.hasPets':              'Pets',
    'profile.smoker':               'Smoker',
    'profile.yes':                  'Yes',
    'profile.no':                   'No',
    'profile.na':                   'Not specified',
    // Scores
    'score.rentSustainability':     'Rent sustainability',
    'score.incomeStability':        'Income stability',
    'score.documentReliability':    'Document reliability',
    'score.HIGH':                   'High',
    'score.MEDIUM':                 'Medium',
    'score.LOW':                    'Low',
    // Documents
    'doc.add':                      'Add document',
    'doc.delete':                   'Delete',
    'doc.verified':                 'Verified',
    'doc.pending':                  'Pending',
    'doc.type.IDENTITY':            'Identity document',
    'doc.type.PAYSLIP':             'Pay slip',
    'doc.type.EMPLOYMENT_CONTRACT': 'Employment contract',
    'doc.type.TAX_RETURN':          'Tax return',
    'doc.type.BANK_STATEMENT':      'Bank statement',
    'doc.type.LANDLORD_REFERENCE':  'Landlord reference',
    'doc.type.GUARANTOR_DOCUMENT':  'Guarantor document',
    'doc.delete.confirm':           'Delete this document?',
    // Areas
    'area.type.POLYGON':            'Custom area',
    'area.type.CITY_BOUNDARY':      'City',
    'area.type.ANYWHERE':           'Anywhere',
    'area.edit':                    'Edit area',
    'area.none':                    'No area set',
    // Placeholder roles
    'role.supervisor':              'Supervisor Area',
    'role.supervisor.desc':         'Under development',
    'role.agency':                  'Agency Area',
    'role.agency.desc':             'Under development',
    'role.superadmin':              'Super Admin Area',
    'role.superadmin.desc':         'Under development',
  },
} as const

type TranslationKey = keyof typeof translations.it

// ─── Standalone t() — reads lang from localStorage (use outside components) ──

export function t(
  key: TranslationKey,
  paramsOrLang?: Record<string, string | number> | Lang,
  params?: Record<string, string | number>,
): string {
  let lang: Lang
  let p: Record<string, string | number> | undefined

  if (typeof paramsOrLang === 'string') {
    lang = paramsOrLang
    p = params
  } else {
    lang = getStoredLang()
    p = paramsOrLang
  }

  const dict = translations[lang] ?? translations.it
  let str: string = (dict as Record<string, string>)[key] ?? key
  if (p) {
    Object.entries(p).forEach(([k, v]) => { str = str.replace(`{${k}}`, String(v)) })
  }
  return str
}

// ─── React context ────────────────────────────────────────────────────────────

interface LangContextType {
  lang: Lang
  hasLang: boolean
  setLang: (l: Lang) => void
  /** Reactive t() — triggers re-render on lang change */
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

export const LangContext = createContext<LangContextType>({
  lang: 'it',
  hasLang: false,
  setLang: () => {},
  t: (key, params) => t(key, 'it', params),
})

export function useLang() {
  return useContext(LangContext)
}

// ─── Provider ─────────────────────────────────────────────────────────────────

import { createElement, type ReactNode } from 'react'

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getStoredLang)
  const [hasLang, setHasLang] = useState<boolean>(hasStoredLang)

  function setLang(l: Lang) {
    storeLang(l)
    setLangState(l)
    setHasLang(true)
  }

  const translate = (key: TranslationKey, params?: Record<string, string | number>) =>
    t(key, lang, params)

  return createElement(LangContext.Provider, { value: { lang, hasLang, setLang, t: translate } }, children)
}
