// =====================================================================
//  Generovanie .ics kalendára — pripomienky pre Sehe.
//  Po pridaní do telefónu mu kalendár sám pripomenie každý deň odomknutia
//  (funguje aj keď je stránka zatvorená, bez servera).
// =====================================================================
import { EVENT, HINTS } from './data.js'

function pad(n) {
  return String(n).padStart(2, '0')
}

// '2026-06-08' -> '20260608T080000' (lokálny čas, ráno o 8:00)
function toICSDateTime(dateStr, hour = 8) {
  const [y, m, d] = dateStr.split('-')
  return `${y}${m}${d}T${pad(hour)}0000`
}

// '2026-06-08' -> '20260608' (celodenná udalosť)
function toICSDate(dateStr) {
  return dateStr.replaceAll('-', '')
}

function escapeICS(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function fold(line) {
  // RFC 5545: riadky max 75 oktetov, pokračovanie odsadené medzerou
  if (line.length <= 73) return line
  const out = []
  let s = line
  while (s.length > 73) {
    out.push(s.slice(0, 73))
    s = ' ' + s.slice(73)
  }
  out.push(s)
  return out.join('\r\n')
}

function event({ uid, date, allDay, summary, description }) {
  const lines = ['BEGIN:VEVENT', `UID:${uid}@sehe`, 'DTSTAMP:20260101T000000Z']
  if (allDay) {
    lines.push(`DTSTART;VALUE=DATE:${toICSDate(date)}`)
  } else {
    lines.push(`DTSTART:${toICSDateTime(date)}`)
    lines.push('DURATION:PT30M')
  }
  lines.push(`SUMMARY:${escapeICS(summary)}`)
  if (description) lines.push(`DESCRIPTION:${escapeICS(description)}`)
  // pripomienka v čase udalosti
  lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Pradávna výzva', 'TRIGGER:PT0S', 'END:VALARM')
  lines.push('END:VEVENT')
  return lines.map(fold).join('\r\n')
}

export function buildICS() {
  const link = EVENT.url ? `\nOtvor: ${EVENT.url}` : ''

  const events = HINTS.map((h) =>
    event({
      uid: `sigil-${h.id}`,
      date: h.reveal,
      allDay: false,
      summary: `🔮 ${h.title}`,
      description: `Padla nová pečať, Sehe. Otvor výzvu a odhaľ, čo ti šepká.${link}`,
    }),
  )

  events.push(
    event({
      uid: 'odchod',
      date: EVENT.departure,
      allDay: true,
      summary: '🎒 Odchod — dobrodružstvo začína',
      description: 'Dnes sa vyráža. Dúfam, že máš zbalené to správne…',
    }),
    event({
      uid: 'koniec',
      date: EVENT.end,
      allDay: true,
      summary: '🏁 Koniec dobrodružstva',
      description: 'Posledný deň výpravy.',
    }),
  )

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sehe//Pradavna vyzva//SK',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Pradávna výzva — Sehe',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadICS() {
  const blob = new Blob([buildICS()], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'pradavna-vyzva-sehe.ics'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
