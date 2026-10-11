import type { Knockout, Match, StandingRow, Team, TournamentState } from "./types";
import { emptyKnockout } from "./types";

export function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function standings(teams: Team[], matches: Match[]): StandingRow[] {
  const rows: StandingRow[] = teams.map((t) => ({
    id: t.id,
    name: t.name,
    players: t.players,
    played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    points: 0,
    scored: 0,
    against: 0,
    diff: 0,
  }));
  const map = Object.fromEntries(rows.map((r) => [r.id, r]));

  matches
    .filter((m) => m.played)
    .forEach((m) => {
      const a = map[m.a];
      const b = map[m.b];
      if (!a || !b) return;
      const x = +m.scoreA;
      const y = +m.scoreB;
      a.played++;
      b.played++;
      a.scored += x;
      a.against += y;
      b.scored += y;
      b.against += x;
      if (x > y) {
        a.wins++;
        a.points += 2;
        b.losses++;
      } else if (y > x) {
        b.wins++;
        b.points += 2;
        a.losses++;
      } else {
        a.draws++;
        b.draws++;
        a.points++;
        b.points++;
      }
    });

  rows.forEach((r) => {
    r.diff = r.scored - r.against;
  });

  return rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      b.diff - a.diff ||
      b.scored - a.scored ||
      a.name.localeCompare(b.name),
  );
}

export function allGroupDone(matches: Match[]): boolean {
  return matches.length > 0 && matches.every((m) => m.played);
}

export function generateFixtures(state: TournamentState): TournamentState {
  if (state.teams.length < 2) {
    throw new Error("Add at least two teams first.");
  }
  let pairings: { a: number; b: number }[] = [];
  for (let i = 0; i < state.teams.length; i++) {
    for (let j = i + 1; j < state.teams.length; j++) {
      pairings.push({ a: state.teams[i].id, b: state.teams[j].id });
    }
  }
  pairings = shuffle(pairings).map((p) =>
    Math.random() < 0.5 ? { a: p.b, b: p.a } : p,
  );
  let nextMatchId = state.nextMatchId;
  const matches: Match[] = pairings.map((p) => ({
    id: nextMatchId++,
    a: p.a,
    b: p.b,
    scoreA: "",
    scoreB: "",
    played: false,
  }));
  return {
    ...state,
    matches,
    knockout: emptyKnockout(),
    nextMatchId,
  };
}

export function validateScores(scoreA: string, scoreB: string): void {
  if (scoreA === "" || scoreB === "") {
    throw new Error("Enter both scores.");
  }
  const a = +scoreA;
  const b = +scoreB;
  if (a < 0 || b < 0 || !Number.isInteger(a) || !Number.isInteger(b)) {
    throw new Error("Scores must be non-negative whole numbers.");
  }
}

export function applyKnockoutSave(
  knockout: Knockout,
  key: keyof Knockout,
  scoreA: string,
  scoreB: string,
): Knockout {
  validateScores(scoreA, scoreB);
  if (+scoreA === +scoreB) {
    throw new Error("Knockout games need a winner. Enter a tie-break score.");
  }
  const k = { ...knockout };
  const slot = { ...k[key], scoreA: String(+scoreA), scoreB: String(+scoreB) };
  k[key] = slot;
  if (key === "semi1" || key === "semi2") {
    const winner = +slot.scoreA > +slot.scoreB ? slot.a : slot.b;
    const final = { ...k.final, scoreA: "", scoreB: "" };
    if (key === "semi1") final.a = winner;
    else final.b = winner;
    k.final = final;
  }
  return k;
}

export function seedKnockoutTeams(
  knockout: Knockout,
  teams: Team[],
  matches: Match[],
): Knockout {
  if (!allGroupDone(matches) || teams.length < 4) return knockout;
  const r = standings(teams, matches);
  return {
    ...knockout,
    semi1: { ...knockout.semi1, a: r[0].id, b: r[3].id },
    semi2: { ...knockout.semi2, a: r[1].id, b: r[2].id },
  };
}
