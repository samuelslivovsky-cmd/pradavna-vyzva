// =====================================================================
//  OBSAH HRY — pečate (hinty) pre budúceho ženícha.
//  Téma rozlúčky: camping v Rakúsku + lezenie po skalách.
//  Cieľ: poriadne ho ZMIASŤ — miešame REÁLNE potrebné veci s úplnými
//  nezmyslami, a to v nepravidelnom poradí (nech sa v tom nedá nájsť vzor).
//
//  POZN. pre organizátora (NEzobrazuje sa na stránke):
//   - Z lezeckého vybavenia naznačujeme LEN sedák.
//   - Žiadny náznak ferrát (prilba ani brzda → postarajú sa kamoši).
//   - Štyri suroviny (bryndza, múka, vajcia, mlieko) = na bryndzové halušky;
//     sú zámerne cryptické a porozhadzované, nech mu súvis nedôjde hneď.
//   - Pri každej pečati je komentár [REÁL] / [FALOŠ] len pre teba.
//
//  KAŽDÁ PEČAŤ MÁ HÁDANIE:
//   - answer  = správna odpoveď, ktorá sa zobrazí (uhádnutá / prezradená).
//   - accept  = pole akceptovaných odpovedí (píš ich malými písmenami a BEZ
//               diakritiky — stránka si vstup sama normalizuje). Stačí kľúčové
//               slovo; uzná sa aj veta, ktorá ho obsahuje (napr. 'sedak').
//   Pozn.: odpovede sú v tomto súbore (klientska hra), takže technicky zdatný
//   Shehe by ich vedel nájsť v zdrojáku. Pre zábavu to stačí.
//
//  Dátum (reveal) = deň, od ktorého sa pečať odomkne ('YYYY-MM-DD').
// =====================================================================

export const EVENT = {
  departure: '2026-07-09', // odchod
  end: '2026-07-12',       // koniec dobrodružstva
  // Po nasadení na Vercel sem vlož adresu webu (napr. 'https://shehe.vercel.app').
  // Použije sa v kalendárových pripomienkach a v e-mailoch.
  url: '',
}

// Po koľkých nesprávnych pokusoch sa objaví tlačidlo „Prezradiť odpoveď".
export const MAX_ATTEMPTS = 5

// Po koľkých pokusoch sa ponúkne jemný „Šepot ducha" (nápoveda pred odpoveďou).
export const WHISPER_AFTER = 3

// Odmena po vyriešení všetkých pečatí: tajná správa + pravý baliaci zoznam.
export const FINALE = {
  title: 'Posledná pravda odhalená',
  message:
    'Prešiel si všetkými pečaťami, Shehe. Oddelil si zrno od pliev a dokázal, ' +
    'že ťa žiadna hmla nezmätie.\n' +
    'Toto je tvoj pravý batoh — o zvyšok a o to najdôležitejšie sa postarajú ' +
    'tvoji druhovia. ☾',
  // Iba REÁLNE potrebné veci (nezmysly vynechané).
  packing: [
    'Lezecký sedák',
    'Pevná turistická obuv',
    'Fľaša na vodu / hydratačný vak',
    'Pršiplášť / nepremok',
    'Čelovka',
    'Spacák',
    'Opaľovací krém + slnečné okuliare',
    'Powerbank',
    'Bryndza, múka, vajcia, mlieko 😏',
  ],
}

