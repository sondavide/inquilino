import { useEffect, useRef, useState } from 'react'
import { supervisorApi } from '@/api/supervisor'
import type { SupervisorNoteDto } from '@/types'

// ─── Checklist items disponibili ─────────────────────────────────────────────

const CHECKLIST_ITEMS: { value: string; label: string; category: string }[] = [
  // Documenti tenant
  { value: 'PAYSLIP',              label: 'Buste paga (ultimi 3 mesi)',       category: 'Documenti' },
  { value: 'TAX_RETURN',           label: '730 / CU',                          category: 'Documenti' },
  { value: 'EMPLOYMENT_CONTRACT',  label: 'Contratto di lavoro',               category: 'Documenti' },
  { value: 'BANK_STATEMENT',       label: 'Estratto conto',                    category: 'Documenti' },
  { value: 'IDENTITY',             label: 'Documento d\'identità',             category: 'Documenti' },
  { value: 'LANDLORD_REFERENCE',   label: 'Referenza locatore',                category: 'Documenti' },
  // Garante
  { value: 'GUARANTOR_DATA',       label: 'Dati garante',                      category: 'Garante' },
  { value: 'GUARANTOR_PAYSLIP',    label: 'Buste paga garante',                category: 'Garante' },
  { value: 'GUARANTOR_TAX_RETURN', label: '730 / CU garante',                  category: 'Garante' },
  { value: 'GUARANTOR_EMPLOYMENT_CONTRACT', label: 'Contratto garante',        category: 'Garante' },
  // Dati
  { value: 'INCOME_CORRECTION',    label: 'Correzione reddito',                category: 'Dati' },
  { value: 'CONTRACT_TYPE',        label: 'Tipo contratto',                    category: 'Dati' },
  { value: 'EMPLOYMENT_DATES',     label: 'Date contratto',                    category: 'Dati' },
]

