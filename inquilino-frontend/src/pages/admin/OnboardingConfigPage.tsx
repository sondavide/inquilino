import { useEffect, useState, useCallback } from 'react'
import { adminApi } from '@/api/admin'
import type { StepConfigDto, StepAnalyticsDto, OnboardingAnalyticsResponse } from '@/api/admin'

// ─── Tipi interni ─────────────────────────────────────────────────────────────

type Tab = 'prompts' | 'analytics'
type ModalTab = 'system' | 'extraction' | 'examples' | 'notes'

// ─── Esempi per step ──────────────────────────────────────────────────────────

interface StepExample {
  system: { label: string; description: string; code: string }
  extraction: { label: string; description: string; code: string } | null
}

const STEP_EXAMPLES: Record<string, StepExample> = {
  STEP_03: {
    system: {
      label: 'Tono formale e diretto',
      description: 'Sostituisce il tono caldo con uno stile professionale asciutto. Utile se il target è business.',
      code: `You are a precise, professional assistant collecting identity data for a tenant verification platform.

COLLECTED DATA:
%s

Ask for the indicated field concisely and formally. Always include the expected format as an example.
Do not use filler phrases ("Great!", "Perfect!", etc.). Be direct and efficient.

%s`,
    },
    extraction: {
      label: 'Normalizzazione più aggressiva',
      description: 'Standardizza country in inglese e tronca la città al solo nome (senza provincia).',
      code: `Extract identity data from the user's message.
Return ONLY a valid JSON object. Use null for missing fields.

Fields:
  "full_name"     (string — first name + last name only, trimmed)
  "birth_date"    (YYYY-MM-DD — convert any format: "15/01/1990" → "1990-01-15")
  "birth_country" (English country name, standardized: "Italia" → "Italy")
  "birth_city"    (city name only — strip province/region if present)
  "residence"     (full address: street, number, city — e.g. "Via Roma 1, Milano")
  "fiscal_code"   (16 uppercase alphanumeric chars — copy verbatim, do not alter)

Return ONLY the JSON object, no markdown.`,
    },
  },

  STEP_04: {
    system: {
      label: 'Istruzioni upload più dettagliate',
      description: 'Aggiunge esempi espliciti di documenti accettati e chiarimenti su qualità foto.',
      code: `You are a warm, professional assistant helping a tenant upload their identity document.

Current upload status: %s

Instructions:
- If no document uploaded yet: ask to upload using the 📎 button. Accepted documents: carta d'identità (front + back), passaporto (data page), or patente di guida (front).
- Remind them the photo must be: well-lit, in focus, all corners visible, no glare.
- If verification failed: explain the specific reason and ask to re-upload.
- If verified: confirm briefly and stop.

ALWAYS respond in %s.`,
    },
    extraction: null,
  },

  STEP_05: {
    system: {
      label: 'Tono empatico per chi vive con la famiglia',
      description: 'Aggiunge un commento di comprensione quando l\'utente risponde "con la famiglia", evitando che sembri un giudizio.',
      code: `You are a warm, professional assistant building a tenant reliability profile.

COLLECTED DATA:
%s

DECISION TREE — follow strictly, ask the FIRST missing field and STOP:
→ "current_housing_type" missing → ask how they currently live (renting / own home / with family / other)
  If they answer "with family": acknowledge briefly that this is perfectly common, then continue.
→ "pays_rent" missing → ask whether they currently pay rent (yes / no)
→ "desired_move_date" missing → ask when they'd like to move in (e.g. "in 2 months", "January 2026")
→ ALL collected → output a brief confirmation and stop.

ALWAYS respond in %s.`,
    },
    extraction: null,
  },

  STEP_06: {
    system: {
      label: 'Suggerisci città con esempi contestuali',
      description: 'L\'LLM propone esempi di quartieri noti se l\'utente cita una città generica.',
      code: `You are a warm assistant helping a tenant find their ideal rental area.

COLLECTED DATA:
%s

Ask which city or area(s) they are looking to rent in. They can specify multiple cities or neighbourhoods.
If they mention a large city (Milano, Roma, Torino, Napoli), suggest 2–3 popular neighbourhoods as examples
so they can be more specific if they wish — but do not force them.

ALWAYS respond in %s.`,
    },
    extraction: {
      label: 'Estrai anche il quartiere separato dalla città',
      description: 'Struttura l\'array con city e area separati; se l\'utente dice solo "Milano Navigli" separa i due valori.',
      code: `Extract location preferences from the user's message.
Return ONLY a valid JSON object.

Field:
- "interest_areas": array of objects or null if no location mentioned.
  Each object: {"city": "Milano", "area": "Navigli"}
  - "city": canonical city name (capitalize first letter)
  - "area": neighbourhood/zone name, or "" if not specified
  If the user says only a city with no area: {"city": "Roma", "area": ""}
  Multiple locations → multiple objects in the array.

Return ONLY the JSON object, no markdown.`,
    },
  },

  STEP_07: {
    system: {
      label: 'Tono consulenziale (aiuta a definire il budget)',
      description: 'Se il budget sembra molto basso rispetto al mercato, aggiunge una nota educativa senza giudicare.',
      code: `You are a knowledgeable assistant helping a tenant define their property preferences.

COLLECTED DATA:
%s

DECISION TREE — ask the FIRST missing field and STOP:
→ "max_budget" missing → ask for their maximum monthly rent budget in EUR.
  If the amount seems very low for the requested city (under €400), add a brief, non-judgmental note
  that this may limit available options in most Italian cities — but accept it as stated.
→ "property_type" missing → ask what type of property: apartment, studio, room, villa, or other.
→ "furnished_preference" missing → ask: furnished, unfurnished, or no preference.
→ ALL collected → brief confirmation and stop.

ALWAYS respond in %s.`,
    },
    extraction: null,
  },

  STEP_08: {
    system: {
      label: 'Tono amichevole e leggero',
      description: 'Usa un registro più colloquiale per le domande sulla famiglia e gli animali.',
      code: `You are a friendly assistant helping to complete a tenant profile.

COLLECTED DATA:
%s

Ask for the currently indicated field in a warm, conversational tone.
- For occupants_count: clarify this includes the tenant themselves. Example: "Including yourself, how many people will live there?"
- For has_pets: keep it light. Make clear no pets is totally fine. Example: "Any furry (or not so furry) friends coming along?"

ALWAYS respond in %s.`,
    },
    extraction: {
      label: 'Accetta "animali" in tutte le forme',
      description: 'Extraction più robusta che riconosce risposte variate sugli animali.',
      code: `Extract household data from the user's message.
Return ONLY a valid JSON object. Use null for fields not mentioned.

Fields:
- "occupants_count": integer (total people including tenant). Accept written numbers ("two" → 2).
- "has_pets": true if user mentions any animal (dog, cat, rabbit, bird, fish, etc.),
              false if they say no pets / none / nothing,
              null if not mentioned.

Return ONLY the JSON object, no markdown.`,
    },
  },

  STEP_09: {
    system: {
      label: 'Valorizza il lavoro autonomo',
      description: 'Per i liberi professionisti aggiunge una nota positiva sul valore del lavoro autonomo per i proprietari.',
      code: `You are a warm, professional assistant building a tenant reliability profile.

COLLECTED DATA:
%s

DECISION TREE — ask the FIRST missing field and STOP:
→ "employment_type" missing → ask about their employment (employee, self-employed, student, retired, other)
→ EMPLOYEE and "contract_type" missing → ask contract type (permanent, fixed-term, project-based)
→ EMPLOYEE or SELF_EMPLOYED and "employment_start_date" missing → ask when they started
  For SELF_EMPLOYED: add a brief positive note that landlords appreciate long-tenured freelancers.
→ STUDENT/RETIRED/OTHER → brief acknowledgment and stop.
→ ALL collected → brief confirmation and stop.

Do NOT ask about income (handled in the next step). ALWAYS respond in %s.`,
    },
    extraction: null,
  },

  STEP_10: {
    system: {
      label: 'Contesto budget per la domanda sul reddito',
      description: 'Ricorda all\'utente il budget dichiarato per aiutarlo a capire il rapporto reddito/affitto.',
      code: `You are a warm assistant building a tenant reliability profile.

COLLECTED DATA:
%s

DECISION TREE — ask the FIRST missing field and STOP:
→ "income_variability" missing → ask whether their income is stable, variable, or they have no income.
→ "monthly_income" missing (and income_variability ≠ "none") →
  Ask for their net monthly income in EUR.
  If max_budget is known, gently add context: "Landlords generally look for a monthly income
  of at least 3× the rent — for a budget of €X this would be around €Y."
→ ALL collected → brief confirmation and stop.

ALWAYS respond in %s.`,
    },
    extraction: {
      label: 'Estrai reddito anche da espressioni "circa"',
      description: 'Riconosce range ("tra 1500 e 2000") e prende il valore medio, e "circa/around".',
      code: `Extract income data from the user's message.
Return ONLY a valid JSON object. Use null for fields not mentioned.

Fields:
- "monthly_income": number (net EUR/month) or null.
  - Set to 0 if user explicitly says they have no income.
  - For ranges ("between 1500 and 2000"): use the midpoint (1750).
  - For "circa/around/about X": use X as-is.
- "income_variability": one of "stable", "variable", "none" or null.
  "none" = student, unemployed, or explicitly says no income.
  If income_variability is "none", also set monthly_income to 0.

Return ONLY the JSON object, no markdown.`,
    },
  },

  STEP_11: {
    system: {
      label: 'Spiega il valore del garante per chi non ce l\'ha',
      description: 'Se l\'utente non ha un garante, suggerisce alternative (es. deposito cauzionale maggiore) senza bloccare il flusso.',
      code: `You are a warm, professional assistant building a tenant reliability profile.

COLLECTED DATA:
%s

DECISION TREE — ask the FIRST missing field and STOP:
→ "has_guarantor" missing → ask whether they have a guarantor.
  Briefly explain: a guarantor is someone (family member, friend) who legally guarantees rent payments.
→ has_guarantor = true: collect "guarantor_name" then "guarantor_income".
→ has_guarantor = false → acknowledge it briefly. You may mention that a stronger income profile
  or a higher security deposit can compensate — but do NOT block or judge. Stop.
→ ALL collected → brief confirmation and stop.

ALWAYS respond in %s.`,
    },
    extraction: null,
  },

  STEP_12: {
    system: {
      label: 'Incoraggia le referenze per chi ha già affittato',
      description: 'Quando l\'utente ha già affittato, sottolinea quanto le referenze migliorino il profilo.',
      code: `You are a warm, professional assistant building a tenant reliability profile.

COLLECTED DATA:
%s

DECISION TREE — ask the FIRST missing field and STOP:
→ "had_previous_rentals" missing → ask if they have rented before.
→ had_previous_rentals = true and "has_references" missing →
  Ask if they have a reference from a previous landlord. Emphasize strongly: tenants with references
  are significantly more attractive to landlords and often get priority over equally qualified candidates.
→ had_previous_rentals = false → acknowledge this is their first rental, reassure them it's common, stop.
→ ALL collected → brief confirmation and stop.

ALWAYS respond in %s.`,
    },
    extraction: null,
  },

  STEP_13: {
    system: {
      label: 'Istruzioni chiare per partite IVA',
      description: 'Per i lavoratori autonomi spiega quali documenti sono accettati e come prepararli.',
      code: `You are a warm assistant helping a tenant upload income documents.

Employment type: %s
Documents needed: %s
Verification issues: %s
Collected data: %s

If the tenant is SELF_EMPLOYED:
  - Explain they need their last 2 Modello Unico / 730 (tax returns), not payslips.
  - Note that PDF exports from the Agenzia delle Entrate portal are accepted.
If verification failed: explain the specific reason clearly and ask for a new upload.
If documents verified: confirm briefly and stop.
If waiting: ask for the upload using the 📎 button, without mentioning verification.

ALWAYS respond in %s.`,
    },
    extraction: null,
  },

  STEP_14: {
    system: {
      label: 'Spiega l\'impatto concreto di ogni documento opzionale',
      description: 'Quantifica (approssimativamente) come ogni documento migliora il punteggio di affidabilità.',
      code: `You are a warm assistant offering the tenant a chance to strengthen their profile.

COLLECTED DATA:
%s

Optional documents that improve the reliability score — mention each with its approximate benefit:
1. Landlord reference letter → significantly boosts the "rental history" score
2. Bank statement (last 3 months) → confirms regular income and savings habits
3. Employment contract → strengthens the income stability rating

Ask if they have any of these to upload, or if they prefer to skip.
If they want to upload: guide them to use the 📎 button.
If they skip or say they don't have any: acknowledge kindly and stop.

ALWAYS respond in %s.`,
    },
    extraction: {
      label: 'Riconosci più varianti di "ho finito"',
      description: 'Amplia le frasi che indicano che l\'utente vuole procedere oltre lo step documenti opzionali.',
      code: `Determine if the user has finished with optional documents.
Return ONLY a valid JSON object.

Set "optional_docs_step_done": true if the user:
- says they want to skip or move on (any language: "skip", "passo", "avanti", "next", "continua",
  "no grazie", "non ho nulla", "non ho documenti", "niente", "nothing", "none", "nope")
- confirms they are done uploading ("ho finito", "tutto caricato", "done", "finished", "that's all")
- says they don't have optional documents
Otherwise return {}`,
    },
  },

  STEP_15: {
    system: {
      label: 'Verifica coerenza con tono rassicurante',
      description: 'Presenta la verifica di coerenza come un servizio di supporto, non come un interrogatorio.',
      code: `You are a supportive analyst performing a final data review before the tenant profile is submitted.

ALL COLLECTED DATA:
%s

Your role is to HELP the tenant, not to interrogate. Frame any inconsistencies as "things we want
to double-check with you" rather than errors.

Check:
- monthly_income vs max_budget: budget should ideally be ≤ 33% of income. If higher, ask if they
  want to adjust either value — do NOT block them if they confirm they are happy with the figures.
- employment_type vs uploaded documents: flag if they don't match.
- fiscal_code format: 16 alphanumeric chars. Flag if incorrect.

If everything looks good: say so warmly and ask them to confirm.
If corrections are needed: present them gently and wait for their response.

ALWAYS respond in %s.`,
    },
    extraction: null,
  },

  STEP_16: {
    system: {
      label: 'Presentazione consensi stile legale chiaro',
      description: 'Usa un formato visivo (lista numerata) e linguaggio preciso per i consensi GDPR.',
      code: `You are a professional assistant collecting mandatory privacy consents.

CONSENT STATUS:
- privacy_consent: %s
- profile_sharing_consent: %s

%s

Present both consents in a clear numbered list:
1. Personal data processing (GDPR Art. 6) — required to create and manage the tenant profile
2. Profile sharing — required to make the profile visible to landlords on the platform

State clearly that BOTH are mandatory for profile activation.
If the user refuses either: explain politely that without both consents the profile cannot be activated,
and ask again. Do NOT accept partial consent.

ALWAYS respond in %s.`,
    },
    extraction: {
      label: 'Riconosci più varianti di accettazione',
      description: 'Aggiunge sinonimi internazionali e varianti informali per rilevare il consenso.',
      code: `Extract consent information from the user's message.
Return ONLY a valid JSON object.

Fields:
- "privacy_consent": true if user accepts (any affirmative: "sì", "ok", "accetto", "accetto entrambi",
  "confermo", "accept", "accept all", "i accept", "i agree", "yes", "sure", "va bene", "perfetto",
  "d'accordo", "certo"); null if unclear. Do NOT set false.
- "profile_sharing_consent": same rules as privacy_consent.
  If user accepts in general ("accetto tutto", "accept both", "i accept both", "sì a tutto"): set BOTH to true.

IMPORTANT: null = unclear/not given. Do NOT extract false values.
Return ONLY the JSON object, no markdown.`,
    },
  },

  STEP_17: {
    system: {
      label: 'Riepilogo visivamente strutturato',
      description: 'Il bot presenta il riepilogo con sezioni, emoji e valori evidenziati per una UX più chiara.',
      code: `You are a warm assistant presenting the final tenant profile summary before submission.

ALL COLLECTED DATA:
%s

Present the summary in a clear, well-formatted style using these sections:
👤 Personal Info — name, birth date, residence, fiscal code
🏠 Housing Preferences — areas, property type, budget, move-in date
💼 Employment & Income — type, contract, income, stability
📄 Documents — identity, payslips/tax returns, optional docs
✅ Consents — privacy + profile sharing

For each section: list key data points. Point out any OPTIONAL fields still missing that could
strengthen the profile (e.g. landlord reference, bank statement) — but do not require them.

End with: "Is everything correct? Shall I submit your profile?"

ALWAYS respond in %s.`,
    },
    extraction: null,
  },

  STEP_18: {
    system: {
      label: 'Messaggio di completamento con prossimi passi chiari',
      description: 'Aggiunge dettagli pratici sui tempi di revisione e cosa aspettarsi.',
      code: `You are a warm assistant who has just completed a tenant reliability profile.

Congratulate the tenant warmly on completing the process.

Explain what happens next in a clear, reassuring way:
1. Our team will review uploaded documents within 24–48 hours.
2. The reliability score will be calculated and added to the profile.
3. The profile is now visible to landlords searching for tenants in their area.
4. They will be notified by email if any document needs to be re-submitted.
5. They can view their profile and score at any time from the Profile section.

Keep it positive and concise. ALWAYS respond in %s.`,
    },
    extraction: null,
  },
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function pct(value: number) {
  return `${value.toFixed(1)}%`
}

function pctColor(value: number) {
  if (value >= 80) return 'text-emerald-600'
  if (value >= 50) return 'text-amber-600'
  return 'text-red-500'
}

function pctBar(value: number) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  )
}

