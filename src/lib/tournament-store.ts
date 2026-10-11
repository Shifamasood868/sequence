import { getDb, TOURNAMENT_ID } from "./db";
import type { TournamentState } from "./types";
import { defaultTournament, emptyKnockout } from "./types";

const COLLECTION = "tournaments";

type TournamentDoc = TournamentState & {
  slug: string;
  updatedAt: Date;
};

export async function getTournament(): Promise<TournamentState> {
  const db = await getDb();
  const doc = await db.collection<TournamentDoc>(COLLECTION).findOne({ slug: TOURNAMENT_ID });
  if (!doc) {
    const initial = defaultTournament();
    await saveTournament(initial);
    return initial;
  }
  const usedIds = new Set<number>();
  let hasDuplicateTeamIds = false;
  let nextTeamId = Number.isSafeInteger(doc.nextTeamId) && doc.nextTeamId > 0 ? doc.nextTeamId : 1;
  const teams = doc.teams.map((team) => {
    let id = team.id;
    if (!Number.isSafeInteger(id) || id < 1 || usedIds.has(id)) {
      hasDuplicateTeamIds = true;
      while (usedIds.has(nextTeamId)) nextTeamId++;
      id = nextTeamId;
    }
    usedIds.add(id);
    nextTeamId = Math.max(nextTeamId, id + 1);
    return id === team.id ? team : { ...team, id };
  });
  const normalized: TournamentState = {
    teams,
    matches: hasDuplicateTeamIds ? [] : doc.matches,
    knockout: hasDuplicateTeamIds ? emptyKnockout() : doc.knockout,
    nextTeamId,
    nextMatchId: doc.nextMatchId,
  };

  if (hasDuplicateTeamIds || nextTeamId !== doc.nextTeamId) {
    await saveTournament(normalized);
  }
  return normalized;
}

export async function saveTournament(state: TournamentState): Promise<TournamentState> {
  const db = await getDb();
  const doc: TournamentDoc = {
    slug: TOURNAMENT_ID,
    ...state,
    updatedAt: new Date(),
  };
  await db
    .collection(COLLECTION)
    .updateOne({ slug: TOURNAMENT_ID }, { $set: doc }, { upsert: true });
  return state;
}

export async function mutateTournament(
  fn: (state: TournamentState) => TournamentState | Promise<TournamentState>,
): Promise<TournamentState> {
  const current = await getTournament();
  const next = await fn(current);
  return saveTournament(next);
}
