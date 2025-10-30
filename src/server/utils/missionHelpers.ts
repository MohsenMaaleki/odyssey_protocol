// server/utils/missionHelpers.ts
// Helper utilities for mission logic

export const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const nowIso = () => new Date().toISOString();

export function uniquePush<T>(arr: T[], v: T) {
  if (!arr.includes(v)) arr.push(v);
}

export function generateMissionId(): string {
  const num = Math.floor(Math.random() * 1e6);
  return `OP-${num.toString().padStart(6, '0')}`;
}
