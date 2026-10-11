export type Team = {
  id: number;
  name: string;
  players: [string, string];
};

export type Match = {
  id: number;
  a: number;
  b: number;
  scoreA: string;
  scoreB: string;
  played: boolean;
};

export type KnockoutSlot = {
  a: number | null;
  b: number | null;
  scoreA: string;
  scoreB: string;
};

export type Knockout = {
  semi1: KnockoutSlot;
  semi2: KnockoutSlot;
  final: KnockoutSlot;
};

export type TournamentState = {
  teams: Team[];
  matches: Match[];
  knockout: Knockout;
  nextTeamId: number;
  nextMatchId: number;
};

export type StandingRow = {
  id: number;
  name: string;
  players: [string, string];
  played: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  scored: number;
  against: number;
  diff: number;
};

export const emptyKnockout = (): Knockout => ({
  semi1: { a: null, b: null, scoreA: "", scoreB: "" },
  semi2: { a: null, b: null, scoreA: "", scoreB: "" },
  final: { a: null, b: null, scoreA: "", scoreB: "" },
});

export const defaultTournament = (): TournamentState => ({
  teams: [],
  matches: [],
  knockout: emptyKnockout(),
  nextTeamId: 1,
  nextMatchId: 1,
});
