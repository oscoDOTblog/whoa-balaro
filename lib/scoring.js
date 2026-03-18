import { detectHand } from "./poker";

export function scoreFiveCardHand(cards5) {
  const hand = detectHand(cards5);
  const score = hand.chipsTotal * hand.multiplier;
  return {
    ...hand,
    score,
  };
}

