import { NextResponse } from "next/server";
import { mutateTournament } from "@/lib/tournament-store";
import { applyKnockoutSave, seedKnockoutTeams } from "@/lib/tournament-logic";
import type { Knockout } from "@/lib/types";

const KO_KEYS = ["semi1", "semi2", "final"] as const;

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const key = body.key as (typeof KO_KEYS)[number];
    if (!KO_KEYS.includes(key)) {
      return NextResponse.json({ error: "Invalid knockout key" }, { status: 400 });
    }
    const scoreA = String(body.scoreA ?? "");
    const scoreB = String(body.scoreB ?? "");

    const state = await mutateTournament((s) => {
      let knockout = seedKnockoutTeams(s.knockout, s.teams, s.matches);
      knockout = applyKnockoutSave(knockout, key, scoreA, scoreB);
      if (key === "semi1" || key === "semi2") {
        const w1 =
          knockout.semi1.scoreA !== "" && knockout.semi1.scoreB !== ""
            ? +knockout.semi1.scoreA > +knockout.semi1.scoreB
              ? knockout.semi1.a
              : knockout.semi1.b
            : null;
        const w2 =
          knockout.semi2.scoreA !== "" && knockout.semi2.scoreB !== ""
            ? +knockout.semi2.scoreA > +knockout.semi2.scoreB
              ? knockout.semi2.a
              : knockout.semi2.b
            : null;
        const final: Knockout["final"] = {
          ...knockout.final,
          a: w1,
          b: w2,
        };
        if (!w1 || !w2) {
          final.scoreA = "";
          final.scoreB = "";
        }
        knockout = { ...knockout, final };
      }
      return { ...s, knockout };
    });

    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save knockout result";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
