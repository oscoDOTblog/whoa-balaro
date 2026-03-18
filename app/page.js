"use client";

import { useMemo, useReducer, useState } from "react";
import styles from "./page.module.css";
import { getRankLabel, getSuitSymbol } from "../lib/deck";
import { gameReducer, createInitialGameState } from "../lib/gameState";
import { getBlindByIndex, getBlindTarget } from "../lib/blinds";

const HAND_TYPE_LABELS = {
  highCard: "High Card",
  pair: "Pair",
  twoPair: "Two Pair",
  threeOfKind: "Three of a Kind",
  straight: "Straight",
  flush: "Flush",
  fullHouse: "Full House",
  fourOfKind: "Four of a Kind",
  straightFlush: "Straight Flush",
  royalFlush: "Royal Flush",
};

function formatEvent(event) {
  if (!event) return null;
  if (event.type === "discard") {
    return `Discarded ${event.discardedCount} card(s). Discards left: ${event.discardsLeft}.`;
  }
  if (event.type === "handMiss") {
    return `Hand score ${event.score} did not beat target ${event.target}. Hands left: ${event.handsLeft}.`;
  }
  if (event.type === "blindWon") {
    return `Blind cleared! ${HAND_TYPE_LABELS[event.handType] || event.handType} scored ${event.score} (target ${event.target}).`;
  }
  if (event.type === "gameWon") {
    return `You won the run! (${HAND_TYPE_LABELS[event.handType] || event.handType})`;
  }
  if (event.type === "gameLost") {
    return `Game over. (${HAND_TYPE_LABELS[event.handType] || event.handType})`;
  }
  return null;
}

export default function BalatroRedDeck() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialGameState);
  const [selectedIds, setSelectedIds] = useState([]);

  const blind = useMemo(() => {
    if (!state?.run) return null;
    return getBlindByIndex(state.run.blindIndex);
  }, [state]);

  const target = useMemo(() => {
    if (!blind || !state?.run) return null;
    return getBlindTarget({ ante: state.run.ante, blindType: blind.type });
  }, [blind, state]);

  const canStart = state.status === "idle";
  const canPlay = state.status === "playing" && selectedIds.length === 5 && state.round.handsLeft > 0;
  const canDiscard =
    state.status === "playing" && selectedIds.length >= 1 && selectedIds.length <= 5 && state.round.discardsLeft > 0;

  const eventLine = formatEvent(state?.ui?.lastEvent);

  function toggleSelect(cardId) {
    setSelectedIds((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= 5) return prev;
      return prev.concat(cardId);
    });
  }

  function onStart() {
    dispatch({ type: "START_RUN" });
    setSelectedIds([]);
  }

  function onDiscard() {
    dispatch({ type: "DISCARD", cardIds: selectedIds });
    setSelectedIds([]);
  }

  function onPlayHand() {
    dispatch({ type: "PLAY_HAND", cardIds: selectedIds });
    setSelectedIds([]);
  }

  return (
    <div className={styles.shell}>
      <div className={styles.topRow}>
        <div className={styles.title}>
          <h1>Balatro Clone (Red Deck Core)</h1>
          <p className={styles.subtitle}>Minimal generic run: deal 8, discard/redraw, play 5-card poker hands vs blinds.</p>
        </div>

        <div className={styles.statusPanel}>
          <div className={styles.statusGrid}>
            <div className={styles.kv}>
              <div className={styles.k}>Run Status</div>
              <div className={styles.v}>
                {state.status === "idle"
                  ? "Ready"
                  : state.status === "playing"
                    ? "In progress"
                    : state.status === "won"
                      ? "Won"
                      : "Lost"}
              </div>
            </div>

            <div className={styles.kv}>
              <div className={styles.k}>Ante / Blind</div>
              <div className={styles.v}>{state.run.ante} / {blind ? blind.name : "—"}</div>
            </div>

            <div className={styles.kv}>
              <div className={styles.k}>Target</div>
              <div className={styles.v}>{state.status === "playing" ? target : "—"}</div>
            </div>

            <div className={styles.kv}>
              <div className={styles.k}>Hands / Discards</div>
              <div className={styles.v}>
                {state.status === "playing" ? `${state.round.handsLeft} / ${4}` : "—"} /{" "}
                {state.status === "playing" ? `${state.round.discardsLeft} / ${4}` : "—"}
              </div>
            </div>
          </div>

          {(eventLine || selectedIds.length > 0) && <div className={styles.eventLine}>{eventLine || `Selected: ${selectedIds.length} card(s)`}</div>}
        </div>
      </div>

      {state.status !== "idle" && (
        <>
          <div className={styles.hintRow}>
            Click cards to select. Select exactly 5 to play a hand, or select 1–5 to discard and redraw.
          </div>

          <div className={styles.cardGrid} role="grid" aria-label="Cards in hand">
            {state.round.handCards.map((card) => {
              const selected = selectedIds.includes(card.id);
              const suitSymbol = getSuitSymbol(card.suit);
              const rankLabel = getRankLabel(card.rank);
              return (
                <div
                  key={card.id}
                  className={`${styles.card} ${selected ? styles.cardSelected : ""}`}
                  onClick={() => toggleSelect(card.id)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.rank}>{rankLabel}</div>
                    <div className={styles.suit}>{suitSymbol}</div>
                  </div>
                  <div className={styles.cardBottom}>Rank chip value applies to scoring.</div>
                </div>
              );
            })}
          </div>

          <div className={styles.buttonRow}>
            <div className={styles.actionsRow}>
              <button className={styles.btn} onClick={onPlayHand} disabled={!canPlay}>
                Play Hand (score vs target)
              </button>
              <button className={styles.btn} onClick={onDiscard} disabled={!canDiscard}>
                Discard & Redraw (uses 1 discard)
              </button>
            </div>

            {state.round.lastHandScore && (
              <div className={styles.hintRow}>
                Last Hand: {HAND_TYPE_LABELS[state.round.lastHandScore.handType] || state.round.lastHandScore.handType} • Chips{" "}
                {state.round.lastHandScore.chipsTotal} • Multiplier x{state.round.lastHandScore.multiplier} • Score{" "}
                {state.round.lastHandScore.score}
              </div>
            )}
          </div>
        </>
      )}

      {canStart && (
        <div className={styles.buttonRow}>
          <button className={styles.btn} onClick={onStart}>
            Start Run (Red Deck)
          </button>
          <div className={styles.hintRow}>Win by beating the Boss Blind at Ante 3. Good luck.</div>
        </div>
      )}

      {(state.status === "won" || state.status === "lost") && (
        <div className={styles.buttonRow}>
          <button
            className={styles.btn}
            onClick={() => {
              window.location.reload();
            }}
          >
            Restart
          </button>
          <div className={styles.hintRow}>Refresh to reset deck + state.</div>
        </div>
      )}
    </div>
  );
}

