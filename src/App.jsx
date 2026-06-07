import { useEffect, useMemo, useRef, useState } from 'react'
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
} from 'framer-motion'
import { EVENT, HINTS, MAX_ATTEMPTS, WHISPER_AFTER, FINALE } from './data.js'
import { downloadICS } from './calendar.js'

const SEEN_KEY = 'sehe.seen.sigils'

// --- animačné varianty (framer-motion) ---------------------------------
const EASE = [0.22, 1, 0.36, 1]

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
}

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: EASE, delay: (i % 3) * 0.09 },
  }),
}

const inView = { once: true, amount: 0.2 }
const cardInView = { once: true, amount: 0.15 }

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
      const v = JSON.parse(localStorage.getItem(`sehe.guess.${h.id}`) || 'null')
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
        new Notification('Padla nová pečať, Sehe ☾', {
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
      showToast('Sehe, prestaň klikať a choď radšej baliť! 🎒')
      setBurst((b) => b + 1)
    }
  }

  // --- hlásenie organizátorovi pri správnej odpovedi (každá pečať raz) ---
  function notifyOrganizer(hint, attemptNo) {
    const k = `sehe.notified.${hint.id}`
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

  // --- scroll parallax + progress lišta ---
  const { scrollY, scrollYProgress } = useScroll()
  const starsY = useTransform(scrollY, [0, 1500], [0, 120])
  const fogY = useTransform(scrollY, [0, 1500], [0, 200])
  const portraitY = useTransform(scrollY, [0, 600], [0, 50])

  // dotykové zariadenie (telefón/tablet) — bez kurzora a hoveru
  const coarse = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: none), (pointer: coarse)').matches,
    [],
  )

  // --- parallax pozadia: myš (desktop) / gyroskop (mobil) + kurzorová žiara ---
  const mvX = useMotionValue(0)
  const cursorX = useMotionValue(-1000)
  const cursorY = useMotionValue(-1000)

  // desktop: pohyb myši
  useEffect(() => {
    if (coarse) return
    function onMove(e) {
      mvX.set(e.clientX / window.innerWidth - 0.5)
      cursorX.set(e.clientX)
      cursorY.set(e.clientY)
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [coarse, cursorX, cursorY, mvX])

  // mobil: náklon telefónu (gyroskop)
  useEffect(() => {
    if (!coarse) return
    function handle(e) {
      if (e.gamma == null) return
      mvX.set(Math.max(-0.5, Math.min(0.5, e.gamma / 60)))
    }
    const DOE = typeof window !== 'undefined' ? window.DeviceOrientationEvent : null
    if (DOE && typeof DOE.requestPermission === 'function') {
      // iOS — povolenie treba vyžiadať po geste používateľa
      const ask = () => {
        DOE.requestPermission()
          .then((p) => {
            if (p === 'granted') window.addEventListener('deviceorientation', handle)
          })
          .catch(() => {})
        window.removeEventListener('touchend', ask)
      }
      window.addEventListener('touchend', ask, { once: true })
      return () => window.removeEventListener('touchend', ask)
    }
    window.addEventListener('deviceorientation', handle)
    return () => window.removeEventListener('deviceorientation', handle)
  }, [coarse, mvX])

  const sMvX = useSpring(mvX, { stiffness: 40, damping: 20 })
  const starsX = useTransform(sMvX, [-0.5, 0.5], [30, -30])
  const fogX = useTransform(sMvX, [-0.5, 0.5], [55, -55])
  const spotX = useTransform(useSpring(cursorX, { stiffness: 120, damping: 22 }), (v) => v - 320)
  const spotY = useTransform(useSpring(cursorY, { stiffness: 120, damping: 22 }), (v) => v - 320)

  return (
    <div className="page">
      <motion.div
        className="scroll-progress"
        style={{ scaleX: scrollYProgress }}
        aria-hidden="true"
      />
      <motion.div className="stars" style={{ x: starsX, y: starsY }} aria-hidden="true" />
      <motion.div className="fog" style={{ x: fogX, y: fogY }} aria-hidden="true" />
      {!coarse && (
        <motion.div
          className="cursor-glow"
          style={{ x: spotX, y: spotY }}
          aria-hidden="true"
        />
      )}
      <Meteors count={coarse ? 2 : 4} />
      <Embers count={coarse ? 8 : 16} />
      {burst > 0 && <Confetti key={burst} />}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="content">
        {preview && (
          <div className="preview-banner">
            <strong>Režim náhľadu</strong> — všetky pečate sú odomknuté (len pre
            teba). <a href="?">späť na ostrú verziu →</a>
          </div>
        )}

        <motion.header
          className="hero"
          variants={heroContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div
            className="sigil"
            variants={fadeUp}
            onClick={tapMoon}
            role="button"
            tabIndex={0}
            title="☾"
            whileTap={{ scale: 0.82, rotate: -12 }}
          >
            ☾
          </motion.div>
          <motion.h1 className="title" variants={fadeUp}>
            Pradávna výzva
          </motion.h1>
          <motion.p className="dedication" variants={fadeUp}>
            pre pútnika menom <span className="name">Sehe</span>
          </motion.p>
          <motion.div
            className="portrait"
            variants={fadeUp}
            style={{ y: portraitY }}
            aria-hidden="true"
            whileHover={{ scale: 1.06, rotate: 1 }}
          >
            <img
              src="./sehe.jpg"
              alt="Sehe"
              onError={(e) => {
                e.currentTarget.parentElement.style.display = 'none'
              }}
            />
          </motion.div>
          <motion.p className="subtitle" variants={fadeUp}>
            Cesta k poslednej noci slobody sa odhaľuje pomaly.
            <br />
            Pečať po pečati sa odhalí útržok pravdy… či klamu.
          </motion.p>
        </motion.header>

        <motion.section
          className="fates"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={inView}
        >
          <div className="fate">
            <span className="fate-label">Odchod</span>
            <span className="fate-date">{fmt.format(parseDate(EVENT.departure))}</span>
          </div>
          <div className="fate-divider" aria-hidden="true">✦</div>
          <div className="fate">
            <span className="fate-label">Koniec</span>
            <span className="fate-date">{fmt.format(parseDate(EVENT.end))}</span>
          </div>
        </motion.section>

        {doom && (
          <motion.section
            className="doom"
            aria-label="Odpočet do odchodu"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={inView}
          >
            <p className="doom-label">Do odchodu zostáva</p>
            <p className="doom-value">
              {doom.d} {dayWord(doom.d)} · {pad(doom.h)}:{pad(doom.m)}:{pad(doom.s)}
            </p>
          </motion.section>
        )}

        <motion.section
          className="tools"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={inView}
        >
          <motion.button
            className="rune-btn"
            onClick={downloadICS}
            whileHover={{ y: -3, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            🔔 Pridať pripomienky do kalendára
          </motion.button>
          {notifyState === 'default' && (
            <motion.button
              className="rune-btn ghost"
              onClick={enableNotifications}
              whileHover={{ y: -3, scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              🛎️ Zapnúť upozornenia
            </motion.button>
          )}
          {notifyState === 'granted' && (
            <span className="notify-on">🛎️ Upozornenia zapnuté</span>
          )}
        </motion.section>

        <motion.section
          className="progress"
          aria-label="Postup"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={inView}
        >
          <div className="progress-track">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              whileInView={{ width: `${progress}%` }}
              viewport={inView}
              transition={{ duration: 1.1, ease: EASE }}
            />
          </div>
          <p className="progress-label">
            {solvedCount} z {hints.length} hádaniek vyriešených
            <span className="progress-sub"> · {unlockedCount} pečatí odhalených</span>
          </p>
        </motion.section>

        {nextLocked && (
          <motion.section
            className="next-reveal"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={inView}
          >
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
          </motion.section>
        )}

        {allUnlocked && !allSolved && (
          <motion.p
            className="all-done"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={inView}
            transition={{ duration: 0.6, ease: EASE }}
          >
            Všetky pečate sú zlomené. Dobrodružstvo môže začať. ✦
          </motion.p>
        )}

        <AnimatePresence>
          {allSolved && (
            <motion.section
              className="finale"
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 110, damping: 14 }}
            >
              <motion.div
                className="finale-glyph"
                aria-hidden="true"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                ✦ ☾ ✦
              </motion.div>
              <h2 className="finale-title">{FINALE.title}</h2>
              <p className="finale-message">{FINALE.message}</p>
              <p className="finale-sub">Tvoj pravý batoh:</p>
              <ul className="finale-list">
                {FINALE.packing.map((item, i) => (
                  <motion.li
                    key={item}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                  >
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.section>
          )}
        </AnimatePresence>

        <section className="hints" aria-label="Hinty">
          {hints.map((h, i) =>
            h.unlocked ? (
              <TiltCard
                className={`card revealed${newIds.has(h.id) ? ' is-new' : ''}`}
                key={h.id}
                index={i}
                hoverLift={-6}
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
              </TiltCard>
            ) : (
              <TiltCard
                className="card locked"
                key={h.id}
                index={i}
                hoverLift={-4}
                aria-disabled="true"
              >
                <div className="card-index">{romanize(i + 1)}</div>
                <div className="lock-glyph" aria-hidden="true">⛧</div>
                <p className="card-locked-text">Zapečatené</p>
                <p className="card-when">
                  odomkne sa {fmt.format(h.date)}
                </p>
              </TiltCard>
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
  const key = `sehe.guess.${hint.id}`
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

function TiltCard({ index, className, hoverLift = -6, children, ...rest }) {
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const srx = useSpring(rx, { stiffness: 150, damping: 15 })
  const sry = useSpring(ry, { stiffness: 150, damping: 15 })

  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    ry.set(px * 9)
    rx.set(-py * 9)
  }
  function onLeave() {
    rx.set(0)
    ry.set(0)
  }

  return (
    <motion.article
      className={className}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      whileInView="show"
      viewport={cardInView}
      whileHover={{ y: hoverLift }}
      whileTap={{ scale: 0.99 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      {...rest}
    >
      {children}
    </motion.article>
  )
}

function Meteors({ count = 4 }) {
  const list = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        top: Math.random() * 40,
        left: 20 + Math.random() * 70,
        delay: 3 + i * 5 + Math.random() * 4,
        dur: 2.5 + Math.random() * 2,
      })),
    [count],
  )
  return (
    <div className="meteors" aria-hidden="true">
      {list.map((m, i) => (
        <span
          key={i}
          className="meteor"
          style={{
            top: `${m.top}%`,
            left: `${m.left}%`,
            animationDelay: `${m.delay}s`,
            animationDuration: `${m.dur}s`,
          }}
        />
      ))}
    </div>
  )
}

function Embers({ count = 16 }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 12,
        dur: 9 + Math.random() * 10,
        size: 2 + Math.random() * 3,
        drift: (Math.random() - 0.5) * 60,
      })),
    [count],
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
