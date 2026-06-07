// =====================================================================
//  Diagnostický endpoint pre testovaciu stránku (/test.html).
//   - ?check=1       → vráti, ktoré premenné prostredia sú nastavené
//   - ?type=reminder → ukážka pripomienky pečate (1. pečať)
//   - ?type=intro    → ukážka úvodného mailu
//   - ?type=solved   → ukážka hlásenia „Sehe uhádol"
//   - inak           → jednoduchý testovací e-mail (overenie SMTP)
//  Posiela na ADMIN_TO (alebo ?to=...). Chránené ?token=<VITE_PREVIEW_TOKEN
//  alebo CRON_SECRET>.
// =====================================================================
import nodemailer from 'nodemailer'
import { EVENT, HINTS } from '../src/data.js'
import { renderEmail, sigilEmail, introEmail, solvedEmail } from '../lib/email.js'

function authorized(req) {
  const provided = req.query?.token
  const a = process.env.VITE_PREVIEW_TOKEN
  const b = process.env.CRON_SECRET
  return Boolean(provided && (provided === a || provided === b))
}

function buildPreview(type) {
  const url = EVENT.url || ''
  if (type === 'reminder') return sigilEmail(HINTS[0], url)
  if (type === 'intro') return introEmail(url)
  if (type === 'solved') {
    return solvedEmail({ id: 0, title: 'TEST pečať', answer: 'Testovacia odpoveď', attempts: 1 })
  }
  return {
    subject: '🧪 Test — Pradávna výzva',
    text: 'Toto je testovací e-mail z diagnostickej stránky. Ak ho čítaš, SMTP funguje. ☾',
    html: renderEmail({
      eyebrow: 'Test',
      title: 'SMTP funguje ☾',
      lines: ['Toto je testovací e-mail z diagnostickej stránky.', 'Ak ho čítaš, odosielanie funguje.'],
    }),
  }
}

export default async function handler(req, res) {
  if (!authorized(req)) {
    return res.status(401).json({ ok: false, error: 'neplatný token' })
  }

  const config = {
    SMTP_HOST: Boolean(process.env.SMTP_HOST),
    SMTP_PORT: process.env.SMTP_PORT || '(predvolene 465)',
    SMTP_USER: Boolean(process.env.SMTP_USER),
    SMTP_PASS: Boolean(process.env.SMTP_PASS),
    ADMIN_TO: Boolean(process.env.ADMIN_TO),
    NOTIFY_TO: Boolean(process.env.NOTIFY_TO),
    NOTIFY_FROM: Boolean(process.env.NOTIFY_FROM),
    CRON_SECRET: Boolean(process.env.CRON_SECRET),
    VITE_PREVIEW_TOKEN: Boolean(process.env.VITE_PREVIEW_TOKEN),
  }

  if (req.query?.check) {
    return res.status(200).json({ ok: true, config })
  }

  const to = req.query?.to || process.env.ADMIN_TO || process.env.SMTP_USER
  if (!to) {
    return res.status(200).json({ ok: false, error: 'chýba ADMIN_TO/SMTP_USER', config })
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(200).json({ ok: false, error: 'chýba SMTP konfigurácia', config })
  }

  try {
    const port = Number(process.env.SMTP_PORT || 465)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })

    const msg = buildPreview(req.query?.type)
    await transporter.sendMail({
      from: process.env.NOTIFY_FROM || process.env.SMTP_USER,
      to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    })
    return res.status(200).json({ ok: true, sentTo: to, type: req.query?.type || 'generic' })
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err), config })
  }
}
