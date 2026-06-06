// =====================================================================
//  Vercel serverless funkcia — pošle TEBE (organizátorovi) e-mail vždy,
//  keď Shehe správne uhádne nejakú pečať. Volá ju prehliadač pri správnej
//  odpovedi (každá pečať sa nahlási len raz).
//
//  Premenné prostredia (okrem SMTP_* ako v notify.js):
//    ADMIN_TO  e-mail, kam majú chodiť hlásenia (ak chýba, použije sa SMTP_USER)
// =====================================================================
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }
  const { id, title, answer, attempts } = body || {}

  const to = process.env.ADMIN_TO || process.env.SMTP_USER
  if (!to) {
    return res.status(200).json({ ok: false, reason: 'ADMIN_TO/SMTP_USER nie je nastavený' })
  }

  try {
    const port = Number(process.env.SMTP_PORT || 465)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })

    const pokus = attempts ? `${attempts}. pokus` : 'neznámy pokus'
    await transporter.sendMail({
      from: process.env.NOTIFY_FROM || process.env.SMTP_USER,
      to,
      subject: `✅ Shehe uhádol pečať ${id ?? '?'} — ${answer ?? ''}`,
      text:
        `Shehe práve správne vyplnil pečať.\n\n` +
        `Pečať: ${title ?? '?'}\n` +
        `Odpoveď: ${answer ?? '?'}\n` +
        `Uhádol na: ${pokus}`,
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) })
  }
}
