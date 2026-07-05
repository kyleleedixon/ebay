import { parseGrade, gradeKey, type Grade } from "./grades";

export type Game = "POKEMON" | "MTG" | "SPORTS" | "YUGIOH" | "UNKNOWN";
export type Language = "EN" | "JP" | "ZH" | "KO" | "DE" | "FR" | "IT" | "ES" | "PT" | "OTHER";

export type CardKey = {
  game: Game;
  set?: string;
  number?: string;
  name?: string;
  year?: number;
  variant?: string;
  language: Language;
  grade: Grade;
  canonical: string;
};

const POKE_SET_TOKENS = [
  // WOTC era
  "base set", "jungle", "fossil", "team rocket", "gym heroes", "gym challenge",
  "neo genesis", "neo discovery", "neo revelation", "neo destiny",
  "legendary collection", "expedition", "aquapolis", "skyridge",
  // EX era
  "ex ruby", "ex sandstorm", "ex dragon", "ex hidden legends", "ex emerald",
  "ex deoxys", "ex unseen forces", "ex delta species", "ex crystal guardians",
  // Diamond/Pearl, HGSS, BW, XY, SM
  "diamond pearl", "mysterious treasures", "majestic dawn",
  "heartgold soulsilver", "triumphant", "undaunted",
  "black white", "noble victories", "boundaries crossed", "plasma freeze",
  "xy", "phantom forces", "primal clash", "roaring skies", "evolutions",
  "sun moon", "burning shadows", "guardians rising", "ultra prism", "lost thunder",
  // Sword/Shield
  "sword shield", "rebel clash", "darkness ablaze", "vivid voltage",
  "battle styles", "chilling reign", "evolving skies", "fusion strike",
  "brilliant stars", "astral radiance", "lost origin", "silver tempest",
  "crown zenith", "shining fates", "hidden fates", "champions path",
  // Scarlet/Violet
  "scarlet violet", "paldea evolved", "obsidian flames", "paradox rift",
  "paldean fates", "temporal forces", "twilight masquerade", "shrouded fable",
  "stellar crown", "surging sparks", "prismatic evolutions", "journey together",
  "151",
];

const VARIANTS = [
  "holo", "reverse holo", "1st edition", "1st ed", "shadowless",
  "full art", "alt art", "rainbow", "gold", "secret", "promo",
  "rookie", "rc", "refractor", "prizm", "auto", "autograph",
];

function lower(s: string) { return s.toLowerCase(); }

function detectGame(title: string): Game {
  const t = lower(title);
  if (/\bpok[eé]mon\b|\b(charizard|pikachu|mewtwo|umbreon|moonbreon)\b/.test(t)) return "POKEMON";
  if (/\b(mtg|magic the gathering|magic\s+gathering)\b/.test(t)) return "MTG";
  if (/\b(yu-?gi-?oh)\b/.test(t)) return "YUGIOH";
  if (/\b(topps|panini|bowman|fleer|upper deck|donruss|prizm)\b/.test(t)) return "SPORTS";
  return "UNKNOWN";
}

function detectYear(title: string): number | undefined {
  const m = title.match(/\b(19\d{2}|20\d{2})\b/);
  if (!m) return undefined;
  const y = Number(m[1]);
  if (y < 1990 || y > new Date().getFullYear() + 1) return undefined;
  return y;
}

