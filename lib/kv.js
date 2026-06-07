// =====================================================================
//  Jednoduchý klient pre Vercel KV (Upstash Redis) cez REST.
//  Bez závislostí — len fetch. Ak KV nie je nastavené, kvEnabled() = false
//  a funkcie sa správajú ako no-op (appka funguje ďalej, len sa nič nezapíše).
//
//  Vercel KV automaticky pridá env premenné:
//    KV_REST_API_URL, KV_REST_API_TOKEN
// =====================================================================
const BASE = process.env.KV_REST_API_URL
const TOKEN = process.env.KV_REST_API_TOKEN

export function kvEnabled() {
  return Boolean(BASE && TOKEN)
}

async function single(args) {
  const r = await fetch(BASE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  const j = await r.json()
  if (j.error) throw new Error(j.error)
  return j.result
}

async function pipeline(cmds) {
  const r = await fetch(`${BASE}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  })
  const j = await r.json()
  if (j.error) throw new Error(j.error)
  return j // pole { result }
}

// Pridá pokus k danej pečati (a obmedzí históriu na posledných 500).
export async function pushAttempt(id, obj) {
  const key = `att:${id}`
  await single(['RPUSH', key, JSON.stringify(obj)])
  await single(['LTRIM', key, '-500', '-1'])
}

// Načíta pokusy pre všetky pečate naraz (jeden round-trip cez pipeline).
export async function getAllAttempts(ids) {
  const cmds = ids.map((id) => ['LRANGE', `att:${id}`, '0', '-1'])
  const res = await pipeline(cmds)
  const out = {}
  ids.forEach((id, i) => {
    const arr = (res[i] && res[i].result) || []
    out[id] = arr.map((s) => {
      try {
        return JSON.parse(s)
      } catch {
        return { value: s }
      }
    })
  })
  return out
}
