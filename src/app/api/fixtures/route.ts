import { NextResponse } from "next/server";
import { mutateTournament } from "@/lib/tournament-store";
import { generateFixtures } from "@/lib/tournament-logic";

export async function POST() {
  try {
    const state = await mutateTournament((s) => generateFixtures(s));
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create fixtures";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
