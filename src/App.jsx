import { useEffect, useMemo, useRef, useState } from 'react'
import { EVENT, HINTS, MAX_ATTEMPTS, WHISPER_AFTER, FINALE } from './data.js'
import { downloadICS } from './calendar.js'

const SEEN_KEY = 'shehe.seen.sigils'

// jemná nápoveda generovaná z odpovede (prvé písmeno + počet písmen)
function whisperFor(hint) {
  const base = (hint.accept && hint.accept[0]) || hint.answer || ''
  const letters = base.replace(/[^a-zA-Zá-žÁ-Ž]/g, '')
  const first = (hint.answer || base).trim().charAt(0).toUpperCase()
  return `Začína na „${first}" a má ${letters.length} písmen.`
}

// --- hádanie odpovedí ---------------------------------------------------
function normalize(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // odstráň diakritiku
    .replace(/[^a-z0-9 ]/g, ' ') // len písmená/čísla
    .replace(/\s+/g, ' ')
    .trim()
}

function isCorrect(input, hint) {
  const n = normalize(input)
  if (!n) return false
  return (hint.accept || []).some((a) => {
    const na = normalize(a)
    return na && (n === na || n.includes(na))
  })
}

function loadSolvedSet() {
  const s = new Set()
  if (typeof localStorage === 'undefined') return s
  for (const h of HINTS) {
    try {
      const v = JSON.parse(localStorage.getItem(`shehe.guess.${h.id}`) || 'null')
      if (v && v.solved) s.add(h.id)
    } catch {
      /* ignore */
    }
  }
  return s
}

// --- pomocné funkcie pre prácu s dátumami (lokálna polnoc) -------------
function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

function startOfToday() {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 0, 0, 0, 0)
}

function daysBetween(from, to) {
  return Math.ceil((to.getTime() - from.getTime()) / 86400000)
}

const fmt = new Intl.DateTimeFormat('sk-SK', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function dayWord(n) {
  if (n === 1) return 'deň'
  if (n >= 2 && n <= 4) return 'dni'
  return 'dní'
}

// --- živý odpočet do najbližšieho odhalenia ---------------------------
function useCountdown(targetStr) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!targetStr) return null
  const diff = parseDate(targetStr).getTime() - now
  if (diff <= 0) return null
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return { d, h, m, s }
}

function pad(n) {
  return String(n).padStart(2, '0')
}

// Režim náhľadu: odomkne všetky pečate naraz (len na kontrolu obsahu).
// Je za tajným tokenom z env (VITE_PREVIEW_TOKEN) — odomkne sa len cez
//   ?preview=<TOKEN>   (alebo ?token=<TOKEN>)
function isPreview() {
  if (typeof window === 'undefined') return false
  const token = import.meta.env.VITE_PREVIEW_TOKEN
  if (!token) return false
  const p = new URLSearchParams(window.location.search)
  return p.get('preview') === token || p.get('token') === token
}

