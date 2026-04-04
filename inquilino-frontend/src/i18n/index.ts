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
    // Ban
    'chat.ban.title':               'Chat temporaneamente bloccata',
    'chat.ban.until':               'Potrai scrivere nuovamente il {time}.',
    'chat.ban.permanent':           'Il tuo accesso alla chat è stato bloccato permanentemente per messaggi ripetuti non validi. Contatta il supporto.',
    // Language select
    'lang.title':                   'Ciao! Scegli la lingua',
    'lang.subtitle':                'Choose your language',
    'lang.it':                      'Italiano',
    'lang.en':                      'English',
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
    // Ban
    'chat.ban.title':               'Chat temporarily blocked',
    'chat.ban.until':               'You will be able to write again on {time}.',
    'chat.ban.permanent':           'Your chat access has been permanently blocked for repeated invalid messages. Contact support.',
    // Language select
    'lang.title':                   'Ciao! Scegli la lingua',
    'lang.subtitle':                'Choose your language',
    'lang.it':                      'Italiano',
    'lang.en':                      'English',
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
