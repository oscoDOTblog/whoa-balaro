// Core card/deck utilities for a generic 52-card deck.

const SUITS = ["spades", "hearts", "diamonds", "clubs"];

const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 11=J, 12=Q, 13=K, 14=A

function makeId(rank, suit, idx) {
  // Stable-ish unique id per card instance for React keys.
  return `${rank}-${suit}-${idx}`;
}

export function createStandardDeck() {
  const deck = [];
  let idx = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: makeId(rank, suit, idx++), rank, suit });
    }
  }
  return deck;
}

export function shuffleArray(input) {
  const arr = input.slice();
  // Fisher–Yates shuffle
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function drawTop(deck, n) {
  // Caller is responsible for ensuring deck has at least n cards.
  return {
    drawn: deck.slice(0, n),
    remaining: deck.slice(n),
  };
}

export function getSuitSymbol(suit) {
  switch (suit) {
    case "spades":
      return "♠";
    case "hearts":
      return "♥";
    case "diamonds":
      return "♦";
    case "clubs":
      return "♣";
    default:
      return "?";
  }
}

export function isRedSuit(suit) {
  return suit === "hearts" || suit === "diamonds";
}

export function getRankLabel(rank) {
  if (rank === 14) return "A";
  if (rank === 13) return "K";
  if (rank === 12) return "Q";
  if (rank === 11) return "J";
  return String(rank);
}

