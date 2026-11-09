export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  SESSION_SECRET: string;
};

export type Env = { Bindings: Bindings };

export const ROOM_TYPES = ["Economic", "Luxury", "VIP"] as const;
export const DEMO_PASSWORD = "demo1234";
export const DEMO_ACCOUNTS = {
  guest: "guest@demo.hotel",
  frontdesk: "frontdesk@demo.hotel",
  manager: "manager@demo.hotel",
} as const;

/** Today's date in UTC as YYYY-MM-DD. */
export const today = () => new Date().toISOString().slice(0, 10);

export function addDays(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000);
}

export const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