export default function App() {
  const preview = useMemo(() => isPreview(), [])

  const hints = useMemo(
    () =>
      HINTS.map((h) => ({
        ...h,
        date: parseDate(h.reveal),
        unlocked:
          preview || startOfToday().getTime() >= parseDate(h.reveal).getTime(),
      })),
    [preview],
  )

  const nextLocked = hints.find((h) => !h.unlocked)
  const countdown = useCountdown(nextLocked?.reveal)

  const unlockedCount = hints.filter((h) => h.unlocked).length
  const allUnlocked = unlockedCount === hints.length

  // koľko hádaniek už vyriešil (z localStorage, živo aktualizované)
  const [solved, setSolved] = useState(loadSolvedSet)
  const solvedCount = solved.size
  const progress = Math.round((solvedCount / hints.length) * 100)

  // --- "nová pečať" od poslednej návštevy (cez localStorage) ---
  const [newIds, setNewIds] = useState(() => new Set())

  useEffect(() => {
    if (preview) return
    let seen = []
    try {
      seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')
    } catch {
      seen = []
    }
    const unlockedIds = hints.filter((h) => h.unlocked).map((h) => h.id)
    const fresh = unlockedIds.filter((id) => !seen.includes(id))
    if (fresh.length) {
      setNewIds(new Set(fresh))
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const last = hints.find((h) => h.id === fresh[fresh.length - 1])
        new Notification('Padla nová pečať, Shehe ☾', {
          body: last ? last.title : 'Otvor Pradávnu výzvu a odhaľ ju.',
        })
      }
    }
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(unlockedIds))
    } catch {
      /* localStorage nedostupné — nevadí */
    }
  }, [preview, hints])

  // --- browser notifikácie (zapnutie) ---
  const [notifyState, setNotifyState] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  )

  function enableNotifications() {
    if (typeof Notification === 'undefined') return
    Notification.requestPermission().then((p) => {
      setNotifyState(p)
      if (p === 'granted') {
        new Notification('Upozornenia zapnuté ☾', {
          body: 'Dám ti vedieť, keď padne nová pečať.',
        })
      }
    })
  }

  // --- veľký odpočet do odchodu ---
  const doom = useCountdown(EVENT.departure)

  // --- konfety (burst = počítadlo spustení) ---
  const [burst, setBurst] = useState(0)

  // --- toast (krátke správy / easter egg) ---
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  function showToast(msg) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3800)
  }

  // --- easter egg: 7× klik na mesiac ---
  const moonClicks = useRef(0)
  function tapMoon() {
    moonClicks.current += 1
    if (moonClicks.current >= 7) {
      moonClicks.current = 0
      showToast('Shehe, prestaň klikať a choď radšej baliť! 🎒')
      setBurst((b) => b + 1)
    }
  }

  // --- hlásenie organizátorovi pri správnej odpovedi (každá pečať raz) ---
  function notifyOrganizer(hint, attemptNo) {
    const k = `shehe.notified.${hint.id}`
    try {
      if (localStorage.getItem(k)) return
    } catch {
      /* ignore */
    }
    fetch('/api/solved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: hint.id,
        title: hint.title,
        answer: hint.answer,
        attempts: attemptNo,
      }),
    })
      .then((r) => {
        if (r.ok) {
          try {
            localStorage.setItem(k, '1')
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {
        /* offline / lokálny dev bez /api — nevadí */
      })
  }

  // --- finále: všetkých 19 vyriešených ---
  const allSolved = solvedCount === hints.length
  const finaleFired = useRef(false)
  useEffect(() => {
    if (allSolved && !finaleFired.current) {
      finaleFired.current = true
      setBurst((b) => b + 1)
    }
  }, [allSolved])

  return (
    <div className="page">
      <div className="stars" aria-hidden="true" />
      <div className="fog" aria-hidden="true" />
      <Embers />
      {burst > 0 && <Confetti key={burst} />}
      {toast && <div className="toast">{toast}</div>}

      <main className="content">
        {preview && (
          <div className="preview-banner">
            <strong>Režim náhľadu</strong> — všetky pečate sú odomknuté (len pre
            teba). <a href="?">späť na ostrú verziu →</a>
          </div>
        )}

        <header className="hero">
          <div
            className="sigil"
            onClick={tapMoon}
            role="button"
            tabIndex={0}
            title="☾"
          >
            ☾
          </div>
          <h1 className="title">Pradávna výzva</h1>
          <p className="dedication">
            pre pútnika menom <span className="name">Shehe</span>
          </p>
          <div className="portrait" aria-hidden="true">
            <img
              src="./shehe.jpg"
              alt="Shehe"
              onError={(e) => {
                e.currentTarget.parentElement.style.display = 'none'
              }}
            />
          </div>
          <p className="subtitle">
            Cesta k poslednej noci slobody sa odhaľuje pomaly.
            <br />
            Pečať po pečati sa odhalí útržok pravdy… či klamu.
          </p>
        </header>

        <section className="fates">
          <div className="fate">
            <span className="fate-label">Odchod</span>
            <span className="fate-date">{fmt.format(parseDate(EVENT.departure))}</span>
          </div>
          <div className="fate-divider" aria-hidden="true">✦</div>
          <div className="fate">
            <span className="fate-label">Koniec</span>
            <span className="fate-date">{fmt.format(parseDate(EVENT.end))}</span>
          </div>
        </section>

        {doom && (
          <section className="doom" aria-label="Odpočet do odchodu">
            <p className="doom-label">Do odchodu zostáva</p>
            <p className="doom-value">
              {doom.d} {dayWord(doom.d)} · {pad(doom.h)}:{pad(doom.m)}:{pad(doom.s)}
            </p>
          </section>
        )}

        <section className="tools">
          <button className="rune-btn" onClick={downloadICS}>
            🔔 Pridať pripomienky do kalendára
          </button>
          {notifyState === 'default' && (
            <button className="rune-btn ghost" onClick={enableNotifications}>
              🛎️ Zapnúť upozornenia
            </button>
          )}
          {notifyState === 'granted' && (
            <span className="notify-on">🛎️ Upozornenia zapnuté</span>
          )}
        </section>

        <section className="progress" aria-label="Postup">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="progress-label">
            {solvedCount} z {hints.length} hádaniek vyriešených
            <span className="progress-sub"> · {unlockedCount} pečatí odhalených</span>
          </p>
        </section>

        {nextLocked && (
          <section className="next-reveal">
            <p className="next-label">Ďalšia pečať padne o</p>
            {countdown ? (
              <div className="clock">
                <Unit value={countdown.d} label={dayWord(countdown.d)} />
                <span className="colon">:</span>
                <Unit value={pad(countdown.h)} label="hod" />
                <span className="colon">:</span>
                <Unit value={pad(countdown.m)} label="min" />
                <span className="colon">:</span>
                <Unit value={pad(countdown.s)} label="sek" />
              </div>
            ) : (
              <p className="next-soon">už čoskoro…</p>
            )}
          </section>
        )}

        {allUnlocked && !allSolved && (
          <p className="all-done">
            Všetky pečate sú zlomené. Dobrodružstvo môže začať. ✦
          </p>
        )}

        {allSolved && (
          <section className="finale">
            <div className="finale-glyph" aria-hidden="true">✦ ☾ ✦</div>
            <h2 className="finale-title">{FINALE.title}</h2>
            <p className="finale-message">{FINALE.message}</p>
            <p className="finale-sub">Tvoj pravý batoh:</p>
            <ul className="finale-list">
              {FINALE.packing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="hints" aria-label="Hinty">
          {hints.map((h, i) =>
            h.unlocked ? (
              <article
                className={`card revealed${newIds.has(h.id) ? ' is-new' : ''}`}
                key={h.id}
              >
                {newIds.has(h.id) && (
                  <>
                    <div className="new-badge">Nová pečať ✦</div>
                    <div className="seal-break" aria-hidden="true">
                      <span className="seal-half left">⛧</span>
                      <span className="seal-half right">⛧</span>
                    </div>
                  </>
                )}
                {preview && (
                  <div className="card-reveal-date">odomkne sa {fmt.format(h.date)}</div>
                )}
                <h2 className="card-title">{h.title}</h2>
                <p className="card-riddle">{h.riddle}</p>
                {h.note && <p className="card-note">{h.note}</p>}
                <Guess
                  hint={h}
                  onSolved={(attemptNo) => {
                    setSolved((prev) => {
                      const next = new Set(prev)
                      next.add(h.id)
                      return next
                    })
                    if (!preview) notifyOrganizer(h, attemptNo)
                  }}
                />
              </article>
            ) : (
              <article className="card locked" key={h.id} aria-disabled="true">
                <div className="card-index">{romanize(i + 1)}</div>
                <div className="lock-glyph" aria-hidden="true">⛧</div>
                <p className="card-locked-text">Zapečatené</p>
                <p className="card-when">
                  odomkne sa {fmt.format(h.date)}
                </p>
              </article>
            ),
          )}
        </section>

        <footer className="footer">
          <span aria-hidden="true">✦ ☾ ✦</span>
        </footer>
      </main>
    </div>
  )
}

function Unit({ value, label }) {
  return (
    <span className="unit">
      <span className="unit-value">{value}</span>
      <span className="unit-label">{label}</span>
    </span>
  )
}

const MISS_LINES = [
  'Nie celkom… duch krúti hlavou.',
  'Hmla mlčí. To nie je ono.',
  'Skús ešte raz, pútnik.',
  'Pečať sa nepohla. Hádaj znova.',
  'Blízko? Možno. Správne? Nie.',
]

function Guess({ hint, onSolved }) {
  const key = `shehe.guess.${hint.id}`
  const [state, setState] = useState(() => {
    const fallback = { attempts: 0, solved: false, revealed: false, whisper: false }
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') || fallback
    } catch {
      return fallback
    }
  })
  const [value, setValue] = useState('')
  const [shake, setShake] = useState(false)

  function persist(next) {
    setState(next)
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  function submit(e) {
    e.preventDefault()
    if (state.solved || state.revealed || !value.trim()) return
    if (isCorrect(value, hint)) {
      persist({ ...state, solved: true })
      onSolved && onSolved(state.attempts + 1)
    } else {
      persist({ ...state, attempts: state.attempts + 1 })
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
    setValue('')
  }

  if (state.solved) {
    return (
      <div className="guess guess-solved">
        ✔ Uhádol si na {state.attempts + 1}. pokus — <strong>{hint.answer}</strong>
      </div>
    )
  }

  if (state.revealed) {
    return (
      <div className="guess guess-revealed">
        Odpoveď znela: <strong>{hint.answer}</strong>
      </div>
    )
  }

  const remaining = MAX_ATTEMPTS - state.attempts
  const canWhisper = state.attempts >= WHISPER_AFTER && !state.whisper
  const canReveal = state.attempts >= MAX_ATTEMPTS

  return (
    <form className="guess" onSubmit={submit}>
      <div className={`guess-row${shake ? ' shake' : ''}`}>
        <input
          className="guess-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Čo si máš zbaliť?"
          aria-label="Tvoja odpoveď"
        />
        <button className="guess-btn" type="submit">
          Hádať
        </button>
      </div>
      {state.attempts > 0 && (
        <p className="guess-feedback">
          {MISS_LINES[(state.attempts - 1) % MISS_LINES.length]}{' '}
          {remaining > 0 ? `(zostáva ${remaining})` : ''}
        </p>
      )}
      {state.whisper && (
        <p className="guess-whisper">👻 {whisperFor(hint)}</p>
      )}
      <div className="guess-actions">
        {canWhisper && (
          <button
            type="button"
            className="whisper-btn"
            onClick={() => persist({ ...state, whisper: true })}
          >
            👻 Šepot ducha (nápoveda)
          </button>
        )}
        {canReveal && (
          <button
            type="button"
            className="reveal-btn"
            onClick={() => persist({ ...state, revealed: true })}
          >
            Vzdávam sa — prezradiť odpoveď
          </button>
        )}
      </div>
    </form>
  )
}

function Embers() {
  const bits = useMemo(
    () =>
      Array.from({ length: 16 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 12,
        dur: 9 + Math.random() * 10,
        size: 2 + Math.random() * 3,
        drift: (Math.random() - 0.5) * 60,
      })),
    [],
  )
  return (
    <div className="embers" aria-hidden="true">
      {bits.map((b, i) => (
        <span
          key={i}
          style={{
            left: `${b.left}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.dur}s`,
            '--drift': `${b.drift}px`,
          }}
        />
      ))}
    </div>
  )
}

function Confetti() {
  const glyphs = ['✦', '✧', '☾', '★']
  const colors = ['#d9b56b', '#f3e6c4', '#b89653', '#e8e2d4']
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 2.4 + Math.random() * 2.2,
        rot: Math.random() * 360,
        glyph: glyphs[i % glyphs.length],
        color: colors[i % colors.length],
        size: 12 + Math.random() * 16,
      })),
    [],
  )
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            color: p.color,
            fontSize: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        >
          {p.glyph}
        </span>
      ))}
    </div>
  )
}

function romanize(n) {
  const map = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let out = ''
  for (const [v, s] of map) {
    while (n >= v) {
      out += s
      n -= v
    }
  }
  return out
}
