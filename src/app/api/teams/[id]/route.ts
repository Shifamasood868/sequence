import { NextResponse } from "next/server";
import { mutateTournament } from "@/lib/tournament-store";
import { emptyKnockout } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const teamId = Number(id);
    const state = await mutateTournament((s) => {
      const team = s.teams.find((t) => t.id === teamId);
      if (!team) throw new Error("Team not found");
      return {
        ...s,
        teams: s.teams.filter((t) => t.id !== teamId),
        matches: [],
        knockout: emptyKnockout(),
      };
    });
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete team";
    return NextResponse.json({ error: message }, { status: message === "Team not found" ? 404 : 500 });
  }
}
