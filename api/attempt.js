// =====================================================================
//  Zápis pokusu Sehe-ho (volá HRA pri každom hádaní). WRITE.
//  Ukladá do Vercel KV. Bez tokenu (ako /api/solved) — pre zábavnú hru stačí.
// =====================================================================
import { kvEnabled, pushAttempt } from '../lib/kv.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method not allowed' })
  }
  if (!kvEnabled()) {
    return res.status(200).json({ ok: false, reason: 'KV nie je nastavené' })
  }

  let b = req.body
  if (typeof b === 'string') {
    try {
      b = JSON.parse(b)
    } catch {
      b = {}
    }
  }
  const { id, value, correct, revealed } = b || {}
  if (id == null) {
    return res.status(200).json({ ok: false, reason: 'chýba id' })
  }

  try {
    await pushAttempt(id, {
      value: String(value ?? '').slice(0, 120),
      correct: Boolean(correct),
      revealed: Boolean(revealed),
      t: Date.now(),
    })
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) })
  }
}
