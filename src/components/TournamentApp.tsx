"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Knockout, Match, Team, TournamentState } from "@/lib/types";
import { tournamentApi } from "@/lib/api-client";
import { allGroupDone, standings as calcStandings, seedKnockoutTeams } from "@/lib/tournament-logic";
import { HeroBoard } from "./HeroBoard";

type Page = "dashboard" | "teams" | "matches" | "standings" | "knockout" | "rules";

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

function byId(teams: Team[], id: number) {
  return teams.find((t) => t.id === id);
}

export function TournamentApp() {
  const [page, setPage] = useState<Page>("dashboard");
  const [state, setState] = useState<TournamentState | null>(null);
  const [saveStatus, setSaveStatus] = useState("● Loading…");
  const [loading, setLoading] = useState(true);
  const [koScores, setKoScores] = useState<Record<string, { a: string; b: string }>>({});

  const navigate = (p: Page) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    tournamentApi
      .load()
      .then((data) => {
        setState(data);
        setSaveStatus("● Saved to database");
      })
      .catch(() => setSaveStatus("⚠ Could not load — check MongoDB connection"))
      .finally(() => setLoading(false));
  }, []);

  const run = async (fn: () => Promise<TournamentState>, errPrefix = "Action failed") => {
    try {
      setSaveStatus("● Saving…");
      const data = await fn();
      setState(data);
      setSaveStatus("● Saved to database");
      return true;
    } catch (e) {
      alert(e instanceof Error ? e.message : errPrefix);
      setSaveStatus("⚠ Save failed");
      return false;
    }
  };

  const teams = state?.teams ?? [];
  const matches = state?.matches ?? [];
  const knockout = state?.knockout;

  const rows = useMemo(() => calcStandings(teams, matches), [teams, matches]);
  const done = matches.filter((m) => m.played).length;
  const total = matches.length;
  const groupComplete = allGroupDone(matches) && teams.length >= 4;

  const tableHTML = (limit = 999) => {
    if (!rows.length) {
      return '<div class="empty">Your leaderboard will appear once teams are registered.</div>';
    }
    const body = rows
      .slice(0, limit)
      .map(
        (r, i) =>
          `<tr><td><span class="rank ${i < 4 ? "qualify" : ""}">${i + 1}</span></td><td><div class="team-name">${esc(r.name)}</div><div class="playerline">${esc(r.players.join(" & "))}</div></td><td>${r.played}</td><td>${r.wins}</td><td>${r.losses}</td><td>${r.draws}</td><td>${r.diff > 0 ? "+" : ""}${r.diff}</td><td class="pts">${r.points}</td></tr>`,
      )
      .join("");
    return `<table><thead><tr><th>Rank</th><th>Team / players</th><th>MP</th><th>W</th><th>L</th><th>D</th><th>Score diff.</th><th>Pts</th></tr></thead><tbody>${body}</tbody></table>`;
  };

  const onAddTeam = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    void run(() =>
      tournamentApi.addTeam(
        String(fd.get("teamName")),
        String(fd.get("player1")),
        String(fd.get("player2")),
      ),
    ).then((ok) => {
      if (ok) form.reset();
    });
  };

  const matchCard = (m: Match, i: number) => {
    const a = byId(teams, m.a);
    const b = byId(teams, m.b);
    if (!a || !b) return null;
    return (
      <article className="match-card" key={m.id}>
        <div className="match-top">
          <span>
            FIXTURE {String(i + 1).padStart(2, "0")} · {matches.length} TOTAL
          </span>
          <span className={`status ${m.played ? "done" : ""}`}>
            {m.played ? "✓ RESULT SAVED" : "AWAITING RESULT"}
          </span>
        </div>
        <div className="versus">
          <div className="side">
            {a.name}
            <div className="playerline">{a.players.join(" & ")}</div>
          </div>
          <div className="vs">VS</div>
          <div className="side">
            {b.name}
            <div className="playerline">{b.players.join(" & ")}</div>
          </div>
        </div>
        <MatchScores
          m={m}
          a={a.name}
          b={b.name}
          onUpdate={(data) => {
            setState(data);
            setSaveStatus("● Saved to database");
          }}
        />
      </article>
    );
  };

  const seededKo = knockout
    ? seedKnockoutTeams(knockout, teams, matches)
    : null;

  const koContent = () => {
    if (!seededKo || !groupComplete) {
      return (
        <div className="empty">
          The knockout bracket unlocks after all group matches are saved and at least four teams are registered.
        </div>
      );
    }
    const r = rows;
    const k = seededKo;
    const winner1 =
      k.semi1.scoreA !== "" && k.semi1.scoreB !== ""
        ? +k.semi1.scoreA > +k.semi1.scoreB
          ? k.semi1.a
          : k.semi1.b
        : null;
    const winner2 =
      k.semi2.scoreA !== "" && k.semi2.scoreB !== ""
        ? +k.semi2.scoreA > +k.semi2.scoreB
          ? k.semi2.a
          : k.semi2.b
        : null;
    const finalA = winner1;
    const finalB = winner2;
    const champ =
      k.final.scoreA !== "" && k.final.scoreB !== ""
        ? +k.final.scoreA > +k.final.scoreB
          ? k.final.a
          : k.final.b
        : null;

    return (
      <>
        <div className="notice">
          QUALIFIED: <strong>1. {r[0]?.name}</strong> · <strong>2. {r[1]?.name}</strong> ·{" "}
          <strong>3. {r[2]?.name}</strong> · <strong>4. {r[3]?.name}</strong>
        </div>
        <div className="bracket">
          <KoCard
            title="SEMI-FINAL 1 · RANK 1 vs 4"
            koKey="semi1"
            slot={k.semi1}
            teams={teams}
            scores={koScores.semi1}
            setScores={(v) => setKoScores((s) => ({ ...s, semi1: v }))}
            onSave={run}
          />
          <KoCard
            title="SEMI-FINAL 2 · RANK 2 vs 3"
            koKey="semi2"
            slot={k.semi2}
            teams={teams}
            scores={koScores.semi2}
            setScores={(v) => setKoScores((s) => ({ ...s, semi2: v }))}
            onSave={run}
          />
          <KoCard
            title="🏆 GRAND FINAL"
            koKey="final"
            slot={{ ...k.final, a: finalA, b: finalB }}
            teams={teams}
            scores={koScores.final}
            setScores={(v) => setKoScores((s) => ({ ...s, final: v }))}
            onSave={run}
            disabled={!finalA || !finalB}
          />
        </div>
        {champ ? (
          <div className="banner" style={{ marginTop: 16 }}>
            <h3>🏆 Tournament Champion</h3>
            <p style={{ fontSize: "1.35rem", color: "#fff", fontWeight: 900 }}>
              {byId(teams, champ)?.name ?? "Champion"}
            </p>
            <p>Congratulations on winning the iConnect Sequence Cup!</p>
          </div>
        ) : null}
      </>
    );
  };

  const exportBackup = () => {
    if (!state) return;
    const data = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), ...state }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iconnect-sequence-cup-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(String(reader.result));
        if (!d || !Array.isArray(d.teams) || !Array.isArray(d.matches)) throw new Error("Invalid");
        if (!confirm("Load this backup? It will replace the tournament stored in the database.")) return;
        void run(() => tournamentApi.importBackup(d));
      } catch {
        alert("Could not load this file. Please select a valid iConnect Sequence Cup backup JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const pts = rows.reduce((s, t) => s + t.points, 0);
  const dashboardState =
    teams.length === 0
      ? "REGISTRATION OPEN"
      : !matches.length
        ? "READY TO SHUFFLE"
        : allGroupDone(matches)
          ? "GROUP STAGE COMPLETE"
          : "TOURNAMENT IN PROGRESS";

  if (loading) {
    return (
      <div className="layout" style={{ display: "block", textAlign: "center", padding: 48 }}>
        <p className="muted">Loading tournament…</p>
      </div>
    );
  }

  return (
    <>
      <header className="hero">
        <div className="hero-top">
          <div className="brand">
            <b>i</b>Connect <span style={{ color: "#89a6c6", fontWeight: 400 }}>/</span> SEQUENCE CUP
          </div>
          <div className="organizer">
            TOURNAMENT ORGANIZER
            <strong>Muhammad Shifa Masood</strong>
          </div>
        </div>
        <div className="hero-content">
          <div>
            <div className="kicker">Think · Plan · Play · Win</div>
            <h1>
              SEQUENCE <span>CHAMPIONSHIP</span>
            </h1>
            <p>
              Every move matters. Track the teams, manage randomized group-stage fixtures, update live
              standings, and crown your Sequence champions — all in one place.
            </p>
            <div className="hero-actions">
              <button type="button" className="gold" onClick={() => navigate("teams")}>
                ＋ Register teams
              </button>
              <button type="button" className="ghost" onClick={() => navigate("matches")}>
                View match schedule ↗
              </button>
            </div>
          </div>
          <HeroBoard />
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="nav-title">TOURNAMENT HUB</div>
          {(
            [
              ["dashboard", "⌂", "Overview"],
              ["teams", "♟", "Teams & players"],
              ["matches", "▦", "Group stage"],
              ["standings", "☷", "Standings"],
              ["knockout", "♜", "Semi-finals & final"],
              ["rules", "ⓘ", "Tournament rules"],
            ] as const
          ).map(([id, ico, label]) => (
            <button
              key={id}
              type="button"
              className={`nav ${page === id ? "active" : ""}`}
              onClick={() => navigate(id)}
            >
              <span className="ico">{ico}</span> {label}
            </button>
          ))}
          <div className="side-foot">
            iConnect Sequence Cup
            <br />
            <strong style={{ color: "#174d40" }}>One board. One champion.</strong>
            <div className="backup-tools">
              <div className="save-status">{saveStatus}</div>
              <button type="button" className="ghost small" onClick={exportBackup}>
                ⬇ Save backup file
              </button>
              <button
                type="button"
                className="ghost small"
                onClick={() => document.getElementById("backupInput")?.click()}
              >
                ⬆ Load backup file
              </button>
              <input
                id="backupInput"
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importBackup(f);
                  e.target.value = "";
                }}
              />
              <p>Tournament data is stored in MongoDB. Download a backup file for extra safety.</p>
            </div>
          </div>
        </aside>

        <main>
          <section className={`page ${page === "dashboard" ? "active" : ""}`} id="page-dashboard">
            <div className="page-head">
              <div>
                <h2>Welcome to the Cup</h2>
                <p>Your tournament control room. All scores and rankings update from saved match results.</p>
              </div>
              <span className="badge">{dashboardState}</span>
            </div>
            <div className="cards">
              <div className="metric">
                <div className="label">Registered teams</div>
                <strong>{teams.length}</strong>
                <small>2 players per team</small>
              </div>
              <div className="metric">
                <div className="label">Matches played</div>
                <strong>
                  {done} <span style={{ fontSize: "1rem", color: "#81968c" }}>/ {total}</span>
                </strong>
                <small>Group-stage fixtures</small>
              </div>
              <div className="metric">
                <div className="label">Points awarded</div>
                <strong>{pts}</strong>
                <small>From recorded results</small>
              </div>
              <div className="metric">
                <div className="label">Qualified</div>
                <strong>{groupComplete ? "4 / 4" : "0 / 4"}</strong>
                <small>Top four after group stage</small>
              </div>
            </div>
            <div className="banner">
              <h3>🏆 The road to the Sequence crown</h3>
              <p>
                Register all teams, shuffle the fixtures, and enter results as matches finish. The points table
                ranks every team and automatically seeds the top four into the semi-finals.
              </p>
              <button type="button" className="gold" onClick={() => navigate("teams")}>
                Set up tournament →
              </button>
            </div>
            <div className="panel">
              <div className="section-title">
                <h3>
                  <span style={{ color: "var(--cyan)" }}>★</span> Current top teams
                </h3>
                <button type="button" className="ghost small" onClick={() => navigate("standings")}>
                  Full standings →
                </button>
              </div>
              <div className="table-wrap" dangerouslySetInnerHTML={{ __html: tableHTML(5) }} />
            </div>
            <div className="panel">
              <h3>
                <span>Next step</span> · Tournament setup
              </h3>
              <div className="notice">
                1. Add every team and both player names. 2. Click <strong>Shuffle & create fixtures</strong>.
                3. Save every match result. 4. Once all group matches are complete, the semi-final bracket
                unlocks automatically.
              </div>
              <div className="button-row">
                <button type="button" className="primary" onClick={() => navigate("teams")}>
                  Register teams
                </button>
                <button type="button" className="ghost" onClick={() => navigate("matches")}>
                  Open fixtures
                </button>
              </div>
            </div>
          </section>

          <section className={`page ${page === "teams" ? "active" : ""}`}>
            <div className="page-head">
              <div>
                <h2>Teams & players</h2>
                <p>Build your team list before generating the randomized round-robin schedule.</p>
              </div>
              <span className="badge">
                {teams.length} TEAM{teams.length === 1 ? "" : "S"}
              </span>
            </div>
            <div className="panel">
              <h3>
                <span>01.</span> Register a team
              </h3>
              <form onSubmit={onAddTeam}>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="teamName">Team name</label>
                    <input id="teamName" name="teamName" required maxLength={45} placeholder="e.g. The Strategists" />
                  </div>
                  <div className="field">
                    <label htmlFor="player1">Player 1</label>
                    <input id="player1" name="player1" required maxLength={45} placeholder="First member" />
                  </div>
                  <div className="field">
                    <label htmlFor="player2">Player 2</label>
                    <input id="player2" name="player2" required maxLength={45} placeholder="Second member" />
                  </div>
                </div>
                <div className="button-row">
                  <button className="primary" type="submit">
                    ＋ Add team
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      if (teams.length && !confirm("Replace your teams with sample teams?")) return;
                      void run(() => tournamentApi.loadSample());
                    }}
                  >
                    Load sample teams
                  </button>
                </div>
              </form>
            </div>
            <div className="panel">
              <div className="section-title">
                <h3>
                  <span>02.</span> Registered teams
                </h3>
                <span className="muted">
                  {teams.length < 2
                    ? "Add at least 2 teams"
                    : `${(teams.length * (teams.length - 1)) / 2} matches will be created`}
                </span>
              </div>
              <div className="team-grid">
                {teams.length ? (
                  teams.map((t, i) => (
                    <div className="team-item" key={t.id}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span className="team-num">{String(i + 1).padStart(2, "0")}</span>
                        <div>
                          <strong>{t.name}</strong>
                          <small>{t.players.join(" & ")}</small>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="danger small"
                        onClick={() => {
                          const hasResults = matches.some((m) => m.played);
                          const msg = hasResults
                            ? `Delete team "${t.name}"? This will remove the team and clear ALL group-stage results and knockout scores because the fixtures must be rebuilt.`
                            : `Delete team "${t.name}"? This will also clear the current fixtures.`;
                          if (!confirm(msg)) return;
                          void run(() => tournamentApi.removeTeam(t.id));
                        }}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="empty">No teams registered yet.</div>
                )}
              </div>
              <div className="button-row" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="gold"
                  onClick={() => {
                    if (matches.some((m) => m.played) && !confirm("Regenerating fixtures clears saved results. Continue?"))
                      return;
                    void run(() => tournamentApi.createFixtures()).then((ok) => ok && navigate("matches"));
                  }}
                >
                  ⤨ Shuffle & create fixtures
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    if (!confirm("Reset all teams, fixtures and results?")) return;
                    void run(() => tournamentApi.reset());
                  }}
                >
                  Reset tournament
                </button>
              </div>
              <p className="muted">
                Shuffling randomizes fixture order and the order of opponents. Every unique team pairing is
                included once.
              </p>
            </div>
          </section>

          <section className={`page ${page === "matches" ? "active" : ""}`}>
            <div className="page-head">
              <div>
                <h2>Group-stage matches</h2>
                <p>Enter each team&apos;s score and save the result. Fixtures include every team pairing once.</p>
              </div>
              <span className="badge">{total ? `${done}/${total} COMPLETE` : "NO FIXTURES"}</span>
            </div>
            <div className="cards">
              <div className="metric">
                <div className="label">Total fixtures</div>
                <strong>{total}</strong>
                <small>Round-robin schedule</small>
              </div>
              <div className="metric">
                <div className="label">Completed</div>
                <strong>{done}</strong>
                <small>Results saved</small>
              </div>
              <div className="metric">
                <div className="label">Remaining</div>
                <strong>{total - done}</strong>
                <small>Awaiting results</small>
              </div>
              <div className="metric">
                <div className="label">Progress</div>
                <strong>{total ? `${Math.round((done / total) * 100)}%` : "0%"}</strong>
                <small>Group stage</small>
              </div>
            </div>
            <div className="button-row" style={{ marginBottom: 15 }}>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  if (matches.some((m) => m.played) && !confirm("Regenerating fixtures clears saved results. Continue?"))
                    return;
                  void run(() => tournamentApi.createFixtures());
                }}
              >
                ⤨ Shuffle fixtures again
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  if (!matches.length) return;
                  if (!confirm("Clear all group-stage results?")) return;
                  void run(() => tournamentApi.clearResults());
                }}
              >
                Clear group results
              </button>
            </div>
            <div className="match-grid">
              {total ? (
                matches.map(matchCard)
              ) : (
                <div className="empty">
                  Register teams, then use Shuffle & create fixtures.
                </div>
              )}
            </div>
          </section>

          <section className={`page ${page === "standings" ? "active" : ""}`}>
            <div className="page-head">
              <div>
                <h2>League standings</h2>
                <p>Live rankings calculated from saved group-stage scores.</p>
              </div>
              <span className="badge">LIVE TABLE</span>
            </div>
            <div className="cards">
              <div className="metric">
                <div className="label">Teams</div>
                <strong>{teams.length}</strong>
                <small>Registered</small>
              </div>
              <div className="metric">
                <div className="label">Played</div>
                <strong>{done}</strong>
                <small>Matches complete</small>
              </div>
              <div className="metric">
                <div className="label">Points on table</div>
                <strong>{pts}</strong>
                <small>Total earned</small>
              </div>
              <div className="metric">
                <div className="label">Group progress</div>
                <strong>{total ? `${Math.round((done / total) * 100)}%` : "0%"}</strong>
                <small>Fixtures complete</small>
              </div>
            </div>
            <div className="panel">
              <div className="section-title">
                <h3>Points table</h3>
                <span className="muted">Top 4 qualify</span>
              </div>
              <div className="table-wrap" dangerouslySetInnerHTML={{ __html: tableHTML() }} />
              <p className="muted">
                Ranking order: points → wins → score difference → total score. If a tie remains, the organizer
                makes the final decision.
              </p>
            </div>
          </section>

          <section className={`page ${page === "knockout" ? "active" : ""}`}>
            <div className="page-head">
              <div>
                <h2>Knockout stage</h2>
                <p>Top four teams advance to the semi-finals and compete for the championship.</p>
              </div>
              <span className="badge">
                {!groupComplete
                  ? "LOCKED"
                  : knockout?.final.scoreA && knockout?.final.scoreB
                    ? "FINAL READY"
                    : "TOP 4 QUALIFIED"}
              </span>
            </div>
            <div className="banner">
              <h3>One step from the final</h3>
              <p>
                Semi-final 1: Rank 1 vs Rank 4 · Semi-final 2: Rank 2 vs Rank 3. Enter a winner for each
                semi-final to set up the grand final.
              </p>
            </div>
            <div id="knockoutContent">{koContent()}</div>
          </section>

          <section className={`page ${page === "rules" ? "active" : ""}`}>
            <div className="page-head">
              <div>
                <h2>Tournament rules</h2>
                <p>One consistent format for every team.</p>
              </div>
              <span className="badge">OFFICIAL FORMAT</span>
            </div>
            <div className="panel">
              <h3>
                <span>01.</span> Group stage
              </h3>
              <ol className="rules-list">
                <li>Each team consists of exactly two members.</li>
                <li>Every team plays every other team once.</li>
                <li>Win = 2 points; loss = 0 points; a draw = 1 point each if draws are allowed.</li>
                <li>Record both teams&apos; scores for each match and save the result.</li>
                <li>The top four teams qualify after all group-stage matches are completed.</li>
              </ol>
            </div>
            <div className="panel">
              <h3>
                <span>02.</span> Semi-finals & final
              </h3>
              <ol className="rules-list">
                <li>Semi-final 1: 1st-ranked team vs 4th-ranked team.</li>
                <li>Semi-final 2: 2nd-ranked team vs 3rd-ranked team.</li>
                <li>Semi-final winners compete in the grand final.</li>
                <li>Knockout matches cannot end in a draw; enter a tiebreak score if needed.</li>
              </ol>
            </div>
            <div className="panel">
              <h3>
                <span>03.</span> Tie-breakers & fair play
              </h3>
              <ol className="rules-list">
                <li>Group ranking: points, then wins, then score difference, then total score.</li>
                <li>If teams are still tied, the organizer decides the ranking.</li>
                <li>Respect opponents and follow the official Sequence game rules.</li>
              </ol>
            </div>
          </section>
        </main>
      </div>

      <footer>
        iConnect Sequence Cup · Organized by Muhammad Shifa Masood · Play smart. Win together.
      </footer>
    </>
  );
}