function detectCardNumber(title: string): string | undefined {
  // patterns like 4/102, 25/108, #150, 150/165, SWSH123, SV-001
  const slash = title.match(/\b(\d{1,3})\s*\/\s*(\d{1,3})\b/);
  if (slash) return `${slash[1]}/${slash[2]}`;
  const hash = title.match(/#\s*([A-Z]{0,4}\d{1,4}[A-Z]?)/i);
  if (hash) return hash[1].toUpperCase();
  const tcg = title.match(/\b([A-Z]{2,4}-?\d{2,4})\b/);
  if (tcg) return tcg[1].toUpperCase();
  return undefined;
}

const SPORTS_SET_TOKENS = [
  // Baseball
  "bowman chrome", "bowman draft", "bowman sterling", "bowman platinum", "bowman",
  "topps chrome", "topps update", "topps heritage", "topps finest", "topps stadium club",
  "topps tribute", "topps tier one", "topps", "leaf metal",
  // Basketball / Football
  "panini prizm", "panini select", "panini optic", "panini mosaic", "panini contenders",
  "panini national treasures", "panini immaculate", "panini flawless",
  "donruss optic", "donruss", "select", "mosaic", "prizm",
  // Football vintage / others
  "score", "fleer ultra", "fleer", "upper deck sp", "upper deck",
  // Hockey / soccer
  "topps now", "obsidian", "absolute",
];

function detectSet(title: string): string | undefined {
  const t = lower(title);
  return POKE_SET_TOKENS.find((s) => t.includes(s))
    ?? SPORTS_SET_TOKENS.find((s) => t.includes(s));
}

function detectVariant(title: string): string | undefined {
  const t = lower(title);
  const found = VARIANTS.filter((v) => t.includes(v));
  return found.length ? found.join("+") : undefined;
}

const LANG_PATTERNS: { lang: Language; rx: RegExp }[] = [
  { lang: "JP", rx: /\b(japanese|japan|jpn|jp\s+ver|jap)\b/i },
  { lang: "ZH", rx: /\b(chinese|china|zh|simplified|traditional\s+chinese|cn\s+ver)\b/i },
  { lang: "KO", rx: /\b(korean|korea|kor|kr\s+ver)\b/i },
  { lang: "DE", rx: /\b(german|deutsch|germany)\b/i },
  { lang: "FR", rx: /\b(french|france|fran[cç]ais)\b/i },
  { lang: "IT", rx: /\b(italian|italiano|italy)\b/i },
  { lang: "ES", rx: /\b(spanish|espa[nñ]ol|spain)\b/i },
  { lang: "PT", rx: /\b(portuguese|portugu[eê]s|brazil(ian)?)\b/i },
];

function detectLanguage(title: string): Language {
  // CJK characters in the title → non-English.
  if (/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(title)) {
    if (/[\u3040-\u30ff]/.test(title)) return "JP";
    if (/[\uac00-\ud7af]/.test(title)) return "KO";
    return "ZH";
  }
  for (const { lang, rx } of LANG_PATTERNS) {
    if (rx.test(title)) return lang;
  }
  return "EN";
}

function detectName(title: string, game: Game): string | undefined {
  // Crude: take the first 1-2 capitalized words that aren't graders/sets.
  if (game !== "POKEMON") return undefined;
  const NAMES = [
    "Charizard", "Blastoise", "Venusaur", "Pikachu", "Mewtwo", "Mew",
    "Umbreon", "Espeon", "Sylveon", "Vaporeon", "Jolteon", "Flareon",
    "Leafeon", "Glaceon", "Eevee", "Gengar", "Lugia", "Ho-Oh", "Rayquaza",
    "Giratina", "Dialga", "Palkia", "Arceus", "Snorlax", "Gyarados",
    "Dragonite", "Tyranitar", "Garchomp", "Lucario", "Greninja",
    "Zoroark", "Gardevoir", "Moonbreon",
  ];
  const lc = title.toLowerCase();
  return NAMES.find((n) => lc.includes(n.toLowerCase()));
}

export function parseTitle(title: string): CardKey {
  const game = detectGame(title);
  const grade = parseGrade(title);
  const year = detectYear(title);
  const set = detectSet(title);
  const number = detectCardNumber(title);
  const variant = detectVariant(title);
  const name = detectName(title, game);
  const language = detectLanguage(title);

  const canonical = [
    game,
    language,
    year,
    set,
    name,
    number,
    variant,
    gradeKey(grade),
  ]
    .filter(Boolean)
    .join("|")
    .toLowerCase();

  return { game, set, number, name, year, variant, language, grade, canonical };
}

/** Confidence (0-1) that we extracted a useful key. */
export function keyStrength(k: CardKey): number {
  let s = 0;
  if (k.game !== "UNKNOWN") s += 0.2;
  if (k.set) s += 0.2;
  if (k.number) s += 0.25;
  if (k.name) s += 0.15;
  if (k.year) s += 0.05;
  if (k.grade.grader !== "RAW") s += 0.15;
  return Math.min(1, s);
}
