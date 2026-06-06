// =====================================================================
//  Spoločné HTML šablóny e-mailov (mystický dizajn).
//  Používa ich api/notify.js, api/solved.js aj api/test-email.js.
//  Bez závislostí (žiadny nodemailer) — len skladá reťazce.
// =====================================================================
import { EVENT, HINTS } from '../src/data.js'

const C = {
  bg: '#0a0810',
  card: '#140f24',
  gold: '#e7c57e',
  goldDim: '#b89653',
  text: '#d6cfe2',
  dim: '#6f6885',
  border: '#3a2e1a',
}

function dm(str) {
  const [, m, d] = str.split('-')
  return `${Number(d)}.${Number(m)}.`
}

// Univerzálny pekný e-mail (tabuľkový layout kvôli kompatibilite klientov).
export function renderEmail({ eyebrow, title, lines = [], list = [], cta }) {
  const body = lines
    .map(
      (l) =>
        `<p style="margin:0 0 12px;color:${C.text};font-size:16px;line-height:1.7;">${l}</p>`,
    )
    .join('')

  const listHtml = list.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px auto 0;text-align:left;">${list
        .map(
          (it) =>
            `<tr><td style="color:${C.gold};padding:2px 10px 2px 0;vertical-align:top;">✦</td><td style="color:${C.text};font-size:15px;line-height:1.8;padding:2px 0;">${it}</td></tr>`,
        )
        .join('')}</table>`
    : ''

  const ctaHtml = cta
    ? `<a href="${cta.url}" style="display:inline-block;margin-top:26px;padding:13px 26px;background:${C.gold};color:#1a1426;text-decoration:none;border-radius:999px;font-weight:bold;letter-spacing:1px;font-family:Georgia,serif;">${cta.label}</a>`
    : ''

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
<tr><td align="center" style="padding:32px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="background:${C.card};border:1px solid ${C.border};border-radius:16px;padding:40px 30px;text-align:center;font-family:Georgia,'Times New Roman',serif;">
<div style="font-size:44px;color:${C.gold};line-height:1;">&#9790;</div>
<div style="letter-spacing:3px;text-transform:uppercase;font-size:12px;color:${C.goldDim};margin:12px 0 14px;">${eyebrow}</div>
<h1 style="margin:0 0 18px;color:${C.gold};font-size:24px;font-weight:bold;">${title}</h1>
${body}
${listHtml}
${ctaHtml}
<div style="margin-top:30px;color:${C.dim};letter-spacing:4px;font-size:13px;">&#10022; &#9790; &#10022;</div>
</td></tr></table>
</td></tr></table>
</body></html>`
}

function cta(url) {
  return url ? { url, label: 'Otvoriť výzvu →' } : undefined
}

// --- konkrétne e-maily -------------------------------------------------
export function sigilEmail(hint, url) {
  return {
    subject: '☾ Padla nová pečať, Shehe',
    text: `${hint.title}\n\nNová pečať čaká, Shehe. Otvor Pradávnu výzvu a odhaľ, čo ti šepká.${url ? `\n\n${url}` : ''}`,
    html: renderEmail({
      eyebrow: 'Padla nová pečať',
      title: hint.title,
      lines: [
        'Nová pečať čaká, <strong>Shehe</strong>.',
        'Otvor Pradávnu výzvu a odhaľ, čo ti šepká.',
      ],
      cta: cta(url),
    }),
  }
}

export function departureEmail(url) {
  return {
    subject: '🎒 Dnes sa vyráža, Shehe',
    text: `Dobrodružstvo začína. Dúfam, že máš zbalené to správne…${url ? `\n\n${url}` : ''}`,
    html: renderEmail({
      eyebrow: 'Deň D',
      title: 'Dobrodružstvo začína',
      lines: ['Dnes sa vyráža, <strong>Shehe</strong>.', 'Dúfam, že máš zbalené to správne…'],
      cta: cta(url),
    }),
  }
}

export function endEmail() {
  return {
    subject: '🏁 Koniec dobrodružstva',
    text: 'Posledný deň výpravy. ☾',
    html: renderEmail({
      eyebrow: 'Koniec',
      title: 'Koniec dobrodružstva',
      lines: ['Posledný deň výpravy.', 'Bolo to dobrodružstvo. ☾'],
    }),
  }
}

export function solvedEmail({ id, title, answer, attempts }) {
  const pokus = attempts ? `${attempts}. pokus` : 'neznámy pokus'
  return {
    subject: `✅ Shehe uhádol — ${answer ?? ''}`,
    text: `Shehe správne vyplnil pečať.\n\nPečať: ${title}\nOdpoveď: ${answer}\nUhádol na: ${pokus}`,
    html: renderEmail({
      eyebrow: 'Shehe uhádol pečať',
      title: title ?? 'Pečať',
      lines: [`Odpoveď: <strong>${answer ?? '?'}</strong>`, `Uhádol na: <strong>${pokus}</strong>`],
    }),
  }
}

export function introEmail(url) {
  return {
    subject: '☾ Bol si vyvolený, Shehe',
    text:
      `Vyvolený menom Shehe,\n\n` +
      `stará výzva sa prebudila a vybrala si teba. Od ${dm(HINTS[0].reveal)} bude každý ` +
      `druhý deň padať jedna pečať s hádankou. Rozlúšti, čo si máš zbaliť na cestu — no ` +
      `maj sa na pozore, niektoré pečate ťa majú len zmiasť.\n\n` +
      `Keď padne posledná, ${dm(EVENT.departure)} sa vyráža a ${dm(EVENT.end)} sa všetko ` +
      `končí.\n\nSleduj znamenia. ☾${url ? `\n\n${url}` : ''}`,
    html: renderEmail({
      eyebrow: 'Pradávna výzva sa prebúdza',
      title: 'Bol si vyvolený, Shehe',
      lines: [
        'Stará výzva sa prebudila a vybrala si <strong>teba</strong>.',
        `Od <strong>${dm(HINTS[0].reveal)}</strong> bude každý druhý deň padať jedna pečať s hádankou.`,
        'Rozlúšti, čo si máš zbaliť na cestu — no maj sa na pozore, niektoré pečate ťa majú len <em>zmiasť</em>.',
        `Keď padne posledná, <strong>${dm(EVENT.departure)}</strong> sa vyráža a <strong>${dm(EVENT.end)}</strong> sa všetko končí.`,
        'Sleduj znamenia. ☾',
      ],
      cta: cta(url),
    }),
  }
}
