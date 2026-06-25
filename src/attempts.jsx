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

// Zmenší fotku (ktorú organizátor nahráva za Seheho) na rozumnú veľkosť,
// nech sa zmestí do KV (Upstash limit ~1 MB na požiadavku).
function downscale(file, maxDim = 1280, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('obrázok sa nepodarilo načítať'))
    }
    img.src = url
  })
}

// Formulár pre organizátora: doplniť/upraviť dôkaz za Seheho (text + fotka).
function ProofUploader({ hint, existing, onSaved }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(existing?.text || '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    let photo
    try {
      const file = e.target.elements.proofFile?.files?.[0]
      // nová fotka → zmenší; inak ponecháme existujúcu (aby sa neprepísala)
      photo = file ? await downscale(file) : existing?.photo || ''
    } catch {
      setMsg('⚠️ Fotku sa nepodarilo spracovať — skús inú.')
      setBusy(false)
      return
    }
    try {
      const r = await fetch(`/api/set-proof?token=${encodeURIComponent(TOKEN)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: hint.id, text: text.trim(), photo }),
      })
      const j = await r.json()
      if (j.ok) {
        setMsg('✓ Uložené')
        setOpen(false)
        onSaved && onSaved()
      } else {
        setMsg('⚠️ ' + (j.error || 'Nepodarilo sa uložiť.'))
      }
    } catch {
      setMsg('⚠️ Nepodarilo sa spojiť so serverom.')
    }
    setBusy(false)
  }

  if (!open) {
    return (
      <button type="button" className="att-edit-btn" onClick={() => setOpen(true)}>
        {existing ? '✏️ Upraviť dôkaz' : '➕ Doplniť dôkaz za Seheho'}
      </button>
    )
  }

  return (
    <form className="att-edit" onSubmit={save}>
      <textarea
        className="att-edit-text"
        value={text}
        onChange={(ev) => setText(ev.target.value)}
        placeholder="Text dôkazu (voliteľné)…"
        rows={2}
      />
      <label className="att-edit-file">
        📷 Fotka {existing?.photo ? '(prázdne = ponechá súčasnú)' : ''}
        <input type="file" name="proofFile" accept="image/*" />
      </label>
      <div className="att-edit-actions">
        <button type="submit" disabled={busy}>
          {busy ? 'Ukladám…' : 'Uložiť'}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={busy}>
          Zrušiť
        </button>
      </div>
      {msg && <p className="att-edit-msg">{msg}</p>}
    </form>
  )
}

function App() {
  const [state, setState] = useState({ loading: true })

  function load() {
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
  }

  useEffect(() => {
    load()
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
                          <span className="att-time">
                            {timeFmt.format(new Date(proof.t))}
                            {proof.byOrganizer ? ' · doplnené organizátorom' : ''}
                          </span>
                        )}
                      </div>
                    )}
                    <ProofUploader hint={h} existing={proof} onSaved={load} />
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
