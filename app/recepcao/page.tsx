'use client'
import { useState } from 'react'
import { Search, Film, Tv, CheckCircle, XCircle, Send, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function RecepcaoPage() {
  const [type, setType] = useState<'MOVIE' | 'TV'>('MOVIE')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [requested, setRequested] = useState<number[]>([])
  const [success, setSuccess] = useState('')

  const search = async () => {
    if (query.length < 2) return
    setLoading(true)
    setResults(null)
    setSuccess('')
    const res = await fetch('/api/recepcao?q=' + encodeURIComponent(query) + '&type=' + type)
    const data = await res.json()
    setResults(data)
    setLoading(false)
  }

  const sendRequest = async (title: string, posterUrl: string | null, tmdbId: number) => {
    const res = await fetch('/api/recepcao-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, type, posterUrl })
    })
    if (res.ok) {
      setRequested(prev => [...prev, tmdbId])
      setSuccess('Solicitacao enviada com sucesso!')
    }
  }

  return (
    <div className='min-h-screen px-4 py-8' style={{ backgroundColor: '#080808' }}>
      <div className='max-w-2xl mx-auto'>
        <div className='flex justify-center mb-6'>
          <img src='/Logo-transparente.png' alt='Encoding Solutions' style={{ width: '300px', maxWidth: '90vw' }} />
        </div>
        <div className='rounded-2xl p-6 mb-4' style={{ backgroundColor: '#151515' }}>
          <h1 className='text-xl font-bold mb-1'>Recepção</h1>
          <p className='text-sm text-gray-400 mb-4'>Pesquise se o titulo esta disponivel em nosso catalogo</p>
          <div className='flex gap-2 mb-4'>
            <button onClick={() => { setType('MOVIE'); setResults(null) }} className='flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all' style={{ backgroundColor: type === 'MOVIE' ? '#f97316' : '#1a1a1a', color: 'white' }}>
              <Film className='w-4 h-4' /> Filmes
            </button>
            <button onClick={() => { setType('TV'); setResults(null) }} className='flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all' style={{ backgroundColor: type === 'TV' ? '#f97316' : '#1a1a1a', color: 'white' }}>
              <Tv className='w-4 h-4' /> Series
            </button>
          </div>
          <div className='flex gap-2'>
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder={type === 'MOVIE' ? 'Buscar filme...' : 'Buscar serie...'} className='flex-1 rounded-lg px-3 py-2.5 text-sm focus:outline-none text-white' style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }} />
            <button onClick={search} disabled={loading} className='px-4 py-2 rounded-lg font-medium text-white transition-all' style={{ backgroundColor: '#f97316' }}>
              <Search className='w-4 h-4' />
            </button>
          </div>
        </div>

        {success && <div className='mb-4 p-3 rounded-lg bg-green-500/20 text-green-400 text-sm text-center'>{success}</div>}

        {loading && <div className='text-center text-gray-400 py-8'>Buscando...</div>}

        {results && (
          <div className='space-y-3'>
            {results.local.length > 0 && (
              <div>
                <p className='text-xs text-gray-500 uppercase tracking-wider mb-2 px-1'>Disponivel no catalogo</p>
                {results.local.map((item: any) => (
                  <div key={item.id} className='flex items-center gap-3 p-3 rounded-xl mb-2' style={{ backgroundColor: '#151515' }}>
                    {item.posterUrl ? <img src={item.posterUrl} className='w-12 h-18 rounded object-cover' style={{ height: '68px', minWidth: '46px' }} /> : <div className='w-12 rounded bg-gray-800 flex items-center justify-center' style={{ height: '68px', minWidth: '46px' }}><Film className='w-4 h-4 text-gray-600' /></div>}
                    <div className='flex-1'>
                      <p className='font-semibold text-sm'>{item.title}</p>
                      <p className='text-xs text-gray-400'>{item.year}</p>
                      <div className='flex items-center gap-1 mt-1'>
                        <CheckCircle className='w-3.5 h-3.5 text-green-400' />
                        <span className='text-xs text-green-400'>Disponivel no {item.server}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {results.tmdb.length > 0 && (
              <div>
                <p className='text-xs text-gray-500 uppercase tracking-wider mb-2 px-1'>Resultados do TMDB</p>
                {results.tmdb.map((item: any) => {
                  const inLocal = results.local.some((l: any) => l.title.toLowerCase() === item.title.toLowerCase())
                  const alreadyRequested = requested.includes(item.tmdbId)
                  return (
                    <div key={item.tmdbId} className='flex items-center gap-3 p-3 rounded-xl mb-2' style={{ backgroundColor: '#151515' }}>
                      {item.poster ? <img src={item.poster} className='w-12 rounded object-cover' style={{ height: '68px', minWidth: '46px' }} /> : <div className='w-12 rounded bg-gray-800 flex items-center justify-center' style={{ height: '68px', minWidth: '46px' }}><Film className='w-4 h-4 text-gray-600' /></div>}
                      <div className='flex-1'>
                        <p className='font-semibold text-sm'>{item.title}</p>
                        <p className='text-xs text-gray-400'>{item.year}</p>
                        {inLocal ? (
                          <div className='flex items-center gap-1 mt-1'><CheckCircle className='w-3.5 h-3.5 text-green-400' /><span className='text-xs text-green-400'>Disponivel</span></div>
                        ) : alreadyRequested ? (
                          <div className='flex items-center gap-1 mt-1'><CheckCircle className='w-3.5 h-3.5 text-blue-400' /><span className='text-xs text-blue-400'>Solicitado</span></div>
                        ) : (
                          <div className='flex items-center gap-1 mt-1'><XCircle className='w-3.5 h-3.5 text-red-400' /><span className='text-xs text-red-400'>Nao disponivel</span></div>
                        )}
                      </div>
                        <button onClick={() => sendRequest(item.title, item.poster, item.tmdbId)} className='flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white' style={{ backgroundColor: '#f97316' }}>
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