function MatchScores({
  m,
  a,
  b,
  onUpdate,
}: {
  m: Match;
  a: string;
  b: string;
  onUpdate: (data: TournamentState) => void;
}) {
  const [scoreA, setScoreA] = useState(m.played ? m.scoreA : "");
  const [scoreB, setScoreB] = useState(m.played ? m.scoreB : "");

  useEffect(() => {
    setScoreA(m.played ? m.scoreA : "");
    setScoreB(m.played ? m.scoreB : "");
  }, [m.id, m.played, m.scoreA, m.scoreB]);

  return (
    <>
      <div className="scores">
        <div>
          <label>{a} score</label>
          <input
            type="number"
            min={0}
            step={1}
            placeholder="0"
            value={scoreA}
            disabled={m.played}
            onChange={(e) => setScoreA(e.target.value)}
          />
        </div>
        <div>
          <label>{b} score</label>
          <input
            type="number"
            min={0}
            step={1}
            placeholder="0"
            value={scoreB}
            disabled={m.played}
            onChange={(e) => setScoreB(e.target.value)}
          />
        </div>
      </div>
      <div className="match-bottom">
        <span className="muted">
          {m.played ? `Score ${m.scoreA} – ${m.scoreB}` : "Enter scores to record match"}
        </span>
        {m.played ? (
          <button
            type="button"
            className="ghost small"
            onClick={() =>
              void tournamentApi
                .editMatch(m.id)
                .then(onUpdate)
                .catch((e) => alert(e.message))
            }
          >
            Edit
          </button>
        ) : (
          <button
            type="button"
            className="primary small"
            onClick={() =>
              void tournamentApi
                .saveMatch(m.id, scoreA, scoreB)
                .then(onUpdate)
                .catch((e) => alert(e.message))
            }
          >
            Save result
          </button>
        )}
      </div>
    </>
  );
}

