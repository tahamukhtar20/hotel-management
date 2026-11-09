// All database access. Every query is parameterised.

import { nightsBetween, today } from "./types";

export type Room = { room_no: string; room_type: string; beds: number; price: number };
export type CartItem = { room: string; checkIn: string; checkOut: string };

/** Rooms of a type and size that are free for the whole stay (check-out day is free again). */
export async function availableRooms(db: D1Database, type: string, beds: number, checkIn: string, checkOut: string) {
  const { results } = await db
    .prepare(
      `SELECT r.* FROM rooms r
       WHERE r.room_type = ? AND r.beds = ? AND NOT EXISTS (
         SELECT 1 FROM booked_rooms br JOIN bookings b ON b.id = br.booking_id
         WHERE br.room_no = r.room_no AND b.status != 'cancelled'
           AND br.check_in < ? AND br.check_out > ?)
       ORDER BY r.room_no`,
    )
    .bind(type, beds, checkOut, checkIn)
    .all<Room>();
  return results;
}

export async function roomsByNumber(db: D1Database, numbers: string[]) {
  if (!numbers.length) return new Map<string, Room>();
  const { results } = await db
    .prepare(`SELECT * FROM rooms WHERE room_no IN (${numbers.map(() => "?").join(",")})`)
    .bind(...numbers)
    .all<Room>();
  return new Map(results.map((r) => [r.room_no, r]));
}

/** Books every cart item in one booking. Returns the booking id, or the rooms that are no longer free. */
export async function createBooking(db: D1Database, customerId: number, cart: CartItem[]) {
  const rooms = await roomsByNumber(db, cart.map((i) => i.room));
  const taken: string[] = [];
  for (const item of cart) {
    const room = rooms.get(item.room);
    const free = room && (await availableRooms(db, room.room_type, room.beds, item.checkIn, item.checkOut)).some((r) => r.room_no === item.room);
    if (!free) taken.push(item.room);
  }
  if (taken.length) return { taken };

  const amount = cart.reduce((sum, i) => sum + rooms.get(i.room)!.price * nightsBetween(i.checkIn, i.checkOut), 0);
  const booking = await db
    .prepare("INSERT INTO bookings (customer_id, created_on, room_amount) VALUES (?, ?, ?) RETURNING id")
    .bind(customerId, today(), amount)
    .first<{ id: number }>();
  await db.batch(
    cart.map((i) => db.prepare("INSERT INTO booked_rooms VALUES (?, ?, ?, ?)").bind(booking!.id, i.room, i.checkIn, i.checkOut)),
  );
  return { id: booking!.id };
}

export type Invoice = {
  id: number;
  customer_id: number;
  customer: string;
  email: string;
  status: string;
  created_on: string;
  rooms: (Room & { check_in: string; check_out: string; nights: number; total: number })[];
  services: { service_type: string; quantity: number; price: number; total: number }[];
  roomTotal: number;
  serviceTotal: number;
};

export async function invoice(db: D1Database, bookingId: number): Promise<Invoice | null> {
  const booking = await db
    .prepare(
      `SELECT b.id, b.customer_id, b.status, b.created_on, c.name AS customer, c.email
       FROM bookings b JOIN customers c ON c.id = b.customer_id WHERE b.id = ?`,
    )
    .bind(bookingId)
    .first<Omit<Invoice, "rooms" | "services" | "roomTotal" | "serviceTotal">>();
  if (!booking) return null;
  const [rooms, services] = await db.batch([
    db.prepare(
      `SELECT r.*, br.check_in, br.check_out FROM booked_rooms br JOIN rooms r ON r.room_no = br.room_no
       WHERE br.booking_id = ? ORDER BY br.check_in, r.room_no`,
    ).bind(bookingId),
    db.prepare(
      `SELECT s.service_type, bs.quantity, s.price_for_sale AS price, bs.quantity * s.price_for_sale AS total
       FROM booked_services bs JOIN services s ON s.id = bs.service_id WHERE bs.booking_id = ? ORDER BY s.service_type`,
    ).bind(bookingId),
  ]);
  const roomRows = (rooms.results as (Room & { check_in: string; check_out: string })[]).map((r) => {
    const nights = nightsBetween(r.check_in, r.check_out);
    return { ...r, nights, total: nights * r.price };
  });
  const serviceRows = services.results as Invoice["services"];
  return {
    ...booking,
    rooms: roomRows,
    services: serviceRows,
    roomTotal: roomRows.reduce((s, r) => s + r.total, 0),
    serviceTotal: serviceRows.reduce((s, r) => s + r.total, 0),
  };
}

export async function customerBookings(db: D1Database, customerId: number) {
  const { results } = await db
    .prepare(
      `SELECT b.id, b.status, b.room_amount, MIN(br.check_in) AS check_in, MAX(br.check_out) AS check_out,
              GROUP_CONCAT(br.room_no, ', ') AS rooms
       FROM bookings b JOIN booked_rooms br ON br.booking_id = b.id
       WHERE b.customer_id = ? GROUP BY b.id ORDER BY check_in DESC`,
    )
    .bind(customerId)
    .all<{ id: number; status: string; room_amount: number; check_in: string; check_out: string; rooms: string }>();
  return results;
}

