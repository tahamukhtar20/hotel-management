// Demo data. The whole database is wiped and refilled by resetDatabase(), which runs on the
// first request to an empty database and every night from the cron trigger. Dates are
// relative to the day it runs, so there are always current and upcoming stays to look at.

import { hashPassword } from "./auth";
import { addDays, DEMO_ACCOUNTS, DEMO_PASSWORD, nightsBetween, today } from "./types";

const ROOMS: [string, string, number, number][] = [];
for (const [floor, type, prices] of [
  [1, "Economic", [80, 100]],
  [2, "Luxury", [150, 180]],
  [3, "VIP", [300, 360]],
] as const) {
  for (let n = 1; n <= 8; n++) {
    const beds = n <= 5 ? 2 : 3;
    ROOMS.push([`${floor}0${n}`, type, beds, prices[beds === 2 ? 0 : 1]]);
  }
}

const SERVICES = [
  ["S1", "Banquet", 40, 120, 70],
  ["S2", "Drinks", 300, 8, 3],
  ["S3", "Room Service", 200, 25, 12],
  ["S4", "Laundry", 150, 15, 6],
] as const;

// Fictional people. Demo accounts come first.
const EMPLOYEES = [
  ["E01", "Amara Okafor", "Manager", 6500, null, DEMO_ACCOUNTS.manager],
  ["E02", "Lukas Brenner", "Front Desk", 3200, "E01", DEMO_ACCOUNTS.frontdesk],
  ["E03", "Sofia Marquez", "Front Desk", 3100, "E01", "sofia@demo.hotel"],
  ["E04", "Kenji Watanabe", "Chef", 4200, "E01", "kenji@demo.hotel"],
  ["E05", "Nadia Haddad", "Housekeeping", 2600, "E01", "nadia@demo.hotel"],
  ["E06", "Tomasz Nowak", "Housekeeping", 2500, "E01", "tomasz@demo.hotel"],
  ["E07", "Priya Raman", "Accounts", 3800, "E01", "priya@demo.hotel"],
] as const;

const CUSTOMERS = [
  ["Demo Guest", DEMO_ACCOUNTS.guest, "1994-05-12"],
  ["Elena Petrova", "elena@example.com", "1988-09-03"],
  ["Marcus Lee", "marcus@example.com", "1979-01-22"],
  ["Hana Suzuki", "hana@example.com", "1996-07-14"],
  ["Omar Farouk", "omar@example.com", "1985-11-30"],
  ["Grace Mensah", "grace@example.com", "1991-03-08"],
  ["Diego Alvarez", "diego@example.com", "1983-12-17"],
] as const;

// Two weeks of past stays plus current and upcoming ones. Each room gets back-to-back stays
// of 2 to 4 nights with gaps of 1 to 3 days (about 60% occupancy), so stays never overlap.
// [customer index, room, check-in offset from today, nights, services [id, qty][]]
const SERVICE_PICKS: [string, number][][] = [[["S3", 2]], [["S2", 6], ["S4", 2]], [], [["S1", 1], ["S2", 8]], [["S4", 1]], [["S3", 1]]];
const BOOKINGS: [number, string, number, number, [string, number][]][] = [];
ROOMS.forEach(([room], k) => {
  // Arrivals stop two days out, so there's plenty to book when trying the demo.
  for (let j = 0, offset = -14 + (k % 4); offset <= 2; j++) {
    const nights = 2 + ((k + j) % 3);
    const n = BOOKINGS.length;
    BOOKINGS.push([1 + (n % 6), room, offset, nights, offset <= 0 ? SERVICE_PICKS[n % 6] : []]);
    offset += nights + 1 + ((k * 2 + j) % 3);
  }
});
// The demo guest is in house today.
const inHouse = BOOKINGS.find(([, , offset, nights]) => offset <= 0 && offset + nights > 1);
if (inHouse) inHouse[0] = 0;

export async function resetDatabase(db: D1Database) {
  const day = today();
  const hash = await hashPassword(DEMO_PASSWORD); // one hash for every demo account
  const statements: D1PreparedStatement[] = [
    "booked_services", "booked_rooms", "restocking", "bookings", "hotel_expenses", "services", "rooms", "customers", "employees",
  ].map((table) => db.prepare(`DELETE FROM ${table}`));

  const push = (sql: string, ...args: unknown[]) => statements.push(db.prepare(sql).bind(...args));
  for (const room of ROOMS) push("INSERT INTO rooms VALUES (?, ?, ?, ?)", ...room);
  for (const s of SERVICES) push("INSERT INTO services VALUES (?, ?, ?, ?, ?)", ...s);
  for (const [id, name, designation, salary, manager, email] of EMPLOYEES)
    push("INSERT INTO employees VALUES (?, ?, ?, ?, ?, ?, ?)", id, name, designation, salary, manager, email, hash);
  CUSTOMERS.forEach(([name, email, dob], i) =>
    push("INSERT INTO customers (id, name, email, password_hash, dob) VALUES (?, ?, ?, ?, ?)", i + 1, name, email, hash, dob),
  );

  const price = new Map(ROOMS.map(([no, , , p]) => [no, p]));
  BOOKINGS.forEach(([customer, room, offset, nights, services], i) => {
    const id = i + 1;
    const checkIn = addDays(day, offset);
    const checkOut = addDays(checkIn, nights);
    const created = addDays(checkIn, -3);
    const status = checkOut <= day ? "checked_out" : "active";
    push("INSERT INTO bookings VALUES (?, ?, ?, ?, ?)", id, customer + 1, created, price.get(room)! * nightsBetween(checkIn, checkOut), status);
    push("INSERT INTO booked_rooms VALUES (?, ?, ?, ?)", id, room, checkIn, checkOut);
    for (const [service, qty] of services) {
      const on = checkIn < day ? addDays(checkIn, 1) : day;
      push("INSERT INTO booked_services VALUES (?, ?, ?, ?)", id, service, qty, on);
      push("UPDATE services SET stock = stock - ? WHERE id = ?", qty, service);
      push(
        "INSERT INTO restocking VALUES (?, ?, ?) ON CONFLICT (day, service_id) DO UPDATE SET quantity = quantity + excluded.quantity",
        on, service, qty,
      );
    }
  });

  // Daily expenses for the last two weeks.
  const salaries = EMPLOYEES.reduce((sum, e) => sum + e[3], 0);
  for (let back = 13; back >= 0; back--) {
    const d = addDays(day, -back);
    push("INSERT INTO hotel_expenses VALUES (?, ?, ?, ?)", d, 140 + ((back * 37) % 90), 0, Math.round(salaries / 30));
  }
  // Restocking bills follow the stock actually used.
  push(`UPDATE hotel_expenses SET restocking_bill = COALESCE((
          SELECT SUM(r.quantity * s.original_price) FROM restocking r JOIN services s ON s.id = r.service_id
          WHERE r.day = hotel_expenses.day), 0)`);

  await db.batch(statements);
}
