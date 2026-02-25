'use client'
import { useState } from 'react'
import { Search, Film, Tv, CheckCircle, XCircle, Send, ArrowLeft, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

type ContentType = 'MOVIE' | 'TV'
type LocalItem = {
  id: string
  title: string
  year: number | null
  hasP1: boolean
  hasP2: boolean
  server: string
  posterUrl: string | null
  tmdbId: number
  type: string
}
type TmdbItem = {
  tmdbId: number
  title: string
  year: string
  poster: string | null
  overview: string
}

function CorrectionForm({
  title,
  tmdbId,
  posterUrl,
  type,
  onClose,
  onSent,
}: {
  title: string
  tmdbId: number
  posterUrl: string | null
  type: ContentType
  onClose: () => void
  onSent: () => void
}) {
  const [server, setServer] = useState('B2P')
  const [notes, setNotes] = useState('')
  const [seasonNumber, setSeasonNumber] = useState('')
  const [episodeNotes, setEpisodeNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!notes.trim()) return
    setLoading(true)
    const res = await fetch('/api/correcoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, tmdbId, posterUrl, type, server, notes, seasonNumber: seasonNumber || null, episodeNotes: episodeNotes || null }),
    })
    setLoading(false)
    if (res.ok) onSent()
  }

  return (
    <div className='mt-3 rounded-xl p-4 space-y-3' style={{ backgroundColor: '#1a1010', border: '1px solid #3a1a1a' }}>
      <p className='text-sm font-semibold text-red-400 flex items-center gap-1.5'>
        <AlertTriangle className='w-3.5 h-3.5' /> Reportar problema em "{title}"
      </p>

      <div>
        <p className='text-xs text-gray-400 mb-1.5'>Servidor com problema</p>
        <div className='flex gap-2'>
          {['B2P', 'P2B', 'Ambos'].map(s => (
            <button
              key={s}
              onClick={() => setServer(s)}
              className='px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all'
              style={{ backgroundColor: server === s ? '#ef4444' : '#2a2a2a' }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {type === 'TV' && (
        <div className='flex gap-2'>
          <div className='flex-1'>
            <p className='text-xs text-gray-400 mb-1'>Temporada</p>
            <input
              type='number'
              min={1}
              value={seasonNumber}
              onChange={e => setSeasonNumber(e.target.value)}
              placeholder='Ex: 2'
              className='w-full rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none'
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
            />
          </div>
          <div className='flex-1'>
            <p className='text-xs text-gray-400 mb-1'>Episódios</p>
            <input
              type='text'
              value={episodeNotes}
              onChange={e => setEpisodeNotes(e.target.value)}
              placeholder='Ex: 3, 5, 7-10'
              className='w-full rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none'
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
            />
          </div>
        </div>
      )}

      <div>
        <p className='text-xs text-gray-400 mb-1'>Descreva o problema <span className='text-red-500'>*</span></p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder='Ex: Filme está offline, vídeo trava no minuto 45, áudio dessincronizado...'
          rows={2}
          className='w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none'
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
        />
      </div>

      <div className='flex gap-2'>
        <button onClick={onClose} className='flex-1 py-2 rounded-lg text-sm text-gray-400 transition' style={{ border: '1px solid #2a2a2a' }}>
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !notes.trim()}
          className='flex-1 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-50'
          style={{ backgroundColor: '#ef4444' }}
        >
          {loading ? 'Enviando...' : 'Enviar Relatório'}
        </button>
      </div>
    </div>
  )
}

export default function VitrinePage() {
  const [type, setType] = useState<ContentType>('MOVIE')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{ local: LocalItem[]; tmdb: TmdbItem[] } | null>(null)
  const [requested, setRequested] = useState<number[]>([])
  const [reported, setReported] = useState<number[]>([])
  const [correcting, setCorrecting] = useState<number | null>(null)
  const [success, setSuccess] = useState('')

  const search = async () => {
    if (query.length < 2) return
    setLoading(true)
    setResults(null)
    setSuccess('')
    setCorrecting(null)
    const res = await fetch('/api/vitrine?q=' + encodeURIComponent(query) + '&type=' + type)
    setResults(await res.json())
    setLoading(false)
  }

  const sendRequest = async (title: string, poster: string | null, tmdbId: number) => {
    const res = await fetch('/api/recepcao-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, type, posterUrl: poster }),
    })
    if (res.ok) {
      setRequested(prev => [...prev, tmdbId])
      setSuccess('Solicitação enviada com sucesso!')
    }
  }

  return (
    <div className='min-h-screen px-4 py-8' style={{ backgroundColor: '#080808' }}>
      <div className='max-w-2xl mx-auto'>
        <div className='flex justify-center mb-6'>
          <img src='/Logo-transparente.png' alt='Encoding Solutions' style={{ width: '300px', maxWidth: '90vw' }} />
        </div>

        <div className='rounded-2xl p-6 mb-4' style={{ backgroundColor: '#151515' }}>
          <h1 className='text-xl font-bold mb-1'>Vitrine</h1>
          <p className='text-sm text-gray-400 mb-4'>Pesquise se o título está disponível em nosso catálogo</p>

          <div className='flex gap-2 mb-4'>
            <button
              onClick={() => { setType('MOVIE'); setResults(null) }}
              className='flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all'
              style={{ backgroundColor: type === 'MOVIE' ? '#f97316' : '#1a1a1a' }}
            >
              <Film className='w-4 h-4' /> Filmes
            </button>
            <button
              onClick={() => { setType('TV'); setResults(null) }}
              className='flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all'
              style={{ backgroundColor: type === 'TV' ? '#f97316' : '#1a1a1a' }}
            >
              <Tv className='w-4 h-4' /> Séries
            </button>
          </div>

          <div className='flex gap-2'>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder={type === 'MOVIE' ? 'Buscar filme...' : 'Buscar série...'}
              className='flex-1 rounded-lg px-3 py-2.5 text-sm focus:outline-none text-white'
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
            />
            <button
              onClick={search}
              disabled={loading}
              className='px-4 py-2 rounded-lg font-medium text-white'
              style={{ backgroundColor: '#f97316' }}
            >
              <Search className='w-4 h-4' />
            </button>
          </div>
        </div>

        {success && (
          <div className='mb-4 p-3 rounded-lg text-center text-sm' style={{ backgroundColor: '#1a3a1a', color: '#4ade80' }}>
            {success}
          </div>
        )}
        {loading && <div className='text-center text-gray-400 py-8'>Buscando...</div>}

        {results && (
          <div className='space-y-3'>
            {/* Títulos no catálogo */}
            {results.local.length > 0 && (
              <div>
                <p className='text-xs text-gray-500 uppercase tracking-wider mb-2 px-1'>Disponível no catálogo</p>
                {results.local.map(item => (
                  <div key={item.id}>
                    <div className='flex items-center gap-3 p-3 rounded-xl mb-1' style={{ backgroundColor: '#151515' }}>
                      {item.posterUrl
                        ? <img src={item.posterUrl} className='w-12 rounded object-cover flex-shrink-0' style={{ height: '68px', minWidth: '46px' }} />
                        : <div className='w-12 rounded flex items-center justify-center flex-shrink-0' style={{ height: '68px', minWidth: '46px', backgroundColor: '#2a2a2a' }}><Film className='w-4 h-4 text-gray-600' /></div>
                      }
                      <div className='flex-1 min-w-0'>
                        <p className='font-semibold text-sm text-white'>{item.title}</p>
                        <p className='text-xs text-gray-400'>{item.year}</p>
                        <div className='flex items-center gap-1 mt-1'>
                          <CheckCircle className='w-3.5 h-3.5 text-green-400 flex-shrink-0' />
                          <span className='text-xs text-green-400'>Disponível no {item.server}</span>
                        </div>
                      </div>
                      {reported.includes(item.tmdbId) ? (
                        <span className='text-xs text-red-400 flex items-center gap-1 flex-shrink-0'>
                          <CheckCircle className='w-3 h-3' /> Enviado
                        </span>
                      ) : (
                        <button
                          onClick={() => setCorrecting(correcting === item.tmdbId ? null : item.tmdbId)}
                          className='flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 flex-shrink-0 transition'
                          style={{ backgroundColor: '#2a1010', border: '1px solid #3a1a1a' }}
                        >
                          <AlertTriangle className='w-3 h-3' />
                          Problema
                          {correcting === item.tmdbId ? <ChevronUp className='w-3 h-3' /> : <ChevronDown className='w-3 h-3' />}
                        </button>
                      )}
                    </div>
                    {correcting === item.tmdbId && (
                      <CorrectionForm
                        title={item.title}
                        tmdbId={item.tmdbId}
                        posterUrl={item.posterUrl}
                        type={type}
                        onClose={() => setCorrecting(null)}
                        onSent={() => {
                          setReported(prev => [...prev, item.tmdbId])
                          setCorrecting(null)
                          setSuccess('Problema reportado! Nossa equipe irá verificar.')
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Resultados TMDB (não no catálogo) */}
            {results.tmdb.length > 0 && (
              <div>
                <p className='text-xs text-gray-500 uppercase tracking-wider mb-2 px-1'>Resultados TMDB</p>
                {results.tmdb.map(item => {
                  const inLocal = results.local.some(l => l.tmdbId === item.tmdbId || l.title.toLowerCase() === item.title.toLowerCase())
                  const done = requested.includes(item.tmdbId)
                  return (
                    <div key={item.tmdbId} className='flex items-center gap-3 p-3 rounded-xl mb-2' style={{ backgroundColor: '#151515' }}>
                      {item.poster
                        ? <img src={item.poster} className='w-12 rounded object-cover flex-shrink-0' style={{ height: '68px', minWidth: '46px' }} />
                        : <div className='w-12 rounded flex items-center justify-center flex-shrink-0' style={{ height: '68px', minWidth: '46px', backgroundColor: '#2a2a2a' }}><Film className='w-4 h-4 text-gray-600' /></div>
                      }
                      <div className='flex-1 min-w-0'>
                        <p className='font-semibold text-sm text-white'>{item.title}</p>
                        <p className='text-xs text-gray-400'>{item.year}</p>
                        {inLocal
                          ? <div className='flex items-center gap-1 mt-1'><CheckCircle className='w-3.5 h-3.5 text-green-400' /><span className='text-xs text-green-400'>Disponível</span></div>
                          : done
                            ? <div className='flex items-center gap-1 mt-1'><CheckCircle className='w-3.5 h-3.5 text-blue-400' /><span className='text-xs text-blue-400'>Solicitado</span></div>
                            : <div className='flex items-center gap-1 mt-1'><XCircle className='w-3.5 h-3.5 text-red-400' /><span className='text-xs text-red-400'>Não disponível</span></div>
                        }
                      </div>
                      {!inLocal && !done && (
                        <button
                          onClick={() => sendRequest(item.title, item.poster, item.tmdbId)}
                          className='flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white flex-shrink-0'
                          style={{ backgroundColor: '#f97316' }}
                        >
                          <Send className='w-3 h-3' /> Solicitar
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {results.local.length === 0 && results.tmdb.length === 0 && (
              <div className='text-center text-gray-400 py-8 rounded-xl' style={{ backgroundColor: '#151515' }}>
                <XCircle className='w-8 h-8 mx-auto mb-2 text-gray-600' />
                <p>Nenhum resultado encontrado</p>
              </div>
            )}
          </div>
        )}

        <div className='text-center mt-6'>
          <Link href='/login' className='text-sm text-gray-500 hover:text-gray-300 flex items-center justify-center gap-1'>
            <ArrowLeft className='w-3 h-3' /> Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  )
}
