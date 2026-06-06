import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import { downloadICS, buildICS } from './calendar.js'

const params = new URLSearchParams(window.location.search)
const TOKEN = params.get('token') || params.get('preview') || ''

function Row({ title, desc, children, result }) {
  return (
    <article className="card revealed" style={{ textAlign: 'left' }}>
      <h2 className="card-title">{title}</h2>
      {desc && <p className="card-riddle" style={{ fontSize: '1rem' }}>{desc}</p>}
      <div style={{ marginTop: '1rem' }}>{children}</div>
      {result != null && <pre className="diag-pre">{result}</pre>}
    </article>
  )
}

function Test() {
  const [out, setOut] = useState({})
  const set = (k, v) => setOut((o) => ({ ...o, [k]: v }))

  async function checkConfig() {
    set('config', '… kontrolujem')
    try {
      const r = await fetch(`/api/test-email?check=1&token=${encodeURIComponent(TOKEN)}`)
      const j = await r.json()
      set('config', JSON.stringify(j, null, 2))
    } catch (e) {
      set('config', 'CHYBA: ' + e + '\n(API beží len na Verceli alebo cez `vercel dev`)')
    }
  }

  async function sendTestEmail() {
    set('email', '… odosielam')
    try {
      const r = await fetch(`/api/test-email?token=${encodeURIComponent(TOKEN)}`, {
        method: 'POST',
      })
      const j = await r.json()
      set('email', (j.ok ? '✅ ' : '❌ ') + JSON.stringify(j, null, 2))
    } catch (e) {
      set('email', 'CHYBA: ' + e + '\n(API beží len na Verceli alebo cez `vercel dev`)')
    }
  }

  async function sendSolved() {
    set('solved', '… odosielam')
    try {
      const r = await fetch('/api/solved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 0,
          title: 'TEST pečať',
          answer: 'Testovacia odpoveď',
          attempts: 1,
        }),
      })
      const j = await r.json()
      set('solved', (j.ok ? '✅ ' : '❌ ') + JSON.stringify(j, null, 2))
    } catch (e) {
      set('solved', 'CHYBA: ' + e + '\n(API beží len na Verceli alebo cez `vercel dev`)')
    }
  }

  function testNotif() {
    if (typeof Notification === 'undefined') {
      set('notif', 'Tento prehliadač nepodporuje notifikácie.')
      return
    }
    Notification.requestPermission().then((p) => {
      if (p === 'granted') {
        new Notification('Test ☾', { body: 'Notifikácie fungujú!' })
        set('notif', '✅ Povolené — mala vyskočiť notifikácia „Test ☾".')
      } else {
        set('notif', 'Stav povolenia: ' + p)
      }
    })
  }

  function testIcs() {
    try {
      const ics = buildICS()
      const count = (ics.match(/BEGIN:VEVENT/g) || []).length
      downloadICS()
      set('ics', `✅ Stiahnuté „pradavna-vyzva-shehe.ics" — počet udalostí: ${count}`)
    } catch (e) {
      set('ics', 'CHYBA: ' + e)
    }
  }

  return (
    <div className="page">
      <div className="stars" aria-hidden="true" />
      <main className="content">
        <header className="hero" style={{ marginBottom: '2rem' }}>
          <div className="sigil">🧪</div>
          <h1 className="title" style={{ fontSize: '2.4rem' }}>Diagnostika</h1>
          <p className="subtitle">Overenie e-mailov, notifikácií a kalendára.</p>
        </header>

        {!TOKEN && (
          <div className="preview-banner" style={{ borderColor: '#c98a8a' }}>
            ⚠️ Chýba token. Otvor stránku s <code>?token=&lt;TOKEN&gt;</code> v adrese,
            inak API testy zlyhajú.
          </div>
        )}

        <div className="hints">
          <Row
            title="1 · Konfigurácia SMTP"
            desc="Zistí, ktoré premenné prostredia sú na serveri nastavené (bez hodnôt). Nič neodosiela."
            result={out.config}
          >
            <button className="rune-btn" onClick={checkConfig}>Skontrolovať konfiguráciu</button>
          </Row>

          <Row
            title="2 · Test e-mailu (SMTP)"
            desc="Pošle testovací e-mail na ADMIN_TO (alebo SMTP_USER). Overí, že odosielanie naozaj funguje."
            result={out.email}
          >
            <button className="rune-btn" onClick={sendTestEmail}>Poslať testovací e-mail</button>
          </Row>

          <Row
            title={'3 · Hlásenie „Shehe uhádol"'}
            desc="Spustí presne tú istú cestu ako pri správnej odpovedi (endpoint /api/solved)."
            result={out.solved}
          >
            <button className="rune-btn" onClick={sendSolved}>Poslať vzorové hlásenie</button>
          </Row>

          <Row
            title="4 · Browser notifikácia"
            desc="Vyžiada povolenie a vyskúša lokálnu notifikáciu v prehliadači."
            result={out.notif}
          >
            <button className="rune-btn" onClick={testNotif}>Vyskúšať notifikáciu</button>
          </Row>

          <Row
            title="5 · Kalendár (.ics)"
            desc="Vygeneruje a stiahne kalendárový súbor a vypíše počet udalostí."
            result={out.ics}
          >
            <button className="rune-btn" onClick={testIcs}>Stiahnuť kalendár</button>
          </Row>
        </div>

        <footer className="footer">
          <a href={`./?preview=${encodeURIComponent(TOKEN)}`} style={{ color: 'var(--gold-soft)' }}>
            ← späť na náhľad hry
          </a>
        </footer>
      </main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Test />
  </React.StrictMode>,
)
