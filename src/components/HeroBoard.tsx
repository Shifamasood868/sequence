"use client";

import { useEffect, useRef } from "react";

const suits = [
  "♠",
  "♥",
  "♣",
  "♦",
  "A",
  "K",
  "Q",
  "J",
  "7",
  "10",
  "★",
  "9",
  "8",
  "6",
  "5",
  "4",
  "3",
  "2",
  "★",
  "★",
  "♣",
  "♦",
  "♥",
  "♠",
  "★",
];

export function HeroBoard() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const board = ref.current;
    if (!board || board.childElementCount) return;
    suits.forEach((s) => {
      const d = document.createElement("div");
      d.className = "cell";
      d.textContent = s;
      if (s === "♥" || s === "♦") d.style.color = "#e34f65";
      if (s === "★") d.style.color = "#168dba";
      board.appendChild(d);
    });
  }, []);

  return (
    <div className="hero-art">
      <div className="board" ref={ref} />
      <i className="chip red" />
      <i className="chip blue" />
      <i className="chip green" />
      <i className="chip gold" />
    </div>
  );
}
