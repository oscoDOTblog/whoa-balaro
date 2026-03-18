import { createStandardDeck, shuffleArray } from "./deck";
import { getBlindByIndex, getBlindTarget, getNextBlind } from "./blinds";
import { scoreFiveCardHand } from "./scoring";

const RED_DECK = {
  handsPerRound: 4,
  discardsPerRound: 4,
};

function recycleDeckIfNeeded({ deck, discardPile, n }) {
  // Ensures we can draw `n` cards by shuffling/recycling discard pile into deck.
  // Returns a new { deck, discardPile } pair.
  if (deck.length >= n) return { deck, discardPile };

  let nextDeck = deck.slice();
  let nextDiscard = discardPile.slice();

  while (nextDeck.length < n) {
    if (nextDiscard.length === 0) {
      // Should be unreachable in a correct 52-card bookkeeping flow.
      throw new Error("Deck exhausted with empty discard pile");
    }
    nextDeck = nextDeck.concat(shuffleArray(nextDiscard));
    nextDiscard = [];
  }

  return { deck: nextDeck, discardPile: nextDiscard };
}

function drawNCards({ deck, discardPile, n }) {
  const recycled = recycleDeckIfNeeded({ deck, discardPile, n });
  const { deck: d, discardPile: dp } = recycled;
  return {
    drawn: d.slice(0, n),
    remainingDeck: d.slice(n),
    remainingDiscardPile: dp,
  };
}

function startRound({ deck, discardPile, ante, blindIndex }) {
  const drawn = drawNCards({ deck, discardPile, n: 8 });
  return {
    deck: drawn.remainingDeck,
    discardPile: drawn.remainingDiscardPile,
    handCards: drawn.drawn,
    handsLeft: RED_DECK.handsPerRound,
    discardsLeft: RED_DECK.discardsPerRound,
    lastHandScore: null,
    lastBlindTarget: getBlindTarget({ ante, blindType: getBlindByIndex(blindIndex)?.type }),
  };
}

function createInitialState() {
  const deck = shuffleArray(createStandardDeck());
  return {
    status: "idle", // idle | playing | won | lost
    run: { ante: 1, blindIndex: 0 },
    round: {
      deck,
      discardPile: [],
      handCards: [],
      handsLeft: RED_DECK.handsPerRound,
      discardsLeft: RED_DECK.discardsPerRound,
      lastHandScore: null,
      lastBlindTarget: null,
    },
    ui: {
      phase: "choose",
      lastEvent: null, // { type: 'hand'|'discard'|'blindWon'|'blindLost'|'gameWon'|'gameLost', ... }
    },
  };
}

function validateIdsExist(handCards, cardIds) {
  const idSet = new Set(handCards.map((c) => c.id));
  return cardIds.every((id) => idSet.has(id));
}

function removeCardsById(cards, cardIds) {
  const idSet = new Set(cardIds);
  const remaining = cards.filter((c) => !idSet.has(c.id));
  const removed = cards.filter((c) => idSet.has(c.id));
  return { remaining, removed };
}

