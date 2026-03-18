"use client";

import { useMemo } from "react";
import { getSuitSymbol, getRankLabel, SUITS, RANKS } from "../../lib/deck";
import styles from "./DeckRemainingPopup.module.css";

function countBySuitAndRank(cards) {
  const grid = {};
  for (const suit of SUITS) {
    grid[suit] = {};
    for (const rank of RANKS) {
      grid[suit][rank] = 0;
    }
  }
  for (const card of cards) {
    if (grid[card.suit] && grid[card.suit][card.rank] !== undefined) {
      grid[card.suit][card.rank] += 1;
    }
  }
  return grid;
}

export default function DeckRemainingPopup({ isOpen, onClose, deck = [], discardPile = [], handCount = 0 }) {
  const grid = useMemo(() => countBySuitAndRank(deck), [deck]);
  const deckTotal = deck.length;

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="deck-popup-title"
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 id="deck-popup-title" className={styles.title}>
            Deck remaining
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.summaryRow}>
            <span className={styles.label}>In deck</span>
            <span className={styles.value}>{deckTotal}</span>
            <span className={styles.label}>In hand</span>
            <span className={styles.value}>{handCount}</span>
          </div>
          <div className={styles.gridWrap} role="table" aria-label="Cards remaining by suit and value">
            <div className={styles.gridRow} role="row">
              <div className={styles.gridCellHeader} role="columnheader">&nbsp;</div>
              {RANKS.map((rank) => (
                <div key={rank} className={styles.gridCellHeader} role="columnheader" title={getRankLabel(rank)}>
                  {getRankLabel(rank)}
                </div>
              ))}
              <div className={styles.gridCellHeader} role="columnheader">Σ</div>
            </div>
            {SUITS.map((suit) => {
              const rowTotal = RANKS.reduce((sum, rank) => sum + (grid[suit]?.[rank] ?? 0), 0);
              return (
                <div key={suit} className={styles.gridRow} role="row">
                  <div className={styles.gridCellSuit} role="rowheader">
                    <span className={styles.suitSymbol}>{getSuitSymbol(suit)}</span>
                    <span className={styles.suitLabel}>{suit}</span>
                  </div>
                  {RANKS.map((rank) => (
                    <div key={`${suit}-${rank}`} className={styles.gridCell} role="cell">
                      {grid[suit]?.[rank] ?? 0}
                    </div>
                  ))}
                  <div className={styles.gridCellTotal} role="cell">{rowTotal}</div>
                </div>
              );
            })}
            <div className={styles.gridRow} role="row">
              <div className={styles.gridCellTotal} role="rowheader">Σ</div>
              {RANKS.map((rank) => {
                const colTotal = SUITS.reduce((sum, s) => sum + (grid[s]?.[rank] ?? 0), 0);
                return (
                  <div key={`total-${rank}`} className={styles.gridCellTotal} role="cell">
                    {colTotal}
                  </div>
                );
              })}
              <div className={styles.gridCellTotal} role="cell">{deckTotal}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
