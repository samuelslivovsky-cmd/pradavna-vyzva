// =====================================================================
//  Manuálne odoslanie e-mailu „Padla nová pečať" pre vybranú pečať.
//  Voláš ho ručne (napr. z prehliadača), keď chceš upozornenie poslať sám,
//  bez čakania na denný cron.
//
//  Použitie (GET aj POST):
//    ?token=<VITE_PREVIEW_TOKEN alebo CRON_SECRET>   (povinné)
//    &id=20            → konkrétna pečať podľa id
//    &reveal=2026-06-21→ pečať podľa dátumu odomknutia
//    (ak nič z toho, vezme sa pečať, ktorej reveal == dnešok)
//    &to=...           → prepíše príjemcu (inak NOTIFY_TO → ADMIN_TO → SMTP_USER)
//    &list=1           → len vráti zoznam pečatí (id, title, reveal), nič nepošle
//
//  Premenné prostredia: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
//    NOTIFY_TO, NOTIFY_FROM (voliteľné), VITE_PREVIEW_TOKEN / CRON_SECRET.
// =====================================================================
import nodemailer from 'nodemailer'
import { EVENT, HINTS } from '../src/data.js'
import { sigilEmail } from '../lib/email.js'

function authorized(req) {
  const provided = req.query?.token
  return Boolean(
    provided &&
      (provided === process.env.VITE_PREVIEW_TOKEN || provided === process.env.CRON_SECRET),
  )
}

// Dnešný dátum v slovenskom čase ako 'YYYY-MM-DD'
function todayISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bratislava',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function pickHint(q) {
  if (q?.id != null && q.id !== '') {
    return HINTS.find((h) => String(h.id) === String(q.id))
  }
  if (q?.reveal) {
    return HINTS.find((h) => h.reveal === q.reveal)
  }
  return HINTS.find((h) => h.reveal === todayISO())
}

export default async function handler(req, res) {
  if (!authorized(req)) {
    return res.status(401).json({ ok: false, error: 'neplatný token' })
  }

  // ?list=1 → prehľad pečatí na výber
  if (req.query?.list) {
    return res.status(200).json({
      ok: true,
      hints: HINTS.map((h) => ({ id: h.id, title: h.title, reveal: h.reveal, type: h.type || 'riddle' })),
    })
  }

  const hint = pickHint(req.query)
  if (!hint) {
    return res.status(200).json({
      ok: false,
      error: 'pečať sa nenašla (skús ?id=, ?reveal= alebo ?list=1)',
      today: todayISO(),
    })
  }

  const to = req.query?.to || process.env.NOTIFY_TO || process.env.ADMIN_TO || process.env.SMTP_USER
  if (!to) {
    return res.status(200).json({ ok: false, error: 'chýba príjemca (NOTIFY_TO/ADMIN_TO/SMTP_USER)' })
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(200).json({ ok: false, error: 'chýba SMTP konfigurácia' })
  }

  try {
    const port = Number(process.env.SMTP_PORT || 465)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })

    const msg = sigilEmail(hint, EVENT.url || '')
    await transporter.sendMail({
      from: process.env.NOTIFY_FROM || process.env.SMTP_USER,
      to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    })

    return res.status(200).json({
      ok: true,
      sentTo: to,
      hint: { id: hint.id, title: hint.title, reveal: hint.reveal },
    })
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) })
  }
}
