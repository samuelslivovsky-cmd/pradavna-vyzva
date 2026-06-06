# Pradávna výzva ☾ — rozlúčka so slobodou

One-page mystická hra. Každý pondelok sa odomkne nový hint / úloha pre budúceho ženícha.
Na úvode sú stále viditeľné dátumy odchodu (8.7.) a konca (12.7.).

## Spustenie (vývoj)

```bash
npm install
npm run dev
```

Otvor adresu, ktorú vypíše Vite (zvyčajne http://localhost:5173).

## Build (statický web)

```bash
npm run build      # vytvorí priečinok dist/
npm run preview    # lokálny náhľad buildu
```

Obsah priečinka `dist/` je hotový statický web — nahraj ho na **Netlify**, **Vercel**
alebo **GitHub Pages** (drag & drop priečinka stačí na Netlify Drop).

## Ako dopĺňať hinty

Všetok obsah je v `src/data.js`:

- `EVENT.departure` / `EVENT.end` — vždy viditeľné dátumy.
- pole `HINTS` — každý objekt = jeden pondelok:
  - `reveal` — dátum odomknutia (`'YYYY-MM-DD'`),
  - `title` — nadpis hintu,
  - `riddle` — text hádanky / úlohy (môže byť viacriadkový),
  - `note` — voliteľná poznámka (kurzívou).
- `answer` — správna odpoveď, ktorá sa zobrazí po uhádnutí / prezradení.
- `accept` — pole akceptovaných odpovedí. Píš ich **malými písmenami a bez
  diakritiky** (stránka si vstup sama normalizuje). Stačí kľúčové slovo —
  uzná sa aj veta, ktorá ho obsahuje (napr. `'sedak'` uzná „lezecky sedak").

Hinty s budúcim dátumom sa zobrazujú ako „Zapečatené" karty s odpočtom.

`MAX_ATTEMPTS` (v `data.js`) určuje, po koľkých nesprávnych pokusoch sa objaví
tlačidlo „Prezradiť odpoveď". Predvolene `5`.

## Časová os (2026) — 19 pečatí

Téma: **camping v Rakúsku + lezenie.** Pečate zámerne miešajú reálne potrebné
veci s nezmyslami (aby ženícha zmiatli). Pri každej pečati je v `data.js`
komentár `[REÁL]` / `[FALOŠ]` len pre organizátora — na stránke sa nezobrazuje.

| #    | Dátum | Vec (skrytá v hádanke) | |
|------|-------|------------------------|---|
| I    | 8.6.  | lezecký sedák          | REÁL |
| II   | 9.6.  | vajcia                 | REÁL |
| III  | 10.6. | žehlička               | faloš |
| IV   | 12.6. | pevná turistická obuv  | REÁL |
| V    | 13.6. | múka                   | REÁL |
| VI   | 14.6. | fľaša na vodu / hydratačný vak | REÁL |
| VII  | 16.6. | motýlik / oblek        | faloš |
| VIII | 18.6. | nepremok / pršiplášť   | REÁL |
| IX   | 19.6. | mlieko                 | REÁL |
| X    | 20.6. | nafukovací jednorožec  | faloš |
| XI   | 22.6. | čelovka                | REÁL |
| XII  | 24.6. | snowboard              | faloš |
| XIII | 26.6. | spacák                 | REÁL |
| XIV  | 27.6. | bryndza                | REÁL |
| XV   | 28.6. | kolieskové korčule     | faloš |
| XVI  | 30.6. | plyšový medveď         | faloš |
| XVII | 2.7.  | opaľovací krém + okuliare | REÁL |
| XVIII| 4.7.  | dáždnik                | faloš |
| XIX  | 6.7.  | powerbank + ODHALENIE  | REÁL |

Bryndza + múka + vajcia + mlieko = suroviny na **bryndzové halušky** (cryptické,
porozhadzované). Z lezeckého vybavenia je naznačený **len sedák** — žiadny náznak
ferrát (prilba/brzda → kamoši).

Odchod: **9.7.** · Koniec: **12.7.**

## Funkcie pre Shehe

- **Hádanie odpovede** — v každej odomknutej pečati je pole, kam Shehe napíše,
  o čo ide. Vstup sa normalizuje (malé písmená, bez diakritiky), uznáva synonymá.
  Po `WHISPER_AFTER` pokusoch sa ponúkne jemná **nápoveda („Šepot ducha")**,
  po `MAX_ATTEMPTS` tlačidlo „Prezradiť odpoveď". Stav si pamätá (`localStorage`).
- **Finálna odmena** — po vyriešení všetkých 19 hádaniek sa odomkne tajná správa,
  **konfety** a **pravý baliaci zoznam** (len reálne veci). Text v `FINALE` v `data.js`.
- **Ukazovateľ postupu** — „X z 19 hádaniek vyriešených · Y pečatí odhalených".
- **Veľký odpočet do odchodu** — dramatický časovač do 9.7.
- **Animácia lámania pečate** — pri novej pečati sa vosková pečať rozlomí.
- **Lietajúce uhlíky** v pozadí pre atmosféru.
- **Easter egg** — 7× klik na mesiac ☾.
- **PWA** — `manifest.webmanifest` + service worker → Shehe si môže pridať
  stránku „na plochu" telefónu a otvárať ako appku (funguje aj offline).
- **Náhľad pri zdieľaní** — OG/Twitter meta + `public/og.svg`, takže link na
  Messenger/WhatsApp ukáže pekný mystický náhľad.

> Pozn. k náhľadu: niektoré služby (najmä Facebook/Messenger) nemajú rady SVG
> OG obrázky. Ak chceš 100% istý náhľad s obrázkom, sprav z `public/og.svg`
> PNG (1200×630) a v `index.html` zmeň `og:image`/`twitter:image` na `./og.png`.
> Aj bez obrázka sa však zobrazí pekný názov + popis.

> Pozn. k PWA ikonám: používa sa SVG ikona. Na Androide pre plný „install"
> dialóg sa občas vyžaduje PNG (192/512 px) — „pridať na plochu" cez menu
> prehliadača funguje aj tak.
- **Odznak „Nová pečať"** — pri pečati, ktorá pribudla od poslednej návštevy
  (pamätá si to v `localStorage` prehliadača).
- **Pripomienky do kalendára (.ics)** — tlačidlo stiahne súbor so všetkými
  dátumami; po pridaní do telefónu pripomenie každý deň odomknutia aj odchod/koniec.
  Funguje offline, bez servera.
- **Browser upozornenia** — po povolení vyskočí notifikácia, keď je pri otvorení
  stránky nová pečať.

> Po nasadení vlož adresu webu do `EVENT.url` v `src/data.js` — pridá sa do
> kalendárových pripomienok ako odkaz na jedno ťuknutie.

## Režim náhľadu (kontrola obsahu)

Náhľad odomkne **všetky pečate naraz** (a pri každej ukáže dátum odomknutia).
Je **za tajným tokenom** v `.env` (`VITE_PREVIEW_TOKEN`), takže sa nedá uhádnuť:

```
http://localhost:5173/?preview=<TOKEN>
```

Token nájdeš/zmeníš v súbore `.env`. Nový vygeneruješ:
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

> Pri nasadení na Vercel pridaj rovnakú premennú `VITE_PREVIEW_TOKEN` do
> *Environment Variables* (inak náhľad na produkcii nepôjde).
> Pozn.: `VITE_` premenné sa vkladajú do klientskeho buildu — token teda nie je
> kryptograficky tajný, len zabraňuje náhodnému uhádnutiu `?preview`.

## Testovacia (diagnostická) stránka

Na overenie e-mailov, notifikácií a kalendára slúži samostatná stránka
[`test.html`](test.html). Otvor ju s tokenom:

```
http://localhost:5173/test.html?token=<TOKEN>     # lokálne (API testy idú až na Verceli)
https://tvoj-web.vercel.app/test.html?token=<TOKEN>
```

Obsahuje 7 testov:
1. **Konfigurácia SMTP** — vypíše, ktoré env premenné sú nastavené (bez hodnôt).
2. **Test e-mailu (SMTP)** — pošle jednoduchý testovací e-mail na `ADMIN_TO`.
3. **Ukážka: pripomienka pečate** — pošle ukážku e-mailu, ktorý Shehe dostane pri
   odomknutí pečate (nech vidíš dizajn).
4. **Ukážka: úvodný mail** — pošle ukážku úvodného (uvítacieho) e-mailu pre Shehe.
5. **Hlásenie „Shehe uhádol"** — spustí endpoint `/api/solved` so vzorovými dátami.
6. **Browser notifikácia** — vyžiada povolenie a vyskúša notifikáciu.
7. **Kalendár (.ics)** — vygeneruje a stiahne kalendár (overí počet udalostí).

> Body 1–5 (API) fungujú len po nasadení na Vercel alebo cez `vercel dev`.
> Body 6–7 fungujú aj v `npm run dev`. Stránka má `noindex` a je za tokenom.

### Poslať úvodný mail naozaj Shehe-mu
Ukážky chodia na `ADMIN_TO`. Keď chceš poslať úvodný mail priamo Shehe-mu,
zavolaj (po nasadení) s parametrom `to`:
```
https://tvoj-web.vercel.app/api/test-email?type=intro&to=scool36@gmail.com&token=<TOKEN>
```

## Dizajn e-mailov

Všetky e-maily (pripomienka pečate, odchod/koniec, hlásenie „Shehe uhádol",
úvodný mail) zdieľajú jednu mystickú HTML šablónu v [`lib/email.js`](lib/email.js)
(tmavé pozadie, zlaté akcenty, ☾). Texty ľahko upravíš tam.

## Nasadenie na Vercel (zadarmo)

1. Pushni priečinok na GitHub.
2. Na vercel.com → *Add New Project* → vyber repo.
3. Framework preset **Vite** sa zdetekuje sám (build `npm run build`, output `dist`).
   Nič netreba meniť. Hotovo.

Alebo bez GitHubu: `npm i -g vercel` a v priečinku spusti `vercel`.

## E-mailové upozornenia (Vercel Cron)

Funkcia [`api/notify.js`](api/notify.js) sa spúšťa **raz denne** (cron v
[`vercel.json`](vercel.json), 06:00 UTC = 08:00 SELČ). V deň odomknutia pečate
(alebo odchodu/konca) pošle Shehe-mu mystický e-mail; inak nepošle nič.

### 1. Nastav premenné prostredia na Verceli
Vercel → projekt → **Settings → Environment Variables**:

| Premenná | Hodnota |
|----------|---------|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | tvoj odosielací e-mail |
| `SMTP_PASS` | **App password** (nie bežné heslo) |
| `NOTIFY_TO` | e-mail Shehe-ho |
| `NOTIFY_FROM` | *(voliteľné)* `Pradávna výzva <ty@gmail.com>` |
| `CRON_SECRET` | ľubovoľný náhodný reťazec (Vercel ho pri crone pošle sám) |
| `ADMIN_TO` | *(voliteľné)* tvoj e-mail pre hlásenia „Shehe uhádol" (ak chýba, použije sa `SMTP_USER`) |

**Gmail App password:** Google účet → Bezpečnosť → 2-krokové overenie (musí byť
zapnuté) → *App passwords* → vygeneruj heslo a vlož ho do `SMTP_PASS`.
(Funguje aj iný SMTP — Seznam, vlastný, …)

### 2. Cron na Verceli
Po nasadení je cron aktívny automaticky (Hobby plán = max. raz denne, čo stačí).
Skontroluješ ho vo Vercel → **Settings → Cron Jobs**.

### 3. Test
Po nasadení môžeš funkciu zavolať ručne (pošle len ak je dnes deň odomknutia):
`https://TVOJ-WEB.vercel.app/api/notify?key=CRON_SECRET`

> Pozn.: cron beží v UTC. `0 6 * * *` = ráno o 8:00 nášho letného času.

### Hlásenie „Shehe uhádol" na tvoj e-mail
Funkcia [`api/solved.js`](api/solved.js) pošle e-mail **tebe** vždy, keď Shehe
správne uhádne pečať (každá pečať sa nahlási iba raz). V e-maile je číslo pečate,
správna odpoveď a na koľký pokus ju trafil. Cieľová adresa = `ADMIN_TO`
(alebo `SMTP_USER`). Používa rovnaké SMTP nastavenia ako vyššie — netreba nič
navyše okrem (voliteľne) `ADMIN_TO`.

> Funguje až po nasadení na Vercel (serverless funkcie nebežia v `npm run dev`).
> Ak chceš testovať lokálne, použi `vercel dev`.

> Pozn.: zamykanie je na strane prehliadača (statický web). Na zábavnú hru postačuje;
> pre nepriestrelné riešenie by bol potrebný backend.
