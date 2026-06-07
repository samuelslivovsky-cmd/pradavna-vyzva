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

// adresa webu bez koncového lomítka (pre fotku a tlačidlo)
const SITE = (EVENT.url || '').replace(/\/+$/, '')

function dm(str) {
  const [, m, d] = str.split('-')
  return `${Number(d)}.${Number(m)}.`
}

// Univerzálny pekný e-mail (tabuľkový layout kvôli kompatibilite klientov).
// Vyšší vzhľad kvôli telefónu (väčšie odsadenia a rozostupy).
export function renderEmail({ eyebrow, title, lines = [], list = [], cta, photo }) {
  const photoHtml =
    photo && SITE
      ? `<div style="margin:6px 0 26px;"><img src="${SITE}/shehe.jpg" alt="Shehe" width="128" height="128" style="width:128px;height:128px;border-radius:64px;object-fit:cover;border:3px solid ${C.gold};display:inline-block;" /></div>`
      : ''

  const body = lines
    .map(
      (l) =>
        `<p style="margin:0 0 16px;color:${C.text};font-size:16px;line-height:1.8;">${l}</p>`,
    )
    .join('')

  const listHtml = list.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px auto 4px;text-align:left;">${list
        .map(
          (it) =>
            `<tr><td style="color:${C.gold};padding:4px 10px 4px 0;vertical-align:top;">✦</td><td style="color:${C.text};font-size:15px;line-height:1.9;padding:4px 0;">${it}</td></tr>`,
        )
        .join('')}</table>`
    : ''

  const ctaHtml = cta
    ? `<div style="margin-top:34px;"><a href="${cta.url}" style="display:inline-block;padding:15px 30px;background-color:${C.gold};color:#1a1426;text-decoration:none;border-radius:999px;font-weight:bold;letter-spacing:1px;font-size:16px;font-family:Georgia,serif;">${cta.label}</a></div>`
    : ''

  return `<!doctype html><html lang="sk"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<style>
  :root { color-scheme: dark; supported-color-schemes: dark; }
  body { margin:0; padding:0; background-color:${C.bg}; }
  a { color:${C.gold}; }
</style>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="background-color:${C.bg};">
<tr><td align="center" bgcolor="${C.bg}" style="background-color:${C.bg};padding:48px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">
<tr><td bgcolor="${C.card}" style="background-color:${C.card};border:1px solid ${C.border};border-radius:18px;padding:52px 30px;text-align:center;font-family:Georgia,'Times New Roman',serif;color:${C.text};">
<div style="font-size:46px;color:${C.gold};line-height:1;">&#9790;</div>
<div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>
${photoHtml}
<div style="letter-spacing:3px;text-transform:uppercase;font-size:12px;color:${C.goldDim};margin:0 0 16px;">${eyebrow}</div>
<h1 style="margin:0 0 24px;color:${C.gold};font-size:25px;font-weight:bold;line-height:1.3;">${title}</h1>
${body}
${listHtml}
${ctaHtml}
<div style="height:36px;line-height:36px;font-size:0;">&nbsp;</div>
<div style="color:${C.dim};letter-spacing:4px;font-size:13px;">&#10022; &#9790; &#10022;</div>
</td></tr></table>
</td></tr></table>
</body></html>`
}

function openCta() {
  return SITE ? { url: SITE, label: 'Otvoriť Pradávnu výzvu ☾' } : undefined
}

// --- konkrétne e-maily -------------------------------------------------
export function sigilEmail(hint) {
  return {
    subject: '☾ Padla nová pečať, Shehe',
    text: `${hint.title}\n\nNová pečať čaká, Shehe. Otvor Pradávnu výzvu a odhaľ, čo ti šepká.${SITE ? `\n\n${SITE}` : ''}`,
    html: renderEmail({
      eyebrow: 'Padla nová pečať',
      title: hint.title,
      photo: true,
      lines: [
        'Nová pečať čaká, <strong>Shehe</strong>.',
        'Otvor Pradávnu výzvu a odhaľ, čo ti šepká.',
      ],
      cta: openCta(),
    }),
  }
}

export function departureEmail() {
  return {
    subject: '🎒 Dnes sa vyráža, Shehe',
    text: `Dobrodružstvo začína. Dúfam, že máš zbalené to správne…${SITE ? `\n\n${SITE}` : ''}`,
    html: renderEmail({
      eyebrow: 'Deň D',
      title: 'Dobrodružstvo začína',
      photo: true,
      lines: ['Dnes sa vyráža, <strong>Shehe</strong>.', 'Dúfam, že máš zbalené to správne…'],
      cta: openCta(),
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
      photo: true,
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

export function introEmail() {
  return {
    subject: '☾ Bol si vyvolený, Shehe',
    text:
      `Vyvolený menom Shehe,\n\n` +
      `stará výzva sa prebudila a vybrala si teba. Od ${dm(HINTS[0].reveal)} bude každý ` +
      `druhý deň padať jedna pečať s hádankou. Rozlúšti, čo si máš zbaliť na cestu — no ` +
      `maj sa na pozore, niektoré pečate ťa majú len zmiasť.\n\n` +
      `Keď padne posledná, ${dm(EVENT.departure)} sa vyráža a ${dm(EVENT.end)} sa všetko ` +
      `končí.\n\nSleduj znamenia. ☾${SITE ? `\n\n${SITE}` : ''}`,
    html: renderEmail({
      eyebrow: 'Pradávna výzva sa prebúdza',
      title: 'Bol si vyvolený, Shehe',
      photo: true,
      lines: [
        'Stará výzva sa prebudila a vybrala si <strong>teba</strong>.',
        `Od <strong>${dm(HINTS[0].reveal)}</strong> bude každý druhý deň padať jedna pečať s hádankou.`,
        'Rozlúšti, čo si máš zbaliť na cestu — no maj sa na pozore, niektoré pečate ťa majú len <em>zmiasť</em>.',
        `Keď padne posledná, <strong>${dm(EVENT.departure)}</strong> sa vyráža a <strong>${dm(EVENT.end)}</strong> sa všetko končí.`,
        'Sleduj znamenia. ☾',
      ],
      cta: openCta(),
    }),
  }
}
