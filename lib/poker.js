// Poker hand classification for exactly 5 cards.
// Cards are expected to be objects: { rank: number (2-14), suit: string }.

const HANDS = {
  highCard: "highCard",
  pair: "pair",
  twoPair: "twoPair",
  threeOfKind: "threeOfKind",
  straight: "straight",
  flush: "flush",
  fullHouse: "fullHouse",
  fourOfKind: "fourOfKind",
  straightFlush: "straightFlush",
  royalFlush: "royalFlush",
};

const MULTIPLIERS = {
  [HANDS.highCard]: 1,
  [HANDS.pair]: 2,
  [HANDS.twoPair]: 2,
  [HANDS.threeOfKind]: 3,
  [HANDS.straight]: 4,
  [HANDS.flush]: 4,
  [HANDS.fullHouse]: 4,
  [HANDS.fourOfKind]: 7,
  [HANDS.straightFlush]: 8,
  [HANDS.royalFlush]: 8,
};

// These are the base "hand chips" implied by the plan.
const BASE_CHIPS = {
  [HANDS.highCard]: 5,
  [HANDS.pair]: 10,
  [HANDS.twoPair]: 20,
  [HANDS.threeOfKind]: 30,
  [HANDS.straight]: 30,
  [HANDS.flush]: 35,
  [HANDS.fullHouse]: 40,
  [HANDS.fourOfKind]: 60,
  [HANDS.straightFlush]: 100,
  [HANDS.royalFlush]: 100,
};

export function getRankChipValue(rank) {
  // Matching the plan: 2-10 = face value, J/Q/K = 10, A = 11.
  if (rank >= 2 && rank <= 10) return rank;
  if (rank === 11 || rank === 12 || rank === 13) return 10;
  if (rank === 14) return 11;
  return 0;
}

function getCounts(ranks) {
  const counts = new Map();
  for (const r of ranks) counts.set(r, (counts.get(r) || 0) + 1);
  return counts;
}

function isFlush(cards) {
  const suit = cards[0]?.suit;
  if (!suit) return false;
  return cards.every((c) => c.suit === suit);
}

// Returns { isStraight: boolean, straightHigh: number|null, isWheel: boolean }
function getStraightInfo(cards) {
  const unique = Array.from(new Set(cards.map((c) => c.rank))).sort((a, b) => a - b);
  if (unique.length !== 5) return { isStraight: false, straightHigh: null, isWheel: false };

  // Wheel: A-2-3-4-5
  const wheel = [2, 3, 4, 5, 14];
  if (unique.join(",") === wheel.join(",")) {
    return { isStraight: true, straightHigh: 5, isWheel: true };
  }

  // Normal straight
  for (let i = 1; i < unique.length; i += 1) {
    if (unique[i] !== unique[0] + i) return { isStraight: false, straightHigh: null, isWheel: false };
  }
  return { isStraight: true, straightHigh: unique[4], isWheel: false };
}

export function detectHand(cards) {
  if (!Array.isArray(cards) || cards.length !== 5) {
    throw new Error("detectHand requires exactly 5 cards");
  }

  const ranks = cards.map((c) => c.rank);
  const counts = getCounts(ranks);
  const countValues = Array.from(counts.values()).sort((a, b) => b - a); // e.g. [3,2]
  const flush = isFlush(cards);
  const straightInfo = getStraightInfo(cards);

  const has4 = countValues[0] === 4;
  const has3 = countValues[0] === 3;
  const has2 = countValues[0] === 2;

  const handType =
    straightInfo.isStraight && flush
      ? (() => {
          // Royal flush = 10-J-Q-K-A
          const rankSet = new Set(ranks);
          const royal = [10, 11, 12, 13, 14];
          if (royal.every((r) => rankSet.has(r))) return HANDS.royalFlush;
          return HANDS.straightFlush;
        })()
      : has4
        ? HANDS.fourOfKind
        : has3 && countValues[1] === 2
          ? HANDS.fullHouse
          : flush
            ? HANDS.flush
            : straightInfo.isStraight
              ? HANDS.straight
              : has3
                ? HANDS.threeOfKind
                : countValues[0] === 2 && countValues[1] === 2
                  ? HANDS.twoPair
                  : has2
                    ? HANDS.pair
                    : HANDS.highCard;

  const baseChips = BASE_CHIPS[handType] ?? BASE_CHIPS[HANDS.highCard];
  const multiplier = MULTIPLIERS[handType] ?? MULTIPLIERS[HANDS.highCard];

  // Plan says to use the card chip values in addition to base hand chips.
  const chipsFromCards = ranks.reduce((sum, r) => sum + getRankChipValue(r), 0);

  return {
    handType,
    baseChips,
    multiplier,
    chipsFromCards,
    chipsTotal: baseChips + chipsFromCards,
  };
}

