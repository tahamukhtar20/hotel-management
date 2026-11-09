import { Hono, type Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { endSession, getSession, hashPassword, startSession, verifyPassword, type Session } from "./auth";
import * as db from "./db";
import { resetDatabase } from "./seed";
import { addDays, DEMO_ACCOUNTS, isDate, nightsBetween, ROOM_TYPES, today, type Env } from "./types";
import * as views from "./views";

const app = new Hono<Env>();

// Fill an empty database on first use (fresh deploys and local dev).
let seeded = false;
app.use(async (c, next) => {
  if (!seeded) {
    const row = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM rooms").first<{ n: number }>();
    if (!row?.n) await resetDatabase(c.env.DB);
    seeded = true;
  }
  await next();
});

// Short messages shown after a redirect, chosen by code so URLs can't inject text.
const NOTICES: Record<string, views.Notice> = {
  "login-failed": { type: "danger", text: "That email and password don't match an account." },
  "login-first": { type: "info", text: "Log in to book a room." },
  "staff-only": { type: "info", text: "Log in with a staff account to see that page." },
  "signed-up": { type: "success", text: "Account created. You can log in now." },
  "added": { type: "success", text: "Added to your cart." },
  "already-in-cart": { type: "info", text: "That room is already in your cart for those dates." },
  "taken": { type: "danger", text: "Some rooms were booked by someone else meanwhile and were removed from your cart." },
  "service-added": { type: "success", text: "Service added." },
  "cancelled": { type: "success", text: "Booking cancelled." },
  "checked-out": { type: "success", text: "Guest checked out." },
  "not-found": { type: "danger", text: "No booking with that number." },
};

async function page(c: Context<Env>, title: string, body: ReturnType<typeof views.layout> | Parameters<typeof views.layout>[1], notice?: views.Notice) {
  const session = await getSession(c);
  return c.html(
    views.layout(title, body, {
      session,
      cartCount: readCart(c).length,
      notice: notice ?? NOTICES[c.req.query("n") ?? ""] ?? null,
    }),
  );
}

// ---------- cart (a cookie of {room, checkIn, checkOut}; everything is re-checked at checkout) ----------

function readCart(c: Context<Env>): db.CartItem[] {
  try {
    const items = JSON.parse(getCookie(c, "cart") ?? "[]");
    return Array.isArray(items)
      ? items.filter((i) => typeof i?.room === "string" && isDate(i.checkIn) && isDate(i.checkOut)).slice(0, 10)
      : [];
  } catch {
    return [];
  }
}

function writeCart(c: Context<Env>, items: db.CartItem[]) {
  setCookie(c, "cart", JSON.stringify(items), { path: "/", sameSite: "Lax", httpOnly: true, maxAge: 7 * 24 * 3600 });
}

// ---------- guards ----------

async function guest(c: Context<Env>) {
  const s = await getSession(c);
  return s?.kind === "guest" ? s : null;
}

async function staff(c: Context<Env>, role?: string) {
  const s = await getSession(c);
  return s?.kind === "staff" && (!role || s.role === role) ? s : null;
}

// ---------- public pages ----------

app.get("/", (c) => c.html(views.layout("Welcome", views.welcome(), { bare: true })));

app.get("/login", (c) => page(c, "Log in", views.login()));
app.post("/login", async (c) => {
  const form = await c.req.parseBody();
  const email = String(form.email ?? "").trim();
  const user = await c.env.DB.prepare("SELECT id, name, password_hash FROM customers WHERE email = ?")
    .bind(email)
    .first<{ id: number; name: string; password_hash: string }>();
  if (!user || !(await verifyPassword(String(form.password ?? ""), user.password_hash))) {
    return page(c, "Log in", views.login(email), NOTICES["login-failed"]);
  }
  await startSession(c, { kind: "guest", id: user.id, name: user.name });
  return c.redirect("/book");
});

app.get("/signup", (c) => page(c, "Sign up", views.signup()));
app.post("/signup", async (c) => {
  const f = Object.fromEntries(Object.entries(await c.req.parseBody()).map(([k, v]) => [k, String(v).trim()]));
  const fail = (text: string) => page(c, "Sign up", views.signup(f), { type: "danger", text });
  if (!f.first || !f.last || !f.email) return fail("Fill in every field.");
  if (!isDate(f.dob)) return fail("Enter a valid date of birth.");
  if ((f.password ?? "").length < 8) return fail("Use a password of at least 8 characters.");
  if (f.password !== f.confirm) return fail("The passwords don't match.");
  const exists = await c.env.DB.prepare("SELECT 1 FROM customers WHERE email = ?").bind(f.email).first();
  if (exists) return fail("An account with that email already exists.");
  await c.env.DB.prepare("INSERT INTO customers (name, email, password_hash, dob) VALUES (?, ?, ?, ?)")
    .bind(`${f.first} ${f.last}`, f.email, await hashPassword(f.password), f.dob)
    .run();
  return c.redirect("/login?n=signed-up");
});

app.post("/logout", (c) => {
  endSession(c);
  writeCart(c, []);
  return c.redirect("/");
});

// One-click demo sign-in.
app.post("/demo/:role", async (c) => {
  const role = c.req.param("role") as keyof typeof DEMO_ACCOUNTS;
  const email = DEMO_ACCOUNTS[role];
  if (!email) return c.notFound();
  if (role === "guest") {
    const u = await c.env.DB.prepare("SELECT id, name FROM customers WHERE email = ?").bind(email).first<{ id: number; name: string }>();
    await startSession(c, { kind: "guest", id: u!.id, name: u!.name });
    return c.redirect("/book");
  }
  const e = await c.env.DB.prepare("SELECT id, name, designation FROM employees WHERE email = ?")
    .bind(email)
    .first<{ id: string; name: string; designation: string }>();
  await startSession(c, { kind: "staff", id: e!.id, name: e!.name, role: e!.designation });
  return c.redirect(e!.designation === "Manager" ? "/manager" : "/front-desk");
});

// ---------- guests ----------

app.get("/book", async (c) => {
  if (!(await guest(c))) return c.redirect("/login?n=login-first");
  const min = today();
  const max = addDays(min, 90);
  const q = c.req.query();
  let checkIn = isDate(q.checkIn) && q.checkIn >= min && q.checkIn <= max ? q.checkIn : min;
  let checkOut = isDate(q.checkOut) && q.checkOut > checkIn ? q.checkOut : addDays(checkIn, 1);
  if (nightsBetween(checkIn, checkOut) > 30) checkOut = addDays(checkIn, 30);
  const type = (ROOM_TYPES as readonly string[]).includes(q.type) ? q.type : "Economic";
  const beds = q.beds === "3" ? 3 : 2;
  const searched = "checkIn" in q;
  const rooms = searched ? await db.availableRooms(c.env.DB, type, beds, checkIn, checkOut) : null;
  // Hide rooms already in the cart for overlapping dates.
  const cart = readCart(c);
  const visible = rooms?.filter((r) => !cart.some((i) => i.room === r.room_no && i.checkIn < checkOut && i.checkOut > checkIn)) ?? null;
  return page(c, "Book a room", views.book({ checkIn, checkOut, type, beds, min, max }, visible));
});

app.post("/cart/add", async (c) => {
  if (!(await guest(c))) return c.redirect("/login?n=login-first");
  const f = await c.req.parseBody();
  const item = { room: String(f.room), checkIn: String(f.checkIn), checkOut: String(f.checkOut) };
  if (!isDate(item.checkIn) || !isDate(item.checkOut) || item.checkOut <= item.checkIn) return c.redirect("/book");
  const cart = readCart(c);
  if (cart.some((i) => i.room === item.room && i.checkIn < item.checkOut && i.checkOut > item.checkIn)) {
    return c.redirect("/cart?n=already-in-cart");
  }
  writeCart(c, [...cart, item]);
  return c.redirect("/cart?n=added");
});

app.post("/cart/remove", async (c) => {
  const f = await c.req.parseBody();
  writeCart(c, readCart(c).filter((i) => !(i.room === f.room && i.checkIn === f.checkIn)));
  return c.redirect("/cart");
});

app.get("/cart", async (c) => {
  if (!(await guest(c))) return c.redirect("/login?n=login-first");
  const cart = readCart(c);
  const rooms = await db.roomsByNumber(c.env.DB, cart.map((i) => i.room));
  const items = cart.filter((i) => rooms.has(i.room)).map((i) => ({ ...i, ...rooms.get(i.room)! }));
  return page(c, "Cart", views.cart(items));
});

app.post("/checkout", async (c) => {
  const s = await guest(c);
  if (!s) return c.redirect("/login?n=login-first");
  const cart = readCart(c).filter((i) => i.checkIn >= today());
  if (!cart.length) return c.redirect("/cart");
  const result = await db.createBooking(c.env.DB, s.id, cart);
  if ("taken" in result) {
    writeCart(c, cart.filter((i) => !result.taken!.includes(i.room)));
    return c.redirect("/cart?n=taken");
  }
  writeCart(c, []);
  return c.redirect(`/bookings/${result.id}`);
});

app.get("/my-bookings", async (c) => {
  const s = await guest(c);
  if (!s) return c.redirect("/login?n=login-first");
  return page(c, "My bookings", views.myBookings(await db.customerBookings(c.env.DB, s.id)));
});

app.get("/bookings/:id", async (c) => {
  const s = await getSession(c);
  if (!s) return c.redirect("/login?n=login-first");
  const inv = await db.invoice(c.env.DB, Number(c.req.param("id")));
  // Guests only see their own invoices; staff see all.
  if (!inv || (s.kind === "guest" && inv.customer_id !== s.id)) return c.notFound();
  return page(c, `Booking #${inv.id}`, views.invoicePage(inv, s.kind === "guest" ? { href: "/my-bookings", label: "My bookings" } : { href: "/front-desk", label: "Front desk" }));
});

// ---------- staff ----------

app.get("/staff/login", (c) => page(c, "Staff login", views.staffLogin()));
app.post("/staff/login", async (c) => {
  const form = await c.req.parseBody();
  const email = String(form.email ?? "").trim();
  const e = await c.env.DB.prepare("SELECT id, name, designation, password_hash FROM employees WHERE email = ?")
    .bind(email)
    .first<{ id: string; name: string; designation: string; password_hash: string }>();
  if (!e || !(await verifyPassword(String(form.password ?? ""), e.password_hash))) {
    return page(c, "Staff login", views.staffLogin(email), NOTICES["login-failed"]);
  }
  if (e.designation !== "Manager" && e.designation !== "Front Desk") {
    return page(c, "Staff login", views.staffLogin(email), { type: "info", text: "Only the manager and front desk staff have access here." });
  }
  await startSession(c, { kind: "staff", id: e.id, name: e.name, role: e.designation });
  return c.redirect(e.designation === "Manager" ? "/manager" : "/front-desk");
});

app.post("/staff/logout", (c) => {
  endSession(c);
  return c.redirect("/staff/login");
});

app.get("/front-desk", async (c) => {
  if (!(await staff(c))) return c.redirect("/staff/login?n=staff-only");
  const [stays, services] = await Promise.all([db.activeStays(c.env.DB), db.services(c.env.DB)]);
  return page(c, "Front desk", views.frontDesk(stays, services, today()));
});

app.post("/front-desk/services", async (c) => {
  if (!(await staff(c))) return c.redirect("/staff/login?n=staff-only");
  const f = await c.req.parseBody();
  const booking = Number(f.booking);
  const quantity = Number(f.quantity);
  const error =
    !Number.isInteger(booking) || booking < 1
      ? "Enter a booking number."
      : !Number.isInteger(quantity) || quantity < 1 || quantity > 20
        ? "Quantity must be between 1 and 20."
        : await db.addService(c.env.DB, booking, String(f.service), quantity);
  if (error) {
    const [stays, services] = await Promise.all([db.activeStays(c.env.DB), db.services(c.env.DB)]);
    return page(c, "Front desk", views.frontDesk(stays, services, today()), { type: "danger", text: error });
  }
  return c.redirect("/front-desk?n=service-added");
});

app.post("/front-desk/bookings/:id/:action{cancel|check-out}", async (c) => {
  if (!(await staff(c))) return c.redirect("/staff/login?n=staff-only");
  const action = c.req.param("action");
  await db.setBookingStatus(c.env.DB, Number(c.req.param("id")), action === "cancel" ? "cancelled" : "checked_out");
  return c.redirect(`/front-desk?n=${action === "cancel" ? "cancelled" : "checked-out"}`);
});

app.get("/front-desk/bill", (c) => c.redirect(`/front-desk/bill/${Number(c.req.query("booking")) || 0}`));
app.get("/front-desk/bill/:id", async (c) => {
  if (!(await staff(c))) return c.redirect("/staff/login?n=staff-only");
  const inv = await db.invoice(c.env.DB, Number(c.req.param("id")));
  if (!inv) return c.redirect("/front-desk?n=not-found");
  return page(c, `Bill #${inv.id}`, views.invoicePage(inv, { href: "/front-desk", label: "Front desk" }));
});

app.get("/manager", async (c) => {
  if (!(await staff(c, "Manager"))) return c.redirect("/staff/login?n=staff-only");
  return page(c, "Manager", views.manager(await db.managerOverview(c.env.DB)));
});

app.notFound((c) => c.html(views.layout("Not found", views.raw(`<h1 class="h3">Page not found</h1><p><a href="/">Back to the start</a></p>`)), 404));

export default {
  fetch: app.fetch,
  // Nightly reset keeps the public demo tidy.
  async scheduled(_event: ScheduledController, env: Env["Bindings"]) {
    await resetDatabase(env.DB);
  },
} satisfies ExportedHandler<Env["Bindings"]>;

export type { Session };
