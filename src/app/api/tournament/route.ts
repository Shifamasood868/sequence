import { NextResponse } from "next/server";
import { getTournament, mutateTournament, saveTournament } from "@/lib/tournament-store";
import type { TournamentState } from "@/lib/types";
import { defaultTournament, emptyKnockout } from "@/lib/types";

export async function GET() {
  try {
    const state = await getTournament();
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load tournament";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<TournamentState>;
    if (!body || !Array.isArray(body.teams) || !Array.isArray(body.matches)) {
      return NextResponse.json({ error: "Invalid backup format" }, { status: 400 });
    }
    const state: TournamentState = {
      teams: body.teams,
      matches: body.matches,
      knockout: body.knockout ?? emptyKnockout(),
      nextTeamId: body.nextTeamId ?? 1,
      nextMatchId: body.nextMatchId ?? 1,
    };
    await saveTournament(state);
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to import backup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const state = defaultTournament();
    await saveTournament(state);
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reset tournament";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