const CATEGORY_ORDER = ['Documenti', 'Garante', 'Dati']

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    PENDING:  { label: 'In attesa',  cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    REPLIED:  { label: 'Risposto',   cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    RESOLVED: { label: 'Chiuso',     cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  }[status] ?? { label: status, cls: 'bg-muted text-muted-foreground' }

  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ─── Nota card ────────────────────────────────────────────────────────────────

function NoteCard({
  note, profileId, onResolved, onDeleted,
}: {
  note: SupervisorNoteDto
  profileId: string
  onResolved: (n: SupervisorNoteDto) => void
  onDeleted: (id: string) => void
}) {
  const [resolving,  setResolving]  = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  async function handleResolve() {
    setResolving(true)
    try {
      const updated = await supervisorApi.resolveNote(profileId, note.id)
      onResolved(updated)
    } finally { setResolving(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await supervisorApi.deleteNote(profileId, note.id)
      onDeleted(note.id)
    } finally { setDeleting(false); setConfirmDel(false) }
  }

  const checklist = (note.requestedItems ?? [])
    .map(v => CHECKLIST_ITEMS.find(c => c.value === v)?.label ?? v)

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={note.status} />
          <span className="text-xs text-muted-foreground">
            {new Date(note.sentAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          {note.tenantRepliedAt && (
            <span className="text-xs text-blue-600">
              · Risposto il {new Date(note.tenantRepliedAt).toLocaleDateString('it-IT')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {note.status !== 'RESOLVED' && !confirmDel && (
            <button onClick={handleResolve} disabled={resolving}
              className="text-xs px-2 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50">
              {resolving ? '…' : 'Chiudi'}
            </button>
          )}
          {!confirmDel ? (
            <button
              onClick={() => setConfirmDel(true)}
              className="text-xs px-2 py-1 border border-destructive/30 text-destructive rounded-md hover:bg-destructive/10"
            >
              Elimina
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-2 py-1">
              <span className="text-xs text-destructive font-medium">Eliminare?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs font-semibold text-destructive hover:underline disabled:opacity-50"
              >
                {deleting ? '…' : 'Sì'}
              </button>
              <span className="text-destructive/40 text-xs">·</span>
              <button
                onClick={() => setConfirmDel(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {note.message && (
        <p className="text-sm text-foreground whitespace-pre-wrap">{note.message}</p>
      )}

      {checklist.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground uppercase font-semibold">Richiesti</p>
          <div className="flex flex-wrap gap-1">
            {checklist.map((l, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
                {l}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Notes list (used in the Notes tab) ──────────────────────────────────────

export function SupervisorNotesSection({ profileId, notes, onResolved, onDeleted, loading }: {
  profileId: string
  notes: SupervisorNoteDto[]
  onResolved: (n: SupervisorNoteDto) => void
  onDeleted: (id: string) => void
  loading: boolean
}) {
  const pendingCount = notes.filter(n => n.status === 'PENDING').length

  if (loading) return <div className="text-sm text-muted-foreground">Caricamento note…</div>

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm flex items-center gap-2">
          Note al tenant
          {pendingCount > 0 && (
            <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-bold">
              {pendingCount} in attesa
            </span>
          )}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tutte le richieste inviate al tenant. Usa il pulsante <strong>＋ Nota</strong> in basso per aggiungerne una nuova da qualsiasi sezione.
        </p>
      </div>

      {notes.length === 0 && (
        <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
          Nessuna nota inviata al tenant.
        </div>
      )}
      {notes.map(n => (
        <NoteCard
          key={n.id}
          note={n}
          profileId={profileId}
          onResolved={onResolved}
          onDeleted={onDeleted}
        />
      ))}
    </div>
  )
}

// ─── Quick note FAB + bottom sheet ───────────────────────────────────────────

export function NotesFab({ profileId, onSent }: {
  profileId: string
  onSent: (note: SupervisorNoteDto) => void
}) {
  const [open,     setOpen]     = useState(false)
  const [message,  setMessage]  = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending,  setSending]  = useState(false)
  const [sent,     setSent]     = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea when sheet opens
  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 80)
  }, [open])

  function toggle(v: string) {
    setSelected(s => {
      const n = new Set(s)
      n.has(v) ? n.delete(v) : n.add(v)
      return n
    })
  }

  function handleClose() {
    setOpen(false)
    setMessage('')
    setSelected(new Set())
    setSent(false)
  }

  async function handleSend() {
    if (!message.trim() && selected.size === 0) return
    setSending(true)
    try {
      const note = await supervisorApi.sendNote(profileId, message.trim(), Array.from(selected))
      onSent(note)
      setSent(true)
      setTimeout(handleClose, 900)
    } finally { setSending(false) }
  }

  const canSend = message.trim().length > 0 || selected.size > 0

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
      >
        <span className="text-base leading-none">✏️</span>
        Nota
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={handleClose}
        />
      )}

      {/* Bottom sheet */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-2xl border-t transition-transform duration-300 ${
        open ? 'translate-y-0' : 'translate-y-full'
      }`}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-4 pb-6 space-y-3 max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Nuova nota al tenant</p>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
          </div>

          {/* Instructions */}
          <div className="rounded-lg bg-muted/50 border px-3 py-2.5 text-xs text-muted-foreground space-y-1 leading-relaxed">
            <p><strong className="text-foreground">Come funziona:</strong> seleziona uno o più documenti/dati mancanti toccando i chip colorati, oppure scrivi un messaggio libero. Puoi fare entrambe le cose.</p>
            <p>Il tenant riceverà una notifica nella propria dashboard e potrà caricare i documenti richiesti. Tornerai su questa nota nel tab <strong className="text-foreground">⑤ Note</strong> per segnare la richiesta come chiusa.</p>
          </div>

          {/* Chip categories */}
          <div className="space-y-2">
            {CATEGORY_ORDER.map(cat => {
              const items = CHECKLIST_ITEMS.filter(c => c.category === cat)
              return (
                <div key={cat}>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">{cat}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map(item => (
                      <button
                        key={item.value}
                        onClick={() => toggle(item.value)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-medium ${
                          selected.has(item.value)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/40 text-muted-foreground border-border hover:border-foreground hover:text-foreground'
                        }`}
                      >
                        {selected.has(item.value) ? '✓ ' : ''}{item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Message */}
          <div>
            <label className="text-[11px] text-muted-foreground uppercase font-semibold block mb-1">
              Messaggio personalizzato <span className="normal-case">(opzionale)</span>
            </label>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="Gentile inquilino, per completare la verifica…"
              className="w-full px-3 py-2 text-sm border rounded-xl bg-background outline-none resize-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!canSend || sending}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
              sent
                ? 'bg-emerald-500 text-white'
                : 'bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90'
            }`}
          >
            {sent ? '✓ Nota inviata' : sending ? 'Invio…' : `Invia nota${selected.size > 0 ? ` (${selected.size} richieste)` : ''}  →`}
          </button>
        </div>
      </div>
    </>
  )
}
