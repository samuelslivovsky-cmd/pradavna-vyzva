// =====================================================================
//  Vercel serverless funkcia + Cron — denné e-mailové upozornenie.
//  Spúšťa ju Vercel cron (viď vercel.json) raz denne. V deň odomknutia
//  pečate (alebo odchodu/konca) pošle Shehe-mu mystický e-mail.
//  V iné dni nepošle nič.
//
//  Potrebné premenné prostredia (Vercel → Project → Settings → Environment):
//    SMTP_HOST   napr. smtp.gmail.com
//    SMTP_PORT   napr. 465
//    SMTP_USER   tvoj odosielací e-mail
//    SMTP_PASS   app-heslo (Gmail: "App password", nie bežné heslo!)
//    NOTIFY_TO   e-mail Shehe-ho
//    NOTIFY_FROM (voliteľné) "Pradávna výzva <ty@gmail.com>"
//    CRON_SECRET (Vercel ho pri cron volaní pošle ako Bearer token)
// =====================================================================
import nodemailer from 'nodemailer'
import { EVENT, HINTS } from '../src/data.js'

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
  const link = EVENT.url || ''
  const linkLine = link ? `\n\n${link}` : ''
  const linkHtml = link
    ? `<p style="margin-top:24px"><a href="${link}" style="color:#d9b56b">Otvoriť Pradávnu výzvu →</a></p>`
    : ''

  const hint = HINTS.find((h) => h.reveal === today)
  if (hint) {
    return {
      subject: '☾ Padla nová pečať, Shehe',
      text: `${hint.title}\n\nNová pečať čaká. Otvor Pradávnu výzvu a odhaľ, čo ti šepká.${linkLine}`,
      html: emailHtml('Padla nová pečať ☾', hint.title, 'Otvor výzvu a odhaľ, čo ti šepká.', linkHtml),
    }
  }
  if (EVENT.departure === today) {
    return {
      subject: '🎒 Dnes sa vyráža, Shehe',
      text: `Dobrodružstvo začína. Dúfam, že máš zbalené to správne…${linkLine}`,
      html: emailHtml('Dobrodružstvo začína 🎒', 'Dnes sa vyráža', 'Dúfam, že máš zbalené to správne…', linkHtml),
    }
  }
  if (EVENT.end === today) {
    return {
      subject: '🏁 Koniec dobrodružstva',
      text: 'Posledný deň výpravy. ☾',
      html: emailHtml('Koniec dobrodružstva 🏁', 'Posledný deň výpravy', 'Bolo to dobrodružstvo.', ''),
    }
  }
  return null
}

function emailHtml(eyebrow, title, body, linkHtml) {
  return `<!doctype html><html><body style="margin:0;background:#0a0810;padding:40px 16px;font-family:Georgia,serif">
    <div style="max-width:480px;margin:0 auto;background:linear-gradient(180deg,#140f24,#0a0810);border:1px solid rgba(217,181,107,.3);border-radius:14px;padding:32px;text-align:center;color:#e8e2d4">
      <div style="font-size:34px;color:#d9b56b">☾</div>
      <p style="letter-spacing:.2em;text-transform:uppercase;font-size:12px;color:#b89653;margin:8px 0 16px">${eyebrow}</p>
      <h1 style="color:#d9b56b;font-size:22px;margin:0 0 12px">${title}</h1>
      <p style="color:#9b93a8;font-size:16px;line-height:1.6;margin:0">${body}</p>
      ${linkHtml}
    </div>
  </body></html>`
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
  const msg = buildMessage(today)
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
