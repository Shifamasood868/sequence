import { NextResponse } from "next/server";
import { mutateTournament } from "@/lib/tournament-store";
import { emptyKnockout } from "@/lib/types";

export async function POST() {
  try {
    const state = await mutateTournament((s) => {
      if (!s.matches.length) return s;
      return {
        ...s,
        matches: s.matches.map((m) => ({
          ...m,
          played: false,
          scoreA: "",
          scoreB: "",
        })),
        knockout: emptyKnockout(),
      };
    });
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to clear results";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
