export const BLINDS = [
  { type: "small", name: "Small Blind", targetMult: 1 },
  { type: "big", name: "Big Blind", targetMult: 1.5 },
  { type: "boss", name: "Boss Blind", targetMult: 2 },
];

export const MAX_ANTES = 3;

export function getBlindByIndex(blindIndex) {
  return BLINDS[blindIndex] || null;
}

export function getBlindTarget({ ante, blindType }) {
  // Plan reference: Ante 1 small target = 300. base scales with ante.
  const blind = BLINDS.find((b) => b.type === blindType);
  if (!blind) throw new Error(`Unknown blind type: ${blindType}`);

  const base = 300 * ante;
  return Math.round(base * blind.targetMult);
}

export function getNextBlind({ ante, blindIndex }) {
  // Order: small -> big -> boss; boss advances ante.
  if (blindIndex < 2) {
    return { ante, blindIndex: blindIndex + 1, wonRun: false };
  }

  // Boss
  if (ante >= MAX_ANTES) {
    return { ante, blindIndex: 2, wonRun: true };
  }

  return { ante: ante + 1, blindIndex: 0, wonRun: false };
}

