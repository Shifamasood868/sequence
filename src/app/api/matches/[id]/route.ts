import { NextResponse } from "next/server";
import { mutateTournament } from "@/lib/tournament-store";
import { validateScores } from "@/lib/tournament-logic";
import { emptyKnockout } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const matchId = Number(id);
    const body = await request.json();

    if (body.action === "edit") {
      const state = await mutateTournament((s) => ({
        ...s,
        matches: s.matches.map((m) =>
          m.id === matchId ? { ...m, played: false, scoreA: "", scoreB: "" } : m,
        ),
        knockout: emptyKnockout(),
      }));
      return NextResponse.json(state);
    }

    const scoreA = String(body.scoreA ?? "");
    const scoreB = String(body.scoreB ?? "");
    validateScores(scoreA, scoreB);

    const state = await mutateTournament((s) => {
      const m = s.matches.find((x) => x.id === matchId);
      if (!m) throw new Error("Match not found");
      return {
        ...s,
        matches: s.matches.map((x) =>
          x.id === matchId
            ? { ...x, scoreA: String(+scoreA), scoreB: String(+scoreB), played: true }
            : x,
        ),
        knockout: emptyKnockout(),
      };
    });
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update match";
    const status =
      message === "Match not found" ? 404 : message.includes("Enter") || message.includes("Scores") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
