import type { TournamentState } from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  }
  return data as T;
}

export const tournamentApi = {
  load: () => request<TournamentState>("/api/tournament"),
  importBackup: (state: TournamentState) =>
    request<TournamentState>("/api/tournament", { method: "PUT", body: JSON.stringify(state) }),
  reset: () => request<TournamentState>("/api/tournament", { method: "DELETE" }),
  addTeam: (name: string, player1: string, player2: string) =>
    request<TournamentState>("/api/teams", {
      method: "POST",
      body: JSON.stringify({ name, player1, player2 }),
    }),
  removeTeam: (id: number) =>
    request<TournamentState>(`/api/teams/${id}`, { method: "DELETE" }),
  loadSample: () => request<TournamentState>("/api/teams/sample", { method: "POST" }),
  createFixtures: () => request<TournamentState>("/api/fixtures", { method: "POST" }),
  saveMatch: (id: number, scoreA: string, scoreB: string) =>
    request<TournamentState>(`/api/matches/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ scoreA, scoreB }),
    }),
  editMatch: (id: number) =>
    request<TournamentState>(`/api/matches/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "edit" }),
    }),
  clearResults: () => request<TournamentState>("/api/matches/clear", { method: "POST" }),
  saveKnockout: (key: string, scoreA: string, scoreB: string) =>
    request<TournamentState>("/api/knockout", {
      method: "PATCH",
      body: JSON.stringify({ key, scoreA, scoreB }),
    }),
};