export const HINTS = [
  {
    id: 1,
    reveal: '2026-06-08', // [REÁL] lezecký sedák
    title: 'I. pečať — Objatie priepasti',
    riddle:
      'Jestvuje pás, čo nedrží nohavice, ale holý život.\n' +
      'Bez neho ostaneš visieť len vo vlastných myšlienkach — a tie ťa nezachytia.\n' +
      'Hľadaj ho tam, kde už raz visel.',
    note: '',
    answer: 'Lezecký sedák',
    accept: ['sedak', 'sedacka', 'uvazok', 'postroj', 'lezecky sedak'],
  },
  {
    id: 2,
    reveal: '2026-06-09', // [REÁL] vajcia
    title: 'II. pečať — Krehký poklad',
    riddle:
      'Vezmi so sebou ovály, čo prasknú, no zrodia silu.\n' +
      'Drž ich jemne — život v škrupine neodpúšťa pád.',
    note: '',
    answer: 'Vajcia',
    accept: ['vajcia', 'vajce', 'vajicka', 'vajco'],
  },
  {
    id: 3,
    reveal: '2026-06-10', // [FALOŠ] žehlička
    title: 'III. pečať — Hladký osud',
    riddle:
      'Bralá pod Belianskymi Tatrami neznášajú pokrčené plátno.\n' +
      'Vezmi horúci nástroj, čo vyhladí každú vrásku — aj tú na čele osudu.\n' +
      'A nezabudni na šnúru.',
    note: '',
    answer: 'Žehlička',
    accept: ['zehlicka', 'zehlit'],
  },
  {
    id: 4,
    reveal: '2026-06-12', // [REÁL] pevná turistická obuv
    title: 'IV. pečať — Brnenie chodidiel',
    riddle:
      'Skala pohltí každú slabú podrážku.\n' +
      'Obuj sa do brnenia, ktoré prekoná kameň aj čas.\n' +
      'Sandále nechaj duchom pri jazere.',
    note: '',
    answer: 'Pevná turistická obuv',
    accept: ['obuv', 'topank', 'poho', 'baganc', 'cizm', 'kanad', 'turisticke topanky'],
  },
  {
    id: 5,
    reveal: '2026-06-13', // [REÁL] múka
    title: 'V. pečať — Biely prach',
    riddle:
      'Biely prach, čo nie je sneh ani popol.\n' +
      'Bez neho cesto sveta nedrží pokope.\n' +
      'Vezmi vrece a nepýtaj sa prečo.',
    note: '',
    answer: 'Múka',
    accept: ['muka'],
  },
  {
    id: 6,
    reveal: '2026-06-14', // [REÁL] fľaša na vodu / hydratačný vak
    title: 'VI. pečať — Žriedlo v batohu',
    riddle:
      'Hore ťa smäd dobehne skôr než únava.\n' +
      'Nes si vlastný prameň, čo nevyschne, kým ho sám nevypiješ.',
    note: '',
    answer: 'Fľaša na vodu / hydratačný vak',
    accept: ['flas', 'voda', 'hydrat', 'camelbak', 'pitie', 'fluasa'],
  },
  {
    id: 7,
    reveal: '2026-06-16', // [FALOŠ] motýlik / oblek
    title: 'VII. pečať — Krídla, čo nelietajú',
    riddle:
      'Na hostine horských duchov sa neprichádza s holým krkom.\n' +
      'Priviaž si motýľa, ktorý nikdy nevzlietne.\n' +
      'Elegancia je vraj vrcholová disciplína.',
    note: '',
    answer: 'Motýlik (na oblek)',
    accept: ['motylik', 'motylek', 'oblek', 'kravata', 'viazanka', 'motyl'],
  },
  {
    id: 8,
    reveal: '2026-06-18', // [REÁL] nepremok / pršiplášť
    title: 'VIII. pečať — Slzy oblohy',
    riddle:
      'Horské nebo plače bez varovania a bez príčiny.\n' +
      'Vezmi plášť, ktorý odoženie slzy zhora skôr, než ťa premočia do kostí.',
    note: '',
    answer: 'Pršiplášť / nepremok',
    accept: ['prsiplast', 'nepremok', 'pelerina', 'nepremokav', 'bunda do dazda', 'plast do dazda'],
  },
  {
    id: 9,
    reveal: '2026-06-19', // [REÁL] mlieko
    title: 'IX. pečať — Biela tekutina',
    riddle:
      'Tekutina bielej farby, čo netečie z prameňa, ale zo zvieraťa.\n' +
      'Vezmi ju chladnú — inak sa cestou premení na hnev.',
    note: '',
    answer: 'Mlieko',
    accept: ['mlieko'],
  },
  {
    id: 10,
    reveal: '2026-06-20', // [FALOŠ] nafukovací jednorožec
    title: 'X. pečať — Tvor s rohom',
    riddle:
      'Keď ťa zavolá horské jazero, neplávaj sám.\n' +
      'Osedlaj tvora s rohom, ktorý nikdy nebol skutočný a nadýchne sa len tvojimi ústami.',
    note: '',
    answer: 'Nafukovací jednorožec',
    accept: ['jednorozec', 'nafukovac', 'jednorozca'],
  },
  {
    id: 11,
    reveal: '2026-06-22', // [REÁL] čelovka
    title: 'XI. pečať — Tretie oko',
    riddle:
      'Tma v stane je hustejšia než polnoc na Kežmarskom hrade.\n' +
      'Nasaď si na čelo tretie oko, čo svieti vtedy, keď ťa slnko zradí.',
    note: '',
    answer: 'Čelovka',
    accept: ['celovka', 'celova lampa', 'lampa na celo', 'baterka na celo'],
  },
  {
    id: 12,
    reveal: '2026-06-24', // [FALOŠ] snowboard
    title: 'XII. pečať — Sen o snehu',
    riddle:
      'Aj v júlovej horúčave sníva hora o bielom.\n' +
      'Vezmi dosku, čo kĺže tam, kde niet snehu — nech sa štíty čudujú.',
    note: '',
    answer: 'Snowboard',
    accept: ['snowboard', 'snoubord', 'snouboard', 'doska na sneh'],
  },
  {
    id: 13,
    reveal: '2026-06-26', // [REÁL] spacák
    title: 'XIII. pečať — Kokón',
    riddle:
      'Noc v horách hryzie do kostí ostrejšie než vlk.\n' +
      'Zavri sa do kokóna, z ktorého sa ráno vykľuje statočnejší muž.',
    note: '',
    answer: 'Spacák',
    accept: ['spacak', 'spaci vak'],
  },
  {
    id: 14,
    reveal: '2026-06-27', // [REÁL] bryndza
    title: 'XIV. pečať — Poklad zo salaša',
    riddle:
      'Bez tohto pokladu z ovčieho mlieka je každá hostina v horách prázdna.\n' +
      'Vezmi hrudu, čo vonia po salaši a soli. Bez nej sa večera jednoducho neuskutoční.',
    note: '',
    answer: 'Bryndza',
    accept: ['bryndza', 'bryndzu'],
  },
  {
    id: 15,
    reveal: '2026-06-28', // [FALOŠ] kolieskové korčule
    title: 'XV. pečať — Kolesá pod nohami',
    riddle:
      'Cesta na vrchol je strmá a kamenistá — preto si pod nohy daj kolesá.\n' +
      'Nech ťa skala vidí a neverí vlastným očiam.',
    note: '',
    answer: 'Kolieskové korčule',
    accept: ['korcule', 'kolieskove', 'inline', 'rolery', 'kolieskove korcule'],
  },
  {
    id: 16,
    reveal: '2026-06-30', // [FALOŠ] plyšový medveď
    title: 'XVI. pečať — Strážca spánku',
    riddle:
      'V tmavých lesoch vraj chodia medvede.\n' +
      'Aby ťa nevystrašili, vezmi si jedného vlastného — mäkkého, tichého a vypchatého.',
    note: '',
    answer: 'Plyšový medveď',
    accept: ['plysovy medved', 'medved', 'plysiak', 'macko', 'plysovy macko'],
  },
  {
    id: 17,
    reveal: '2026-07-02', // [REÁL] opaľovací krém + slnečné okuliare
    title: 'XVII. pečať — Pancier proti slnku',
    riddle:
      'Slnko na holom hrebeni nepozná milosť ani tieň.\n' +
      'Natri sa neviditeľným pancierom a skry oči za tmavé sklá —\n' +
      'inak oslepneš od krásy Tatier za chrbtom.',
    note: '',
    answer: 'Opaľovací krém + slnečné okuliare',
    accept: ['opalovaci krem', 'opalak', 'krem na opal', 'slnecne okuliare', 'okuliare', 'krem a okuliare'],
  },
  {
    id: 18,
    reveal: '2026-07-04', // [FALOŠ] dáždnik
    title: 'XVIII. pečať — Čierna kupola',
    riddle:
      'Ak by plášť zlyhal, rozprestri nad sebou čiernu kupolu na tenkej palici.\n' +
      'Vietor na hrebeni sa bude smiať — a možno ťa aj odnesie.',
    note: '',
    answer: 'Dáždnik',
    accept: ['dazdnik', 'dazdniky'],
  },
  {
    id: 19,
    reveal: '2026-07-06', // [REÁL] powerbank + ODHALENIE
    title: 'XIX. pečať — Pravda',
    riddle:
      'Nabi srdce aj stroje: vezmi kameň plný blesku, lebo tam hore niet zásuviek.\n\n' +
      'A teraz počúvaj dobre, Shehe:\n' +
      'nie všetko, čo ti pečate šepkali, bola pravda. Niektoré veci ťa mali len zmiasť.\n' +
      'Pravý batoh spoznáš až vtedy, keď oddelíš zrno od pliev.\n' +
      'Zbaľ múdro — o zvyšok a o to najdôležitejšie sa postarajú tvoji druhovia. ☾',
    note: '',
    answer: 'Powerbank',
    accept: ['powerbank', 'power bank', 'externa bater', 'nabijacka'],
  },
]
