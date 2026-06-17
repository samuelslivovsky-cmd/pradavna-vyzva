import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import { HINTS, BADGES, REWARDS, POINTS } from './data.js'

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

// vyhodnotenie podmienky odznaku (rovnaká logika ako v hre, App.jsx)
function badgeEarned(when, ctx) {
  if (!when) return false
  if (when.minSolved && ctx.solvedCount < when.minSolved) return false
  if (when.minRiddles && ctx.solvedRiddles < when.minRiddles) return false
  if (when.minQuests && ctx.solvedQuests < when.minQuests) return false
  if (when.allQuests && (ctx.totalQuests === 0 || ctx.solvedQuests < ctx.totalQuests)) return false
  if (when.all && ctx.solvedCount < ctx.total) return false
  return true
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
  const proofs = data?.proofs || {}
  const totalTries = Object.values(attempts).reduce((n, l) => n + l.length, 0)
  const solvedCount = HINTS.filter((h) =>
    h.type === 'quest'
      ? Boolean(proofs[h.id])
      : (attempts[h.id] || []).some((a) => a.correct),
  ).length

  // gamifikácia z pohľadu organizátora (odvodené zo serverových dát)
  const solvedRiddles = HINTS.filter(
    (h) => h.type !== 'quest' && (attempts[h.id] || []).some((a) => a.correct),
  ).length
  const solvedQuests = HINTS.filter((h) => h.type === 'quest' && Boolean(proofs[h.id])).length
  const totalQuests = HINTS.filter((h) => h.type === 'quest').length
  const points = solvedRiddles * POINTS.riddle + solvedQuests * POINTS.quest
  const badgeCtx = { solvedCount, solvedRiddles, solvedQuests, totalQuests, total: HINTS.length }
  const earnedBadges = BADGES.filter((b) => badgeEarned(b.when, badgeCtx))
  const unlockedRewards = REWARDS.filter((r) => solvedCount >= r.atSolved)

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
            {solvedCount} z {HINTS.length} vyriešených · spolu {totalTries} pokusov
          </p>
        )}

        {data && data.ok && (
          <section className="att-game" style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <div className="score" style={{ marginBottom: '1.6rem' }}>
              <p className="score-label">Magické body</p>
              <p className="score-value">✦ {points}</p>
            </div>

            <p className="section-eyebrow">
              Odomknuté odznaky ({earnedBadges.length} z {BADGES.length})
            </p>
            <div className="badges" style={{ marginBottom: '1.6rem' }}>
              {BADGES.map((b) => {
                const earned = earnedBadges.some((e) => e.id === b.id)
                return (
                  <div
                    key={b.id}
                    className={`badge${earned ? ' earned' : ' locked'}`}
                    title={b.desc}
                  >
                    <span className="badge-icon">{earned ? b.icon : '🔒'}</span>
                    <span className="badge-label">{b.label}</span>
                  </div>
                )
              })}
            </div>

            <p className="section-eyebrow">
              Odomknuté odmeny ({unlockedRewards.length} z {REWARDS.length})
            </p>
            {unlockedRewards.length === 0 ? (
              <p className="att-empty">— zatiaľ žiadna odmena —</p>
            ) : (
              <ul className="reward-list">
                {unlockedRewards.map((r) => (
                  <li key={r.atSolved}>
                    <strong>{r.title}</strong> — {r.desc}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {data && data.ok && (
          <section className="hints">
            {HINTS.map((h) => {
              if (h.type === 'quest') {
                const proof = proofs[h.id]
                return (
                  <article className="card revealed" key={h.id} style={{ textAlign: 'left' }}>
                    <div className="att-head">
                      <h2 className="card-title" style={{ margin: 0 }}>{h.title}</h2>
                      <span className={`att-status ${proof ? 'st-ok' : 'st-none'}`}>
                        {proof ? 'Splnené' : 'Čaká'}
                      </span>
                    </div>
                    <p className="att-answer">Úloha: <strong>{h.task || h.riddle}</strong></p>
                    {!proof ? (
                      <p className="att-empty">— zatiaľ žiadny dôkaz —</p>
                    ) : (
                      <div className="att-proof">
                        {proof.text && <p className="att-proof-text">„{proof.text}"</p>}
                        {proof.photo && (
                          <img
                            className="att-proof-img"
                            src={proof.photo}
                            alt="dôkaz"
                            style={{ maxWidth: '100%', borderRadius: 12 }}
                          />
                        )}
                        {proof.t && (
                          <span className="att-time">{timeFmt.format(new Date(proof.t))}</span>
                        )}
                      </div>
                    )}
                  </article>
                )
              }
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
