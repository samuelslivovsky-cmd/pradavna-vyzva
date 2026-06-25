// =====================================================================
//  Zápis/úprava DÔKAZU organizátorom (z preview stránky /attempts.html).
//  Slúži na to, aby organizátor doplnil fotku/text za Seheho — napr. keď
//  mu fotku poslal cez Messenger, lebo bola priveľká na automatický e-mail.
//
//  Chránené tokenom (?token= alebo v tele) = VITE_PREVIEW_TOKEN / CRON_SECRET.
//  Telo (POST JSON): { id, text, photo }  (photo = 'data:image/...;base64,...')
// =====================================================================
import { kvEnabled, setProof } from '../lib/kv.js'

const DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp);base64,/
// strop pod limitom Upstash REST (~1 MB na požiadavku) — fotku zmenší klient
const MAX_PHOTO_CHARS = 900_000 // ~675 KB obrázok

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

  const token = req.query?.token || b?.token
  if (!(token && (token === process.env.VITE_PREVIEW_TOKEN || token === process.env.CRON_SECRET))) {
    return res.status(401).json({ ok: false, error: 'neplatný token' })
  }
  if (!kvEnabled()) {
    return res.status(200).json({ ok: false, error: 'Vercel KV nie je nastavené' })
  }

  const { id } = b || {}
  if (id == null || id === '') {
    return res.status(200).json({ ok: false, error: 'chýba id' })
  }

  const text = String(b?.text ?? '').slice(0, 1000)
  let photo = typeof b?.photo === 'string' ? b.photo : ''
  if (photo && !DATA_URL_RE.test(photo)) {
    photo = '' // neznámy formát — radšej zahodíme
  }
  if (photo.length > MAX_PHOTO_CHARS) {
    return res.status(200).json({ ok: false, error: 'fotka je príliš veľká (skús menšiu)' })
  }
  if (!text && !photo) {
    return res.status(200).json({ ok: false, error: 'prázdny dôkaz (treba text alebo fotku)' })
  }

  try {
    await setProof(id, { text, photo, t: Date.now(), byOrganizer: true })
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) })
  }
}
