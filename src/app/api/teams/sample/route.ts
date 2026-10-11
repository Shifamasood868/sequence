import { NextResponse } from "next/server";
import { mutateTournament } from "@/lib/tournament-store";
import { emptyKnockout } from "@/lib/types";

const SAMPLE: [string, string, string][] = [
  ["The Strategists", "Babar", "Haider"],
  ["Card Sharks", "Ibrahim", "Saad"],
  ["Sequence Squad", "Hammad", "Osama Karamat"],
  ["Royal Flush", "Osama Altaf", "Mehr"],
  ["Team Champions", "Amna Zia", "Haroon"],
];

export async function POST() {
  try {
    const state = await mutateTournament((s) => {
      let nextTeamId = 1;
      const teams = SAMPLE.map(([name, p1, p2]) => ({
        id: nextTeamId++,
        name,
        players: [p1, p2] as [string, string],
      }));
      return {
        teams,
        matches: [],
        knockout: emptyKnockout(),
        nextTeamId,
        nextMatchId: 1,
      };
    });
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load sample teams";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
