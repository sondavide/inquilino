import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, MapPin, Users, Home, Loader2, ChevronRight } from 'lucide-react'
import { checkMunicipalityAvailability } from '@/api/landing'
import { useLang } from '@/i18n'
import { Link } from 'react-router-dom'

type SearchMode = 'tenant' | 'landlord'

interface NominatimResult {
  display_name: string
  address?: { city?: string; town?: string; village?: string; municipality?: string; county?: string }
}

function extractCity(r: NominatimResult): string {
  const a = r.address
  return a?.city || a?.town || a?.village || a?.municipality || r.display_name.split(',')[0]
}

export default function MunicipalitySearch() {
  const { t } = useLang()
  const [mode, setMode]         = useState<SearchMode>('tenant')
  const [query, setQuery]       = useState('')
  const [suggestions, setSugg]  = useState<NominatimResult[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<{ city: string; tenantProfiles: number; listings: number } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const inputRef    = useRef<HTMLInputElement>(null)

  // Nominatim autocomplete
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSugg([]); return }
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=it&format=json&addressdetails=1&limit=5&featuretype=settlement`
      const res = await fetch(url, { headers: { 'Accept-Language': 'it' } })
      const data: NominatimResult[] = await res.json()
      setSugg(data.slice(0, 5))
    } catch { setSugg([]) }
  }, [])

  const onInput = (v: string) => {
    setQuery(v)
    setSelected(null)
    setResult(null)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 320)
  }

  const onSelect = (r: NominatimResult) => {
    const city = extractCity(r)
    setSelected(city)
    setQuery(city)
    setSugg([])
  }

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const handleSearch = async () => {
    const city = selected || query.trim()
    if (!city) return
    setLoading(true)
    setResult(null)
    setSugg([])
    try {
      const res = await checkMunicipalityAvailability(city)
      setResult(res)
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <section
      id="search"
      className="py-20 bg-gradient-to-br from-blue-600 via-blue-700 to-violet-700"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-blue-100 text-xs font-semibold mb-4">
            <MapPin className="w-3.5 h-3.5" />
            {t('landing.search.badge')}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            {t('landing.search.title')}
          </h2>
          <p className="mt-3 text-blue-100 text-lg">{t('landing.search.subtitle')}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl text-left">

          {/* Mode tabs */}
          <div className="flex bg-slate-100 rounded-2xl p-1 mb-6">
            {([['tenant', 'landing.search.tab_tenant', Users], ['landlord', 'landing.search.tab_landlord', Home]] as const).map(([m, labelKey, Icon]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setResult(null) }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${mode === m ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Icon className="w-4 h-4" />
                {t(labelKey as any)}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => onInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={t('landing.search.placeholder')}
                  className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-40 transition-all whitespace-nowrap flex items-center gap-2"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <ChevronRight className="w-4 h-4" />
                }
                <span className="hidden sm:inline">{t('landing.search.button')}</span>
              </button>
            </div>

            {/* Autocomplete dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-16 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => onSelect(s)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-sm text-slate-700 border-b border-slate-100 last:border-0"
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{s.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results */}
          {result && (
            <div className="mt-6 animate-fade-up">
              <div className={`rounded-2xl p-5 ${mode === 'tenant'
                ? 'bg-blue-50 border border-blue-100'
                : 'bg-emerald-50 border border-emerald-100'}`}
              >
                <div className={`flex items-center gap-3 ${mode === 'tenant' ? 'text-blue-700' : 'text-emerald-700'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode === 'tenant' ? 'bg-blue-100' : 'bg-emerald-100'}`}>
                    {mode === 'tenant' ? <Users className="w-5 h-5" /> : <Home className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-bold text-base">
                      {mode === 'tenant'
                        ? t('landing.search.results_tenant' as any, { city: result.city })
                        : t('landing.search.results_landlord' as any, { city: result.city })
                      }
                    </p>
                  </div>
                </div>

                <Link
                  to={mode === 'tenant' ? '/login?register=true' : '/register/landlord'}
                  className={`mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm transition-colors
                    ${mode === 'tenant'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                >
                  {t('landing.search.cta')}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