export function gameReducer(state, action) {
  if (!state) return createInitialState();

  if (action.type === "START_RUN") {
    const base = state.run;
    const round = startRound({
      deck: state.round.deck,
      discardPile: state.round.discardPile,
      ante: base.ante,
      blindIndex: base.blindIndex,
    });
    return {
      ...state,
      status: "playing",
      run: base,
      round: { ...state.round, ...round },
      ui: { ...state.ui, phase: "choose", lastEvent: null },
    };
  }

  if (state.status !== "playing") return state;

  const blind = getBlindByIndex(state.run.blindIndex);
  const blindTarget = getBlindTarget({ ante: state.run.ante, blindType: blind.type });

  if (action.type === "DISCARD") {
    const selectedIds = action.cardIds || [];
    if (selectedIds.length < 1 || selectedIds.length > 5) return state;
    if (state.round.discardsLeft <= 0) return state;
    if (!validateIdsExist(state.round.handCards, selectedIds)) return state;

    const { remaining, removed } = removeCardsById(state.round.handCards, selectedIds);
    const drawn = drawNCards({ deck: state.round.deck, discardPile: state.round.discardPile.concat(removed), n: removed.length });

    return {
      ...state,
      round: {
        ...state.round,
        deck: drawn.remainingDeck,
        discardPile: drawn.remainingDiscardPile,
        handCards: remaining.concat(drawn.drawn),
        discardsLeft: state.round.discardsLeft - 1,
        lastBlindTarget: blindTarget,
        lastHandScore: null,
      },
      ui: {
        ...state.ui,
        lastEvent: { type: "discard", discardsLeft: state.round.discardsLeft - 1, discardedCount: removed.length },
      },
    };
  }

  if (action.type === "PLAY_HAND") {
    const selectedIds = action.cardIds || [];
    if (selectedIds.length !== 5) return state;
    if (state.round.handsLeft <= 0) return state;
    if (!validateIdsExist(state.round.handCards, selectedIds)) return state;

    const { remaining, removed: playedCards } = removeCardsById(state.round.handCards, selectedIds);
    const drawn = drawNCards({
      deck: state.round.deck,
      discardPile: state.round.discardPile.concat(playedCards),
      n: 5,
    });

    const scored = scoreFiveCardHand(playedCards);
    const beaten = scored.score >= blindTarget;

    const handsLeftNext = state.round.handsLeft - 1;

    // Blind cleared -> advance to next blind/ante and start a fresh round.
    if (beaten) {
      const next = getNextBlind({ ante: state.run.ante, blindIndex: state.run.blindIndex });

      if (next.wonRun) {
        return {
          ...state,
          status: "won",
          ui: { ...state.ui, lastEvent: { type: "gameWon", finalScore: scored.score, handType: scored.handType } },
          run: { ante: next.ante, blindIndex: next.blindIndex },
          round: {
            ...state.round,
            // Keep bookkeeping of deck/discards after last play.
            deck: drawn.remainingDeck,
            discardPile: drawn.remainingDiscardPile,
            handCards: remaining.concat(drawn.drawn),
            lastHandScore: scored,
            lastBlindTarget: blindTarget,
          },
        };
      }

      // Blind is cleared: discard the rest of the current 8-card hand so card accounting stays consistent.
      const discardPileAfterBlindClear = drawn.remainingDiscardPile.concat(remaining, drawn.drawn);

      const round = startRound({
        deck: drawn.remainingDeck,
        discardPile: discardPileAfterBlindClear,
        ante: next.ante,
        blindIndex: next.blindIndex,
      });

      return {
        ...state,
        status: "playing",
        run: { ante: next.ante, blindIndex: next.blindIndex },
        round: { ...state.round, ...round, lastHandScore: scored },
        ui: {
          ...state.ui,
          phase: "choose",
          lastEvent: { type: "blindWon", handType: scored.handType, score: scored.score, target: blindTarget },
        },
      };
    }

    // Not beaten.
    if (handsLeftNext <= 0) {
      return {
        ...state,
        status: "lost",
        ui: { ...state.ui, lastEvent: { type: "gameLost", handType: scored.handType, score: scored.score, target: blindTarget } },
        round: {
          ...state.round,
          deck: drawn.remainingDeck,
          discardPile: drawn.remainingDiscardPile,
          handCards: remaining.concat(drawn.drawn),
          handsLeft: 0,
          discardsLeft: state.round.discardsLeft,
          lastHandScore: scored,
          lastBlindTarget: blindTarget,
        },
      };
    }

    return {
      ...state,
      round: {
        ...state.round,
        deck: drawn.remainingDeck,
        discardPile: drawn.remainingDiscardPile,
        handCards: remaining.concat(drawn.drawn),
        handsLeft: handsLeftNext,
        lastHandScore: scored,
        lastBlindTarget: blindTarget,
      },
      ui: { ...state.ui, lastEvent: { type: "handMiss", score: scored.score, target: blindTarget, handsLeft: handsLeftNext } },
    };
  }

  return state;
}

export function createInitialGameState() {
  return createInitialState();
}

