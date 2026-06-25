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

// stropy pre veľkosť data URL fotiek (base64 nafúkne bajty ~o tretinu)
const DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp);base64,/
const MAX_THUMB_CHARS = 400_000 // ~300 KB náhľad do KV
// ~2,85 MB plná fotka do e-mailu. Vyššie sa ísť nedá: telo požiadavky na Verceli
// má strop ~4,5 MB a musí sa doň zmestiť aj náhľad (~0,3 MB) a réžia JSON-u.
const MAX_FULL_CHARS = 3_800_000

// Vyčistí data URL: zlý formát alebo priveľká fotka → '' (request tým nezhodíme).
function sanitizePhoto(v, max) {
  if (typeof v !== 'string' || !DATA_URL_RE.test(v)) return ''
  if (v.length > max) return ''
  return v
}

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
  // thumb = malý náhľad (uloží sa do KV), full = pekná fotka (príde do e-mailu)
  const thumb = sanitizePhoto(b?.photo, MAX_THUMB_CHARS)
  const full = sanitizePhoto(b?.photoFull, MAX_FULL_CHARS)

  // 1) ulož dôkaz (ak je KV nastavené) — do KV ide len malý náhľad
  let stored = false
  if (kvEnabled()) {
    try {
      await setProof(id, { text, photo: thumb, t: Date.now() })
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
      // do e-mailu prilož plnú fotku; ak nie je, aspoň náhľad
      const emailPhoto = full || thumb
      const m = emailPhoto && emailPhoto.match(/^data:(image\/[a-z]+);base64,(.*)$/)
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