function KoCard({
  title,
  koKey,
  slot,
  teams,
  scores,
  setScores,
  onSave,
  disabled,
}: {
  title: string;
  koKey: string;
  slot: Knockout["semi1"];
  teams: Team[];
  scores?: { a: string; b: string };
  setScores: (v: { a: string; b: string }) => void;
  onSave: (fn: () => Promise<TournamentState>) => Promise<boolean>;
  disabled?: boolean;
}) {
  const a = slot.a != null ? byId(teams, slot.a) : null;
  const b = slot.b != null ? byId(teams, slot.b) : null;
  const winner =
    slot.scoreA !== "" && slot.scoreB !== ""
      ? +slot.scoreA > +slot.scoreB
        ? slot.a
        : slot.b
      : null;
  const sa = scores?.a ?? slot.scoreA;
  const sb = scores?.b ?? slot.scoreB;

  return (
    <div className="bracket-card">
      <h4>{title}</h4>
      <div className={`bracket-team ${winner === slot.a ? "winner" : ""}`}>
        <span>{a?.name ?? "TBD"}</span>
        <strong>{slot.scoreA !== "" ? slot.scoreA : "—"}</strong>
      </div>
      <div className={`bracket-team ${winner === slot.b ? "winner" : ""}`}>
        <span>{b?.name ?? "TBD"}</span>
        <strong>{slot.scoreB !== "" ? slot.scoreB : "—"}</strong>
      </div>
      {a && b && !disabled ? (
        <>
          <div className="scores">
            <div>
              <label>{a.name} score</label>
              <input
                type="number"
                min={0}
                value={sa}
                placeholder="0"
                onChange={(e) => setScores({ a: e.target.value, b: sb })}
              />
            </div>
            <div>
              <label>{b.name} score</label>
              <input
                type="number"
                min={0}
                value={sb}
                placeholder="0"
                onChange={(e) => setScores({ a: sa, b: e.target.value })}
              />
            </div>
          </div>
          <button
            type="button"
            className="primary small"
            style={{ marginTop: 12, width: "100%" }}
            onClick={() =>
              void onSave(() => tournamentApi.saveKnockout(koKey, sa, sb))
            }
          >
            Save winner
          </button>
        </>
      ) : (
        <p className="muted">{disabled ? "Waiting for the previous round." : "Waiting for the previous round."}</p>
      )}
    </div>
  );
}