/** Current and upcoming stays, for the front desk. */
export async function activeStays(db: D1Database) {
  const { results } = await db
    .prepare(
      `SELECT b.id, c.name, br.room_no, br.check_in, br.check_out
       FROM bookings b JOIN customers c ON c.id = b.customer_id JOIN booked_rooms br ON br.booking_id = b.id
       WHERE b.status = 'active' AND br.check_out > ?
       ORDER BY br.check_in, b.id, br.room_no`,
    )
    .bind(today())
    .all<{ id: number; name: string; room_no: string; check_in: string; check_out: string }>();
  return results;
}

export async function services(db: D1Database) {
  const { results } = await db
    .prepare("SELECT * FROM services ORDER BY service_type")
    .all<{ id: string; service_type: string; stock: number; price_for_sale: number; original_price: number }>();
  return results;
}

/** Adds a service to a booking whose guests are in the hotel today. Returns an error message or null. */
export async function addService(db: D1Database, bookingId: number, serviceId: string, quantity: number): Promise<string | null> {
  const day = today();
  const stay = await db
    .prepare(
      `SELECT 1 FROM bookings b JOIN booked_rooms br ON br.booking_id = b.id
       WHERE b.id = ? AND b.status = 'active' AND br.check_in <= ? AND br.check_out > ? LIMIT 1`,
    )
    .bind(bookingId, day, day)
    .first();
  if (!stay) return `Booking ${bookingId} has no guests in the hotel today.`;
  const service = await db.prepare("SELECT stock FROM services WHERE id = ?").bind(serviceId).first<{ stock: number }>();
  if (!service) return "Unknown service.";
  if (service.stock < quantity) return `Only ${service.stock} left in stock.`;
  await db.batch([
    db.prepare(
      `INSERT INTO booked_services VALUES (?, ?, ?, ?)
       ON CONFLICT (booking_id, service_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
    ).bind(bookingId, serviceId, quantity, day),
    db.prepare("UPDATE services SET stock = stock - ? WHERE id = ?").bind(quantity, serviceId),
    db.prepare(
      `INSERT INTO restocking VALUES (?, ?, ?)
       ON CONFLICT (day, service_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
    ).bind(day, serviceId, quantity),
  ]);
  return null;
}

export async function setBookingStatus(db: D1Database, bookingId: number, status: "cancelled" | "checked_out") {
  await db.prepare("UPDATE bookings SET status = ? WHERE id = ? AND status = 'active'").bind(status, bookingId).run();
}

/** Everything on the manager's page. */
export async function managerOverview(db: D1Database) {
  const day = today();
  const [current, staff, profit, expenses] = await db.batch([
    db.prepare(
      `SELECT b.id, c.name, c.email, MIN(br.check_in) AS check_in, MAX(br.check_out) AS check_out, GROUP_CONCAT(br.room_no, ', ') AS rooms
       FROM bookings b JOIN customers c ON c.id = b.customer_id JOIN booked_rooms br ON br.booking_id = b.id
       WHERE b.status = 'active' AND br.check_in <= ? AND br.check_out > ?
       GROUP BY b.id ORDER BY b.id`,
    ).bind(day, day),
    db.prepare("SELECT id, name, designation, salary FROM employees ORDER BY id"),
    // Revenue per day: one night's price for every room occupied that night, plus services sold that day.
    db.prepare(
      `SELECT e.day,
              COALESCE((SELECT SUM(r.price) FROM booked_rooms br JOIN rooms r ON r.room_no = br.room_no
                        JOIN bookings b ON b.id = br.booking_id
                        WHERE b.status != 'cancelled' AND br.check_in <= e.day AND br.check_out > e.day), 0)
            + COALESCE((SELECT SUM(bs.quantity * s.price_for_sale) FROM booked_services bs JOIN services s ON s.id = bs.service_id
                        WHERE bs.added_on = e.day), 0) AS revenue,
              e.management_bills + e.restocking_bill + e.salary_expense AS expenses
       FROM hotel_expenses e ORDER BY e.day DESC LIMIT 10`,
    ),
    db.prepare("SELECT * FROM hotel_expenses ORDER BY day DESC LIMIT 10"),
  ]);
  return {
    current: current.results as { id: number; name: string; email: string; check_in: string; check_out: string; rooms: string }[],
    staff: staff.results as { id: string; name: string; designation: string; salary: number }[],
    profit: (profit.results as { day: string; revenue: number; expenses: number }[]).map((r) => ({ ...r, profit: r.revenue - r.expenses })),
    expenses: expenses.results as { day: string; management_bills: number; restocking_bill: number; salary_expense: number }[],
  };
}
