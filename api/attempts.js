// =====================================================================
//  Čítanie pokusov pre preview stránku (/attempts.html). READ-ONLY.
//  Chránené tokenom (?token=<VITE_PREVIEW_TOKEN alebo CRON_SECRET>).
//  Nič nezapisuje.
// =====================================================================
import { kvEnabled, getAllAttempts, getAllProofs } from '../lib/kv.js'
import { HINTS } from '../src/data.js'

function authorized(req) {
  const t = req.query?.token
  return Boolean(t && (t === process.env.VITE_PREVIEW_TOKEN || t === process.env.CRON_SECRET))
}

export default async function handler(req, res) {
  if (!authorized(req)) {
    return res.status(401).json({ ok: false, error: 'neplatný token' })
  }
  if (!kvEnabled()) {
    return res.status(200).json({ ok: true, kv: false, attempts: {} })
  }
  try {
    const attempts = await getAllAttempts(HINTS.filter((h) => h.type !== 'quest').map((h) => h.id))
    const proofs = await getAllProofs(HINTS.filter((h) => h.type === 'quest').map((h) => h.id))
    return res.status(200).json({ ok: true, kv: true, attempts, proofs })
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) })
  }
}
