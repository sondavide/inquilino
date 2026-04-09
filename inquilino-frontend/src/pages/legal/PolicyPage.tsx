import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useLang } from '@/i18n'

interface Props {
  file: string   // path under /docs/, e.g. 'privacy-policy.md'
  title: string  // page title shown in header
}

export default function PolicyPage({ file, title }: Props) {
  const { t } = useLang()
  const navigate = useNavigate()
  const [content, setContent] = useState<string | null>(null)
  const [error, setError]     = useState(false)

  useEffect(() => {
    setContent(null)
    setError(false)
    fetch(`/docs/${file}`)
      .then(r => { if (!r.ok) throw new Error(); return r.text() })
      .then(setContent)
      .catch(() => setError(true))
  }, [file])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors shrink-0 px-2 py-1.5 rounded-lg hover:bg-slate-100"
          aria-label="Torna indietro"
        >
          <span className="text-base leading-none">←</span>
          <span className="hidden sm:inline">{t('legal.back')}</span>
        </button>
        <h1 className="font-bold text-slate-900 text-base truncate">{title}</h1>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        {!content && !error && (
          <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
            {t('legal.loading')}
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
            {t('legal.error')}
          </div>
        )}

        {content && (
          <div className="prose prose-slate prose-sm sm:prose max-w-none
            prose-headings:font-extrabold prose-headings:text-slate-900
            prose-h1:text-2xl prose-h1:mb-6 prose-h1:pb-3 prose-h1:border-b prose-h1:border-slate-200
            prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2
            prose-p:text-slate-600 prose-p:leading-relaxed
            prose-li:text-slate-600 prose-li:leading-relaxed
            prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-slate-800
            prose-table:text-sm prose-th:bg-slate-50 prose-th:font-semibold
            prose-blockquote:border-l-blue-400 prose-blockquote:text-slate-500
            prose-code:bg-slate-100 prose-code:text-slate-700 prose-code:px-1 prose-code:rounded
          ">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}

        {/* Bottom back button for long pages */}
        {content && (
          <div className="mt-12 pt-6 border-t border-slate-100">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              <span className="text-base leading-none">←</span>
              {t('legal.back')}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
