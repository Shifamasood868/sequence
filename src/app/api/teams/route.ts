import { NextResponse } from "next/server";
import { mutateTournament } from "@/lib/tournament-store";
import { emptyKnockout } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const player1 = String(body.player1 ?? "").trim();
    const player2 = String(body.player2 ?? "").trim();

    const state = await mutateTournament((s) => {
      if (!name || !player1 || !player2) {
        throw new Error("Enter the team name and both player names.");
      }
      if (s.teams.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
        throw new Error("That team name is already registered.");
      }
      if (s.matches.some((m) => m.played)) {
        throw new Error("Clear group results before adding teams.");
      }
      const id = s.nextTeamId;
      return {
        ...s,
        teams: [...s.teams, { id, name, players: [player1, player2] }],
        matches: [],
        knockout: emptyKnockout(),
        nextTeamId: id + 1,
      };
    });

    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add team";
    const status = message.includes("Enter") || message.includes("already") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