// ─── Banner architettura prompt ───────────────────────────────────────────────

function ArchitectureBanner({ stepId }: { stepId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-xs shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-blue-100/50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
      >
        <span className="text-blue-600 dark:text-blue-400">ℹ️</span>
        <span className="font-semibold text-blue-700 dark:text-blue-300">Come funziona l'override — struttura del prompt</span>
        <span className={`ml-auto text-blue-500 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 text-[11px] text-blue-800 dark:text-blue-200">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium border-t border-blue-200 dark:border-blue-700 pt-2">
            Il prompt inviato al LLM è composto nell'ordine:
          </p>
          <div className="space-y-1 font-mono">
            <div className="flex gap-2 items-start">
              <span className="shrink-0 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px]">AUTO</span>
              <span><strong>scopeGuard</strong> — lingua assoluta, una domanda alla volta, no process-talk</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="shrink-0 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px]">AUTO</span>
              <span><strong>fieldInjection</strong> — "FIELD TO COLLECT NOW: [campo]" (calcolato in runtime da <code>nextMissingField()</code>)</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="shrink-0 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px]">AUTO</span>
              <span><strong>transitionContext</strong> — solo quando si avanza da uno step precedente</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-200 text-[10px]">OVERRIDE</span>
              <span><strong>System Prompt</strong> — ← quello che stai modificando qui ({stepId})</span>
            </div>
          </div>
          <div className="bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded p-2 mt-2">
            <p className="font-semibold text-red-700 dark:text-red-300">⚠️ Non includere nel tuo override:</p>
            <ul className="mt-0.5 space-y-0.5 text-red-600 dark:text-red-400">
              <li>• Riferimenti a <code>~[STEP_COMPLETE]</code> — il signal non esiste più, l'avanzamento è backend-driven</li>
              <li>• Regole di lingua (gestite da scopeGuard)</li>
              <li>• "Una domanda alla volta" (gestita da scopeGuard)</li>
            </ul>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded p-2">
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">✅ Cosa puoi customizzare:</p>
            <ul className="mt-0.5 space-y-0.5 text-emerald-700 dark:text-emerald-400">
              <li>• Tono e stile (formale, amichevole, consulenziale…)</li>
              <li>• Esempi specifici e suggerimenti contestuali</li>
              <li>• Istruzioni speciali per casi particolari (es. garante, reddito variabile)</li>
              <li>• Variabili: <code>%s</code> per collected_data e <code>%s</code> per lang (stessa sintassi del default)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab esempi ───────────────────────────────────────────────────────────────

function ExamplesTab({
  stepId,
  onApplySystem,
  onApplyExtraction,
}: {
  stepId: string
  onApplySystem: (code: string) => void
  onApplyExtraction: (code: string) => void
}) {
  const [copied, setCopied] = useState<string | null>(null)
  const example = STEP_EXAMPLES[stepId]

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1800)
    })
  }

  if (!example) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Nessun esempio disponibile per questo step.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Esempi pronti all'uso: clicca <strong>Applica</strong> per copiare l'esempio nell'editor
        (sovrascrive il contenuto corrente), oppure usa <strong>Copia</strong> per incollarlo manualmente.
      </p>

      {/* System prompt example */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-amber-50/80 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800 flex items-start gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 font-medium shrink-0 mt-0.5">
            SYSTEM
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{example.system.label}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{example.system.description}</p>
          </div>
        </div>
        <div className="relative">
          <pre className="text-[11px] font-mono px-4 py-3 overflow-x-auto whitespace-pre-wrap bg-muted/30 max-h-56 overflow-y-auto text-foreground/80 leading-relaxed">
            {example.system.code}
          </pre>
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              onClick={() => copy(example.system.code, 'sys-copy')}
              className="px-2 py-1 rounded text-[10px] bg-background border hover:bg-muted transition-colors"
            >
              {copied === 'sys-copy' ? '✓ Copiato' : 'Copia'}
            </button>
            <button
              onClick={() => onApplySystem(example.system.code)}
              className="px-2 py-1 rounded text-[10px] bg-amber-500 text-white hover:bg-amber-600 transition-colors font-medium"
            >
              Applica →
            </button>
          </div>
        </div>
      </div>

      {/* Extraction prompt example */}
      {example.extraction ? (
        <div className="border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-blue-50/80 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-800 flex items-start gap-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-300 font-medium shrink-0 mt-0.5">
              EXTRACTION
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">{example.extraction.label}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{example.extraction.description}</p>
            </div>
          </div>
          <div className="relative">
            <pre className="text-[11px] font-mono px-4 py-3 overflow-x-auto whitespace-pre-wrap bg-muted/30 max-h-56 overflow-y-auto text-foreground/80 leading-relaxed">
              {example.extraction.code}
            </pre>
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button
                onClick={() => copy(example.extraction!.code, 'ext-copy')}
                className="px-2 py-1 rounded text-[10px] bg-background border hover:bg-muted transition-colors"
              >
                {copied === 'ext-copy' ? '✓ Copiato' : 'Copia'}
              </button>
              <button
                onClick={() => onApplyExtraction(example.extraction!.code)}
                className="px-2 py-1 rounded text-[10px] bg-blue-500 text-white hover:bg-blue-600 transition-colors font-medium"
              >
                Applica →
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border rounded-xl px-4 py-4 text-xs text-muted-foreground bg-muted/20 text-center">
          Nessun esempio di extraction prompt per questo step — il default è sufficiente o l'estrazione è gestita dal sistema di upload.
        </div>
      )}

      <p className="text-[10px] text-muted-foreground border-t pt-3">
        Ricorda: <code className="bg-muted px-1 rounded">%s</code> è il placeholder per le variabili template (stessa sintassi di Java <code>String.format</code>).
        Il primo <code>%s</code> è sempre <strong>collected_data</strong>, il secondo <strong>lang</strong>.
        Verifica la firma di <code>buildSystemPrompt()</code> nel codice per l'ordine esatto di questo step.
      </p>
    </div>
  )
}

// ─── Modale editor prompt ─────────────────────────────────────────────────────

interface EditorModalProps {
  stepId: string
  initial: StepConfigDto | null
  onClose: () => void
  onSaved: (dto: StepConfigDto) => void
}

function EditorModal({ stepId, initial, onClose, onSaved }: EditorModalProps) {
  const [systemPrompt,     setSystemPrompt]     = useState(initial?.systemPromptOverride ?? '')
  const [extractionPrompt, setExtractionPrompt] = useState(initial?.extractionPromptOverride ?? '')
  const [adminNotes,       setAdminNotes]       = useState(initial?.adminNotes ?? '')
  const [saving, setSaving]   = useState(false)
  const [error,  setError]    = useState<string | null>(null)
  const [activeField, setActiveField] = useState<ModalTab>('system')

  const hasSystemOverride     = !!initial?.systemPromptOverride
  const hasExtractionOverride = !!initial?.extractionPromptOverride

  const defaultSystemPlaceholder     = initial?.defaultSystemPrompt    ?? 'Caricamento…'
  const defaultExtractionPlaceholder = initial?.defaultExtractionPrompt ?? 'Caricamento…'

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const saved = await adminApi.saveOnboardingConfig(stepId, {
        systemPromptOverride:     systemPrompt.trim() || null,
        extractionPromptOverride: extractionPrompt.trim() || null,
        adminNotes:               adminNotes.trim() || null,
      } as Partial<StepConfigDto>)
      onSaved(saved)
    } catch {
      setError('Errore durante il salvataggio. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Ripristinare i prompt di default per ${stepId}? Questa azione non è reversibile.`)) return
    setSaving(true)
    try {
      await adminApi.deleteOnboardingConfig(stepId)
      onSaved({ stepId, systemPromptOverride: null, extractionPromptOverride: null, adminNotes: null, updatedAt: null, updatedBy: null, defaultSystemPrompt: null, defaultExtractionPrompt: null })
    } catch {
      setError('Errore durante il ripristino.')
    } finally {
      setSaving(false)
    }
  }

  const tabs: { key: ModalTab; label: string; hasOverride?: boolean }[] = [
    { key: 'system',     label: 'System Prompt',     hasOverride: hasSystemOverride },
    { key: 'extraction', label: 'Extraction Prompt', hasOverride: hasExtractionOverride },
    { key: 'examples',   label: '💡 Esempi' },
    { key: 'notes',      label: 'Note admin' },
  ]

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center md:p-6">
        <div className="bg-card border rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col w-full md:max-w-3xl md:max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b shrink-0">
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Onboarding Step</p>
              <h2 className="text-base font-bold">{stepId}</h2>
            </div>
            <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
          </div>

          {/* Banner architettura */}
          <div className="px-4 pt-3 shrink-0">
            <ArchitectureBanner stepId={stepId} />
          </div>

          {/* Tab selector */}
          <div className="flex border-b shrink-0 px-2 pt-2">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveField(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${activeField === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                {tab.label}
                {tab.hasOverride && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Override attivo" />
                )}
              </button>
            ))}
          </div>

          {/* Editor area */}
          <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
            {activeField === 'system' && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Sostituisce <code className="bg-muted px-1 rounded">buildSystemPrompt()</code> per questo step.
                  Lascia vuoto per usare il default Java (mostrato come placeholder). Vedi tab <strong>Esempi</strong> per suggerimenti pronti.
                </p>
                <textarea
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  placeholder={defaultSystemPlaceholder}
                  className="w-full h-64 md:h-80 text-sm font-mono border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-ring bg-background resize-none placeholder:text-muted-foreground/50 placeholder:italic"
                />
              </div>
            )}

            {activeField === 'extraction' && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Sostituisce <code className="bg-muted px-1 rounded">buildExtractionPrompt()</code>.
                  Deve restituire <strong>SOLO un JSON object</strong>. Lascia vuoto per il default (placeholder).
                  Vedi tab <strong>Esempi</strong> per suggerimenti.
                </p>
                <textarea
                  value={extractionPrompt}
                  onChange={e => setExtractionPrompt(e.target.value)}
                  placeholder={defaultExtractionPlaceholder}
                  className="w-full h-64 md:h-80 text-sm font-mono border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-ring bg-background resize-none placeholder:text-muted-foreground/50 placeholder:italic"
                />
              </div>
            )}

            {activeField === 'examples' && (
              <ExamplesTab
                stepId={stepId}
                onApplySystem={code => { setSystemPrompt(code); setActiveField('system') }}
                onApplyExtraction={code => { setExtractionPrompt(code); setActiveField('extraction') }}
              />
            )}

            {activeField === 'notes' && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Note interne per il team admin. Non inviate al LLM.
                </p>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Note interne opzionali…"
                  className="w-full h-40 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-ring bg-background resize-none"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t flex items-center gap-3 shrink-0">
            {error && <p className="text-xs text-destructive flex-1">{error}</p>}
            <div className="flex items-center gap-2 ml-auto">
              {(initial?.systemPromptOverride || initial?.extractionPromptOverride) && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-3 py-2 rounded-lg border border-destructive/40 text-destructive text-sm hover:bg-destructive/5 transition-colors disabled:opacity-50"
                >
                  Ripristina default
                </button>
              )}
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-lg border text-sm hover:bg-muted/50 transition-colors"
              >
                Annulla
              </button>
              {activeField !== 'examples' && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Salvataggio…' : 'Salva'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Tab: Configurazione Prompt ───────────────────────────────────────────────

function PromptsTab() {
  const [configs,  setConfigs]  = useState<StepConfigDto[]>([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    adminApi.listOnboardingConfigs()
      .then(setConfigs)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const editingConfig = editing ? (configs.find(c => c.stepId === editing) ?? null) : null

  const handleSaved = (saved: StepConfigDto) => {
    setConfigs(prev => prev.map(c => c.stepId === saved.stepId ? saved : c))
    setEditing(null)
  }

  if (loading) return (
    <div className="text-sm text-muted-foreground text-center py-16">Caricamento…</div>
  )

  const overrideCount = configs.filter(c => c.systemPromptOverride || c.extractionPromptOverride).length

  return (
    <>
      <div className="mb-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          {overrideCount === 0
            ? 'Nessun override attivo — tutti gli step usano i prompt hardcoded nel codice Java.'
            : `${overrideCount} step con override attivo. Le modifiche sono attive entro ~30 secondi.`}
        </p>
        {/* Legenda architettura compatta */}
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border">
            🔒 AUTO: scopeGuard · fieldInjection · transitionContext
          </span>
          <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            ✏️ OVERRIDE: system prompt dello step
          </span>
          <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            🔍 OVERRIDE: extraction prompt
          </span>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="divide-y">
          {configs.map(cfg => {
            const hasSystem     = !!cfg.systemPromptOverride
            const hasExtraction = !!cfg.extractionPromptOverride
            const hasAny        = hasSystem || hasExtraction

            return (
              <div key={cfg.stepId}
                   className={`px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors ${hasAny ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>

                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground shrink-0 w-20 text-center">
                  {cfg.stepId}
                </span>

                <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                  {hasSystem && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 font-medium">
                      system override
                    </span>
                  )}
                  {hasExtraction && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-300 font-medium">
                      extraction override
                    </span>
                  )}
                  {!hasAny && (
                    <span className="text-[10px] text-muted-foreground">default (codice Java)</span>
                  )}
                </div>

                {cfg.updatedAt && (
                  <p className="text-[10px] text-muted-foreground shrink-0 hidden sm:block whitespace-nowrap">
                    {new Date(cfg.updatedAt).toLocaleString('it-IT', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                    {cfg.updatedBy && ` · ${cfg.updatedBy.split('@')[0]}`}
                  </p>
                )}

                <button
                  onClick={() => setEditing(cfg.stepId)}
                  className="shrink-0 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted/60 transition-colors"
                >
                  {hasAny ? 'Modifica' : 'Configura'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {editing && (
        <EditorModal
          stepId={editing}
          initial={editingConfig}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}

// ─── Tab: Analytics ───────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [data,     setData]     = useState<OnboardingAnalyticsResponse | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    adminApi.getOnboardingAnalytics()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="text-sm text-muted-foreground text-center py-16">Caricamento analytics…</div>
  )
  if (!data || data.totalUsers === 0) return (
    <div className="text-sm text-muted-foreground text-center py-16">
      Nessun dato disponibile — nessun utente ha ancora iniziato l'onboarding.
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card px-5 py-4 flex items-center gap-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Utenti totali</p>
          <p className="text-3xl font-bold">{data.totalUsers}</p>
        </div>
        <p className="text-xs text-muted-foreground ml-auto">
          Utenti che hanno avviato almeno uno step di onboarding
        </p>
      </div>

      {data.steps.map((step: StepAnalyticsDto) => {
        const isOpen = expanded === step.stepId
        const hasLowCompletion = step.completionRatePct < 50 && data.totalUsers > 0

        return (
          <div key={step.stepId}
               className={`rounded-xl border bg-card overflow-hidden transition-all ${hasLowCompletion ? 'border-amber-300' : ''}`}>

            <button
              onClick={() => setExpanded(isOpen ? null : step.stepId)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
            >
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground shrink-0 w-20 text-center">
                {step.stepId}
              </span>

              <div className="flex-1 min-w-0 space-y-0.5">
                {pctBar(step.completionRatePct)}
              </div>

              <div className="flex items-center gap-4 shrink-0 text-right">
                <div>
                  <p className="text-[10px] text-muted-foreground">Completato</p>
                  <p className={`text-sm font-bold ${pctColor(step.completionRatePct)}`}>
                    {pct(step.completionRatePct)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Bloccati qui</p>
                  <p className={`text-sm font-bold ${step.stuckRatePct > 20 ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {step.currentlyAtCount} ({pct(step.stuckRatePct)})
                  </p>
                </div>
              </div>

              <span className={`text-muted-foreground transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>

            {isOpen && step.fields.length > 0 && (
              <div className="border-t bg-muted/20">
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    Popolamento campi
                  </p>
                  <div className="space-y-2">
                    {step.fields.map(field => (
                      <div key={field.key} className="flex items-center gap-3">
                        <div className="w-36 shrink-0">
                          <p className="text-xs font-medium truncate">{field.labelIt}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{field.key}</p>
                        </div>
                        <div className="flex-1">{pctBar(field.populationRatePct)}</div>
                        <div className="w-20 text-right shrink-0">
                          <span className={`text-xs font-semibold ${pctColor(field.populationRatePct)}`}>
                            {pct(field.populationRatePct)}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({field.populatedCount}/{data.totalUsers})
                          </span>
                        </div>
                        {field.required && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                            req
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Pagina principale ────────────────────────────────────────────────────────

export default function OnboardingConfigPage() {
  const [tab, setTab] = useState<Tab>('prompts')

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'prompts',   label: 'Configurazione Prompt', icon: '✏️' },
    { key: 'analytics', label: 'Analytics',              icon: '📊' },
  ]

  return (
    <div className="w-full px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold">Onboarding Chatbot</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Modifica i prompt LLM in realtime e monitora i tassi di completamento degli step.
        </p>
      </div>

      <div className="flex border-b mb-5">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'prompts'   && <PromptsTab />}
      {tab === 'analytics' && <AnalyticsTab />}
    </div>
  )
}
