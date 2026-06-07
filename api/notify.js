// =====================================================================
//  Vercel serverless funkcia + Cron — denné e-mailové upozornenie.
//  Spúšťa ju Vercel cron (viď vercel.json) raz denne. V deň odomknutia
//  pečate (alebo odchodu/konca) pošle Sehe-mu mystický e-mail.
//  V iné dni nepošle nič.
//
//  Premenné prostredia: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
//  NOTIFY_TO, NOTIFY_FROM (voliteľné), CRON_SECRET.
// =====================================================================
import nodemailer from 'nodemailer'
import { EVENT, HINTS } from '../src/data.js'
import { sigilEmail, departureEmail, endEmail } from '../lib/email.js'

// Dnešný dátum v slovenskom čase ako 'YYYY-MM-DD'
function todayISO() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bratislava',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(new Date())
}

function buildMessage(today) {
  const url = EVENT.url || ''
  const hint = HINTS.find((h) => h.reveal === today)
  if (hint) return sigilEmail(hint, url)
  if (EVENT.departure === today) return departureEmail(url)
  if (EVENT.end === today) return endEmail()
  return null
}

export default async function handler(req, res) {
  // Ochrana: prijmi len volanie so správnym tajomstvom (Vercel cron ho pridá).
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.authorization || ''
    const provided = auth.startsWith('Bearer ') ? auth.slice(7) : req.query?.key
    if (provided !== secret) {
      return res.status(401).json({ error: 'unauthorized' })
    }
  }

  const today = todayISO()
  // ?force=1 → vynúti odoslanie ukážky (1. pečať) hocikedy, na overenie cronu
  const msg = req.query?.force ? sigilEmail(HINTS[0]) : buildMessage(today)
  if (!msg) {
    return res.status(200).json({ ok: true, sent: false, today })
  }

  try {
    const port = Number(process.env.SMTP_PORT || 465)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })

    await transporter.sendMail({
      from: process.env.NOTIFY_FROM || process.env.SMTP_USER,
      to: process.env.NOTIFY_TO,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    })

    return res.status(200).json({ ok: true, sent: true, today, subject: msg.subject })
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) })
  }
}
