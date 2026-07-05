export type Grader = "PSA" | "BGS" | "CGC" | "SGC" | "TAG" | "RAW";

export type Grade = {
  grader: Grader;
  numeric: number | null;
  modifier?: "GEM" | "PRISTINE" | "BLACK" | "AUTH";
};

const GRADER_PATTERNS: { grader: Grader; rx: RegExp }[] = [
  { grader: "PSA", rx: /\bPSA\s*(10|9(?:\.5)?|[1-8](?:\.5)?)\b/i },
  { grader: "BGS", rx: /\bBGS\s*(10|9(?:\.5)?|[1-8](?:\.5)?)\b/i },
  { grader: "CGC", rx: /\bCGC\s*(10|9(?:\.5)?|[1-8](?:\.5)?)\b/i },
  { grader: "SGC", rx: /\bSGC\s*(10|9(?:\.5)?|[1-8](?:\.5)?)\b/i },
  { grader: "TAG", rx: /\bTAG\s*(10|9(?:\.\d)?|[1-8](?:\.\d)?)\b/i },
];

export function parseGrade(title: string): Grade {
  for (const { grader, rx } of GRADER_PATTERNS) {
    const m = title.match(rx);
    if (m) {
      const numeric = Number(m[1]);
      let modifier: Grade["modifier"];
      if (numeric === 10 && /\b(gem|gem\s*mint)\b/i.test(title)) modifier = "GEM";
      if (numeric === 10 && /\b(pristine|black\s*label)\b/i.test(title)) {
        modifier = /black/i.test(title) ? "BLACK" : "PRISTINE";
      }
      return { grader, numeric, modifier };
    }
  }
  if (/\b(raw|ungraded)\b/i.test(title)) return { grader: "RAW", numeric: null };
  return { grader: "RAW", numeric: null };
}

export function gradeKey(g: Grade): string {
  if (g.grader === "RAW") return "RAW";
  const mod = g.modifier ? `-${g.modifier}` : "";
  return `${g.grader}-${g.numeric ?? "?"}${mod}`;
}
