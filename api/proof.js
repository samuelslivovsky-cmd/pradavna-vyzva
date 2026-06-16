// =====================================================================
//  Zápis DÔKAZU k úlohe (quest). Volá HRA, keď Sehe odošle splnenú úlohu.
//  Uloží dôkaz do Vercel KV a pošle organizátorovi e-mail (s fotkou ako
//  prílohou cez cid). Bez tokenu (ako /api/attempt) — pre zábavnú hru stačí.
//
//  Telo: { id, title, text, photo }  (photo = 'data:image/jpeg;base64,...')
// =====================================================================
import nodemailer from 'nodemailer'
import { kvEnabled, setProof } from '../lib/kv.js'
import { proofEmail } from '../lib/email.js'

// strop pre veľkosť data URL fotky (base64 nafúkne bajty ~o tretinu)
const MAX_PHOTO_CHARS = 220_000 // ~160 KB obrázok

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method not allowed' })
  }

  let b = req.body
  if (typeof b === 'string') {
    try {
      b = JSON.parse(b)
    } catch {
      b = {}
    }
  }
  const { id, title } = b || {}
  if (id == null) {
    return res.status(200).json({ ok: false, reason: 'chýba id' })
  }

  const text = String(b?.text ?? '').slice(0, 1000)
  let photo = typeof b?.photo === 'string' ? b.photo : ''
  if (photo && !/^data:image\/(jpeg|jpg|png|webp);base64,/.test(photo)) {
    photo = '' // neznámy formát — radšej zahodíme
  }
  if (photo.length > MAX_PHOTO_CHARS) {
    return res.status(200).json({ ok: false, reason: 'fotka je príliš veľká' })
  }

  // 1) ulož dôkaz (ak je KV nastavené)
  let stored = false
  if (kvEnabled()) {
    try {
      await setProof(id, { text, photo, t: Date.now() })
      stored = true
    } catch {
      /* uloženie zlyhalo — skúsime aspoň poslať e-mail */
    }
  }

  // 2) pošli organizátorovi e-mail (uloženie tým nezhodíme)
  let emailed = false
  const to = process.env.ADMIN_TO || process.env.SMTP_USER
  if (to && process.env.SMTP_HOST) {
    try {
      const port = Number(process.env.SMTP_PORT || 465)
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })

      const attachments = []
      const m = photo && photo.match(/^data:(image\/[a-z]+);base64,(.*)$/)
      if (m) {
        attachments.push({ filename: 'dokaz.jpg', content: m[2], encoding: 'base64', cid: 'proof' })
      }

      const msg = proofEmail({ title, text, hasPhoto: Boolean(m) })
      await transporter.sendMail({
        from: process.env.NOTIFY_FROM || process.env.SMTP_USER,
        to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        attachments,
      })
      emailed = true
    } catch {
      /* SMTP nedostupné — nevadí, dôkaz je uložený */
    }
  }

  return res.status(200).json({ ok: true, stored, emailed })
}
