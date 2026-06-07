import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import { HINTS } from './data.js'

const params = new URLSearchParams(window.location.search)
const TOKEN = params.get('token') || params.get('preview') || ''

const timeFmt = new Intl.DateTimeFormat('sk-SK', {
  day: 'numeric',
  month: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function statusOf(list) {
  if (list.some((a) => a.correct)) return { label: 'Uhádnuté', cls: 'st-ok' }
  if (list.some((a) => a.revealed)) return { label: 'Prezradené', cls: 'st-rev' }
  if (list.length) return { label: 'Skúša…', cls: 'st-try' }
  return { label: 'Zatiaľ nič', cls: 'st-none' }
}

function App() {
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    if (!TOKEN) {
      setState({ loading: false, error: 'Chýba token v adrese (?token=…).' })
      return
    }
    fetch(`/api/attempts?token=${encodeURIComponent(TOKEN)}`)
      .then((r) => r.json())
      .then((j) => setState({ loading: false, data: j }))
      .catch((e) =>
        setState({
          loading: false,
          error: 'Nepodarilo sa načítať (API beží len na Verceli): ' + e,
        }),
      )
  }, [])

  const data = state.data
  const attempts = data?.attempts || {}
  const totalTries = Object.values(attempts).reduce((n, l) => n + l.length, 0)
  const solvedCount = HINTS.filter((h) => (attempts[h.id] || []).some((a) => a.correct)).length

  return (
    <div className="page">
      <div className="stars" aria-hidden="true" />
      <main className="content">
        <header className="hero" style={{ marginBottom: '2rem' }}>
          <div className="sigil">📜</div>
          <h1 className="title" style={{ fontSize: '2.2rem' }}>Sehe-ho odpovede</h1>
          <p className="subtitle">Čo skúšal pri každej pečati (len na čítanie).</p>
        </header>

        {state.loading && <p className="subtitle">Načítavam…</p>}

        {state.error && (
          <div className="preview-banner" style={{ borderColor: '#c98a8a' }}>
            ⚠️ {state.error}
          </div>
        )}

        {data && data.kv === false && (
          <div className="preview-banner" style={{ borderColor: '#c98a8a' }}>
            ⚠️ Vercel KV nie je nastavené — pokusy sa zatiaľ neukladajú. Vytvor KV
            úložisko vo Vercel → Storage a re-deployni (návod v README).
          </div>
        )}

        {data && data.ok && (
          <p className="progress-label" style={{ marginBottom: '1.6rem' }}>
            {solvedCount} z {HINTS.length} uhádnutých · spolu {totalTries} pokusov
          </p>
        )}

        {data && data.ok && (
          <section className="hints">
            {HINTS.map((h) => {
              const list = attempts[h.id] || []
              const st = statusOf(list)
              return (
                <article className="card revealed" key={h.id} style={{ textAlign: 'left' }}>
                  <div className="att-head">
                    <h2 className="card-title" style={{ margin: 0 }}>{h.title}</h2>
                    <span className={`att-status ${st.cls}`}>{st.label}</span>
                  </div>
                  <p className="att-answer">
                    Správne: <strong>{h.answer}</strong>
                  </p>
                  {list.length === 0 ? (
                    <p className="att-empty">— zatiaľ žiadny pokus —</p>
                  ) : (
                    <ol className="att-list">
                      {list.map((a, i) => (
                        <li
                          key={i}
                          className={
                            a.correct ? 'att-ok' : a.revealed ? 'att-rev' : 'att-wrong'
                          }
                        >
                          <span className="att-mark">
                            {a.correct ? '✓' : a.revealed ? '🏳️' : '✗'}
                          </span>
                          <span className="att-val">
                            {a.revealed ? '(vzdal sa — prezradené)' : a.value || '—'}
                          </span>
                          {a.t && <span className="att-time">{timeFmt.format(new Date(a.t))}</span>}
                        </li>
                      ))}
                    </ol>
                  )}
                </article>
              )
            })}
          </section>
        )}

        <footer className="footer">
          <a
            href={`./?preview=${encodeURIComponent(TOKEN)}`}
            style={{ color: 'var(--gold-soft)' }}
          >
            ← späť na náhľad hry
          </a>
        </footer>
      </main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
