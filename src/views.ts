// Server-rendered pages. `html` escapes every interpolated value unless it is itself html``.

import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { Session } from "./auth";
import type { CartItem, customerBookings, Invoice, managerOverview, Room } from "./db";
import { DEMO_PASSWORD, nightsBetween, ROOM_TYPES } from "./types";

type Html = HtmlEscapedString | Promise<HtmlEscapedString>;

const money = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-US")}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const shortDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const BOOTSTRAP = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
const FONT = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";

export type Notice = { type: "success" | "danger" | "info"; text: string } | null;

const typeBadge = (type: string) => html`<span class="badge room-${type.toLowerCase()}">${type}</span>`;
const statusBadge = (status: string) => {
  const label = status.replace("_", " ");
  const cls = status === "active" ? "text-bg-success" : status === "cancelled" ? "text-bg-danger" : "text-bg-secondary";
  return html`<span class="badge ${cls} text-capitalize">${label}</span>`;
};

function nav(session: Session | null, cartCount: number, current: string) {
  const link = (href: string, label: string) =>
    html`<a class="nav-pill ${current === href ? "active" : ""}" href="${href}">${label}</a>`;
  const logout = (action: string) =>
    html`<form method="post" action="${action}" class="d-inline"><button class="nav-pill nav-pill-ghost">Log out</button></form>`;
  let links;
  if (session?.kind === "staff") {
    links = html`${session.role === "Manager" ? link("/manager", "Overview") : ""} ${link("/front-desk", "Front desk")} ${logout("/staff/logout")}`;
  } else if (session?.kind === "guest") {
    links = html`${link("/book", "Book")} ${link("/my-bookings", "My bookings")}
      ${link("/cart", cartCount ? `Cart · ${cartCount}` : "Cart")} ${logout("/logout")}`;
  } else {
    links = html`${link("/login", "Log in")} ${link("/signup", "Sign up")} ${link("/staff/login", "Staff")}`;
  }
  return html`<nav class="topbar">
    <div class="container d-flex flex-wrap align-items-center justify-content-between gap-2 py-2">
      <a class="brand" href="/"><span class="brand-mark">H</span>Hotel</a>
      <div class="d-flex flex-wrap gap-1 align-items-center">
        ${session ? html`<span class="who d-none d-md-inline">${session.name}${session.kind === "staff" ? ` · ${session.role}` : ""}</span>` : ""}
        ${links}
      </div>
    </div>
  </nav>`;
}

export function layout(
  title: string,
  body: Html,
  opts: { session?: Session | null; cartCount?: number; notice?: Notice; bare?: boolean; current?: string } = {},
) {
  return html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title} · Hotel Management System</title>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link rel="stylesheet" href="${FONT}" />
        <link rel="stylesheet" href="${BOOTSTRAP}" />
        <link rel="stylesheet" href="/style.css" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body class="${opts.bare ? "screen-welcome" : "app d-flex flex-column min-vh-100"}">
        ${opts.bare ? "" : nav(opts.session ?? null, opts.cartCount ?? 0, opts.current ?? "")}
        <main class="${opts.bare ? "" : "container py-4 py-md-5 flex-grow-1"}">
          ${opts.notice ? html`<div class="alert alert-${opts.notice.type} shadow-sm" role="alert">${opts.notice.text}</div>` : ""}
          ${body}
        </main>
        ${opts.bare
          ? ""
          : html`<footer class="site-footer">
              <div class="container d-flex flex-wrap justify-content-between gap-2">
                <span>Hotel Management System</span><span>Demo data resets every night</span>
              </div>
            </footer>`}
      </body>
    </html>`;
}

const pageHead = (title: string, sub?: Html | string, actions?: Html) => html`
  <div class="page-head d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
    <div><h1 class="h2 mb-1">${title}</h1>${sub ? html`<p class="text-secondary mb-0">${sub}</p>` : ""}</div>
    ${actions ?? ""}
  </div>`;

// ---------- welcome ----------

const demoForm = (role: string, label: string, cls = "btn btn-outline-light btn-sm") =>
  html`<form method="post" action="/demo/${role}" class="d-inline"><button class="${cls}">${label}</button></form>`;

export const welcome = () => html`
  <div class="container welcome">
    <header class="d-flex justify-content-between align-items-center py-4">
      <a class="brand brand-light" href="/"><span class="brand-mark">H</span>Hotel</a>
      <a class="welcome-link" href="/staff/login">Staff login</a>
    </header>
    <section class="welcome-hero">
      <p class="eyebrow">Hotel Management System</p>
      <h1 class="huge-title">Welcome.</h1>
      <p class="welcome-sub">Book rooms, add services to a stay and run the front desk of a small demo hotel.</p>
      <div class="d-flex flex-wrap gap-2">
        <a class="btn btn1 effect01 effect-light" href="/book">Book a room</a>
        <a class="btn btn1 effect01" href="/login">Log in</a>
        <a class="btn btn1 effect01" href="/signup">Sign up</a>
      </div>
    </section>
    <section class="row g-3 welcome-cards">
      ${[
        ["guest", "Guests", "Search free rooms, book several at once and get an itemised invoice."],
        ["frontdesk", "Front desk", "See who's in house, add room service or laundry, and check guests out."],
        ["manager", "Manager", "Occupancy, revenue, expenses and profit for the last ten days."],
      ].map(
        ([role, title, text]) => html`<div class="col-md-4"><div class="glass-card h-100">
          <h2 class="h5">${title}</h2><p>${text}</p>${demoForm(role, `Try as ${title.toLowerCase().replace(/s$/, "")}`)}
        </div></div>`,
      )}
    </section>
    <p class="welcome-note">Demo accounts use the password <code>${DEMO_PASSWORD}</code>. Everything resets every night.</p>
  </div>`;

// ---------- auth ----------

const demoBox = (roles: [string, string][]) => html`
  <div class="demo-box mt-4">
    <p class="small fw-semibold mb-2">Just looking around? Use a demo account:</p>
    <div class="d-flex flex-wrap gap-2">${roles.map(([role, label]) => demoForm(role, label, "btn btn-sm btn-outline-dark"))}</div>
  </div>`;

const authCard = (title: string, sub: string, body: Html) => html`
  <div class="auth-wrap"><div class="card auth-card"><div class="card-body p-4 p-md-5">
    <h1 class="h3 mb-1">${title}</h1><p class="text-secondary mb-4">${sub}</p>${body}
  </div></div></div>`;

export const login = (email = "") =>
  authCard("Welcome back", "Log in to book rooms and see your invoices.", html`
    <form method="post" action="/login">
      <label class="form-label" for="email">Email address</label>
      <input class="form-control mb-3" id="email" name="email" type="email" value="${email}" required autocomplete="email" />
      <label class="form-label" for="password">Password</label>
      <input class="form-control mb-4" id="password" name="password" type="password" required autocomplete="current-password" />
      <button class="btn btn1 effect01 w-100">Log in</button>
    </form>
    <p class="mt-3 mb-0 small">No account? <a href="/signup">Sign up</a></p>
    ${demoBox([["guest", "Guest"], ["frontdesk", "Front desk"], ["manager", "Manager"]])}`);

export const staffLogin = (email = "") =>
  authCard("Staff login", "For the manager and front desk.", html`
    <form method="post" action="/staff/login">
      <label class="form-label" for="email">Email address</label>
      <input class="form-control mb-3" id="email" name="email" type="email" value="${email}" required autocomplete="username" />
      <label class="form-label" for="password">Password</label>
      <input class="form-control mb-4" id="password" name="password" type="password" required autocomplete="current-password" />
      <button class="btn btn1 effect01 w-100">Log in</button>
    </form>
    ${demoBox([["frontdesk", "Front desk"], ["manager", "Manager"]])}`);

export const signup = (values: Record<string, string> = {}) =>
  authCard("Create an account", "It takes a minute.", html`
    <form method="post" action="/signup">
      <div class="row g-2 mb-3">
        <div class="col-sm-6"><label class="form-label" for="first">First name</label>
          <input class="form-control" id="first" name="first" value="${values.first ?? ""}" required autocomplete="given-name" /></div>
        <div class="col-sm-6"><label class="form-label" for="last">Last name</label>
          <input class="form-control" id="last" name="last" value="${values.last ?? ""}" required autocomplete="family-name" /></div>
      </div>
      <label class="form-label" for="dob">Date of birth</label>
      <input class="form-control mb-3" id="dob" name="dob" type="date" min="1920-01-01" max="2010-12-31" value="${values.dob ?? ""}" required />
      <label class="form-label" for="email">Email address</label>
      <input class="form-control mb-3" id="email" name="email" type="email" value="${values.email ?? ""}" required autocomplete="email" />
      <div class="row g-2 mb-4">
        <div class="col-sm-6"><label class="form-label" for="password">Password</label>
          <input class="form-control" id="password" name="password" type="password" minlength="8" required autocomplete="new-password" /></div>
        <div class="col-sm-6"><label class="form-label" for="confirm">Confirm password</label>
          <input class="form-control" id="confirm" name="confirm" type="password" minlength="8" required autocomplete="new-password" /></div>
      </div>
      <button class="btn btn1 effect01 w-100">Sign up</button>
    </form>
    <p class="mt-3 mb-0 small">Already have an account? <a href="/login">Log in</a></p>`);

// ---------- guests ----------

export function book(q: { checkIn: string; checkOut: string; type: string; beds: number; min: string; max: string }, rooms: Room[] | null) {
  const nights = nightsBetween(q.checkIn, q.checkOut);
  return html`
    ${pageHead("Book a room", "Pick your dates and the kind of room you want.")}
    <form method="get" action="/book" class="card search-bar mb-4"><div class="card-body">
      <div class="row g-3 align-items-end">
        <div class="col-6 col-lg"><label class="form-label" for="checkIn">Check in</label>
          <input class="form-control" id="checkIn" name="checkIn" type="date" value="${q.checkIn}" min="${q.min}" max="${q.max}" required /></div>
        <div class="col-6 col-lg"><label class="form-label" for="checkOut">Check out</label>
          <input class="form-control" id="checkOut" name="checkOut" type="date" value="${q.checkOut}" min="${q.min}" max="${q.max}" required /></div>
        <div class="col-6 col-lg"><label class="form-label" for="type">Room type</label>
          <select class="form-select" id="type" name="type">${ROOM_TYPES.map((t) => html`<option ${t === q.type ? "selected" : ""}>${t}</option>`)}</select></div>
        <div class="col-6 col-lg-2"><label class="form-label" for="beds">Beds</label>
          <select class="form-select" id="beds" name="beds">${[2, 3].map((b) => html`<option ${b === q.beds ? "selected" : ""}>${b}</option>`)}</select></div>
        <div class="col-12 col-lg-auto"><button class="btn btn1 effect01 w-100">Search</button></div>
      </div>
    </div></form>
    ${rooms === null
      ? html`<div class="empty-state">Choose dates and a room type, then search to see what's free.</div>`
      : rooms.length === 0
        ? html`<div class="empty-state">No ${q.type} rooms with ${q.beds} beds are free from ${shortDate(q.checkIn)} to ${shortDate(q.checkOut)}. Try other dates or another room type.</div>`
        : html`<p class="text-secondary">${plural(rooms.length, "room")} free · ${shortDate(q.checkIn)} to ${shortDate(q.checkOut)} · ${plural(nights, "night")}</p>
          <div class="row g-3">${rooms.map(
            (r) => html`<div class="col-sm-6 col-lg-4"><div class="card room-card h-100"><div class="card-body d-flex flex-column">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div><div class="room-no">Room ${r.room_no}</div><div class="text-secondary small">${r.beds} beds · floor ${r.room_no[0]}</div></div>
                ${typeBadge(r.room_type)}
              </div>
              <div class="mt-auto d-flex justify-content-between align-items-end">
                <div><div class="price">${money(r.price * nights)}</div><div class="text-secondary small">${money(r.price)} per night</div></div>
                <form method="post" action="/cart/add">
                  <input type="hidden" name="room" value="${r.room_no}" /><input type="hidden" name="checkIn" value="${q.checkIn}" />
                  <input type="hidden" name="checkOut" value="${q.checkOut}" />
                  <button class="btn btn-dark btn-sm px-3">Add to cart</button>
                </form>
              </div>
            </div></div></div>`,
          )}</div>`}`;
}

export function cart(items: (CartItem & { room_type: string; beds: number; price: number })[]) {
  if (!items.length) {
    return html`${pageHead("Cart")}<div class="empty-state">Your cart is empty. <a href="/book">Find a room</a></div>`;
  }
  const total = items.reduce((s, i) => s + i.price * nightsBetween(i.checkIn, i.checkOut), 0);
  return html`
    ${pageHead("Cart", `${plural(items.length, "room")} ready to book`)}
    <div class="row g-4">
      <div class="col-lg-8"><div class="card"><ul class="list-group list-group-flush">
        ${items.map((i) => {
          const n = nightsBetween(i.checkIn, i.checkOut);
          return html`<li class="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-3 py-3">
            <div><div class="fw-semibold">Room ${i.room} ${typeBadge(i.room_type)}</div>
              <div class="text-secondary small">${i.beds} beds · ${shortDate(i.checkIn)} to ${shortDate(i.checkOut)} · ${plural(n, "night")}</div></div>
            <div class="d-flex align-items-center gap-3">
              <span class="fw-semibold">${money(i.price * n)}</span>
              <form method="post" action="/cart/remove"><input type="hidden" name="room" value="${i.room}" />
                <input type="hidden" name="checkIn" value="${i.checkIn}" /><button class="btn btn-sm btn-outline-danger">Remove</button></form>
            </div>
          </li>`;
        })}
      </ul></div></div>
      <div class="col-lg-4"><div class="card summary-card"><div class="card-body">
        <div class="d-flex justify-content-between mb-2"><span class="text-secondary">Rooms</span><span>${items.length}</span></div>
        <div class="d-flex justify-content-between mb-3"><span class="text-secondary">Total</span><span class="price">${money(total)}</span></div>
        <form method="post" action="/checkout"><button class="btn btn1 effect01 w-100">Confirm booking</button></form>
        <a class="d-block text-center small mt-3" href="/book">Add another room</a>
      </div></div></div>
    </div>`;
}

export const invoicePage = (inv: Invoice, back: { href: string; label: string }) => html`
  ${pageHead(`Booking #${inv.id}`, html`${inv.customer} · ${inv.email}`, html`<div class="d-print-none d-flex gap-2">
    <a class="btn btn-outline-secondary" href="${back.href}">${back.label}</a>
    <button class="btn btn-dark" onclick="print()">Print bill</button></div>`)}
  <div class="card invoice"><div class="card-body p-4 p-md-5">
    <div class="d-flex flex-wrap justify-content-between gap-3 mb-4">
      <div><div class="brand"><span class="brand-mark">H</span>Hotel</div><div class="text-secondary small mt-1">Invoice for booking #${inv.id}</div></div>
      <div class="text-md-end small"><div>Booked ${shortDate(inv.created_on)}</div><div class="mt-1">${statusBadge(inv.status)}</div></div>
    </div>
    <h2 class="h6 text-uppercase text-secondary">Rooms</h2>
    <div class="table-responsive"><table class="table">
      <thead><tr><th>Room</th><th>Type</th><th>Dates</th><th class="text-end">Nights</th><th class="text-end">Per night</th><th class="text-end">Amount</th></tr></thead>
      <tbody>${inv.rooms.map(
        (r) => html`<tr><td>${r.room_no}</td><td>${r.room_type}, ${r.beds} beds</td><td>${shortDate(r.check_in)} to ${shortDate(r.check_out)}</td>
          <td class="text-end">${r.nights}</td><td class="text-end">${money(r.price)}</td><td class="text-end">${money(r.total)}</td></tr>`,
      )}</tbody>
    </table></div>
    <h2 class="h6 text-uppercase text-secondary mt-4">Services</h2>
    ${inv.services.length
      ? html`<div class="table-responsive"><table class="table">
          <thead><tr><th>Service</th><th class="text-end">Quantity</th><th class="text-end">Price</th><th class="text-end">Amount</th></tr></thead>
          <tbody>${inv.services.map((s) => html`<tr><td>${s.service_type}</td><td class="text-end">${s.quantity}</td><td class="text-end">${money(s.price)}</td><td class="text-end">${money(s.total)}</td></tr>`)}</tbody>
        </table></div>`
      : html`<p class="text-secondary">No services added.</p>`}
    <div class="totals ms-auto mt-4">
      <div class="d-flex justify-content-between"><span>Rooms</span><span>${money(inv.roomTotal)}</span></div>
      <div class="d-flex justify-content-between"><span>Services</span><span>${money(inv.serviceTotal)}</span></div>
      <div class="d-flex justify-content-between grand"><span>Total</span><span>${money(inv.roomTotal + inv.serviceTotal)}</span></div>
    </div>
  </div></div>`;

export const myBookings = (rows: Awaited<ReturnType<typeof customerBookings>>) => html`
  ${pageHead("My bookings", rows.length ? plural(rows.length, "booking") : undefined, html`<a class="btn btn-dark" href="/book">Book a room</a>`)}
  ${rows.length
    ? html`<div class="row g-3">${rows.map(
        (b) => html`<div class="col-md-6 col-lg-4"><a class="card booking-card h-100 text-reset text-decoration-none" href="/bookings/${b.id}"><div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2"><span class="fw-semibold">Booking #${b.id}</span>${statusBadge(b.status)}</div>
          <div class="text-secondary small mb-3">${shortDate(b.check_in)} to ${shortDate(b.check_out)} · room ${b.rooms}</div>
          <div class="d-flex justify-content-between align-items-end"><span class="price">${money(b.room_amount)}</span><span class="small">View invoice →</span></div>
        </div></a></div>`,
      )}</div>`
    : html`<div class="empty-state">No bookings yet.</div>`}`;

// ---------- staff ----------

type Stay = { id: number; name: string; room_no: string; check_in: string; check_out: string };
type Service = { id: string; service_type: string; stock: number; price_for_sale: number };

function staysTable(stays: Stay[], ongoing: boolean) {
  if (!stays.length) return html`<p class="text-secondary px-3 py-3 mb-0">${ongoing ? "Nobody is in house." : "No upcoming arrivals."}</p>`;
  return html`<div class="table-responsive"><table class="table table-hover align-middle mb-0">
    <thead><tr><th>#</th><th>Guest</th><th>Room</th><th>${ongoing ? "Since" : "Arrives"}</th><th>${ongoing ? "Leaves" : "Until"}</th><th class="text-end">Actions</th></tr></thead>
    <tbody>${stays.map(
      (s) => html`<tr><td class="text-secondary">${s.id}</td><td class="fw-medium">${s.name}</td><td>${s.room_no}</td>
        <td>${shortDate(s.check_in)}</td><td>${shortDate(s.check_out)}</td>
        <td class="text-end"><div class="d-inline-flex gap-2">
          <a class="btn btn-sm btn-outline-secondary" href="/front-desk/bill/${s.id}">Bill</a>
          <form method="post" action="/front-desk/bookings/${s.id}/${ongoing ? "check-out" : "cancel"}">
            <button class="btn btn-sm ${ongoing ? "btn-dark" : "btn-outline-danger"}">${ongoing ? "Check out" : "Cancel"}</button></form>
        </div></td></tr>`,
    )}</tbody></table></div>`;
}

export function frontDesk(stays: Stay[], services: Service[], today: string) {
  const inHouse = stays.filter((s) => s.check_in <= today);
  const arriving = stays.filter((s) => s.check_in > today);
  return html`
    ${pageHead("Front desk", `${shortDate(today)} · ${plural(inHouse.length, "room")} in use · ${plural(arriving.length, "arrival")} coming`)}
    <div class="card mb-4"><div class="card-header"><span class="fw-semibold">In house</span> <span class="badge text-bg-success ms-1">${inHouse.length}</span></div>${staysTable(inHouse, true)}</div>
    <div class="card mb-4"><div class="card-header"><span class="fw-semibold">Arriving</span> <span class="badge text-bg-secondary ms-1">${arriving.length}</span></div>${staysTable(arriving, false)}</div>
    <div class="row g-4">
      <div class="col-md-7"><div class="card h-100"><div class="card-body">
        <h2 class="h5 mb-3">Add a service</h2>
        <form method="post" action="/front-desk/services" class="row g-3 align-items-end">
          <div class="col-sm-4"><label class="form-label" for="booking">Booking #</label><input class="form-control" id="booking" name="booking" type="number" min="1" required /></div>
          <div class="col-sm-8"><label class="form-label" for="service">Service</label>
            <select class="form-select" id="service" name="service">${services.map((s) => html`<option value="${s.id}">${s.service_type} · ${money(s.price_for_sale)} · ${s.stock} left</option>`)}</select></div>
          <div class="col-sm-4"><label class="form-label" for="quantity">Quantity</label><input class="form-control" id="quantity" name="quantity" type="number" min="1" max="20" value="1" required /></div>
          <div class="col-sm-8"><button class="btn btn1 effect01 w-100">Add service</button></div>
        </form>
      </div></div></div>
      <div class="col-md-5"><div class="card h-100"><div class="card-body">
        <h2 class="h5 mb-3">Find a bill</h2>
        <form method="get" action="/front-desk/bill">
          <label class="form-label" for="billBooking">Booking #</label>
          <input class="form-control mb-3" id="billBooking" name="booking" type="number" min="1" required />
          <button class="btn btn-outline-dark w-100">Show bill</button>
        </form>
      </div></div></div>
    </div>`;
}

export function manager(data: Awaited<ReturnType<typeof managerOverview>>) {
  const card = (id: string, title: string, head: string[], rows: Html[], right: number[] = []) =>
    html`<div class="card mb-4" id="${id}"><div class="card-header fw-semibold">${title}</div>
      <div class="table-responsive"><table class="table align-middle mb-0"><thead><tr>${head.map((h, i) => html`<th class="${right.includes(i) ? "text-end" : ""}">${h}</th>`)}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
  const days = [...data.profit].reverse();
  const top = Math.max(1, ...days.map((d) => Math.max(d.revenue, d.expenses)));
  const tenDayProfit = data.profit.reduce((s, p) => s + p.profit, 0);
  const today = data.profit[0];
  const stat = (label: string, value: string, note: string) =>
    html`<div class="col-6 col-lg-3"><div class="card stat h-100"><div class="card-body">
      <div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></div></div></div>`;
  return html`
    ${pageHead("Overview", "How the hotel is doing today and over the last ten days.")}
    <div class="row g-3 mb-4">
      ${stat("Occupancy", `${Math.round((data.occupied / data.totalRooms) * 100)}%`, `${data.occupied} of ${data.totalRooms} rooms tonight`)}
      ${stat("Guests in house", String(data.current.length), "active bookings")}
      ${stat("Revenue today", money(today?.revenue ?? 0), "rooms and services")}
      ${stat("Profit, 10 days", money(tenDayProfit), "after all expenses")}
    </div>
    <div class="card mb-4"><div class="card-body">
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h2 class="h5 mb-0">Revenue and expenses</h2>
        <div class="legend small"><span class="key key-rev"></span>Revenue <span class="key key-exp ms-3"></span>Expenses</div>
      </div>
      <div class="chart" role="img" aria-label="Daily revenue and expenses for the last ten days">
        ${days.map(
          (d) => html`<div class="chart-day" title="${shortDate(d.day)}: revenue ${money(d.revenue)}, expenses ${money(d.expenses)}">
            <div class="bars"><span class="bar bar-rev" style="height:${raw(String((d.revenue / top) * 100))}%"></span><span class="bar bar-exp" style="height:${raw(String((d.expenses / top) * 100))}%"></span></div>
            <div class="chart-label">${shortDate(d.day)}</div></div>`,
        )}
      </div>
    </div></div>
    ${card("bookings", "Current bookings", ["#", "Guest", "Email", "Rooms", "Check in", "Check out"],
      data.current.map((b) => html`<tr><td class="text-secondary">${b.id}</td><td class="fw-medium">${b.name}</td><td>${b.email}</td><td>${b.rooms}</td><td>${shortDate(b.check_in)}</td><td>${shortDate(b.check_out)}</td></tr>`))}
    <div class="row g-4">
      <div class="col-lg-6">${card("profit", "Profit by day", ["Date", "Revenue", "Expenses", "Profit"],
        data.profit.map((p) => html`<tr><td>${shortDate(p.day)}</td><td class="text-end">${money(p.revenue)}</td><td class="text-end">${money(p.expenses)}</td>
          <td class="text-end fw-semibold ${p.profit < 0 ? "text-danger" : "text-success"}">${money(p.profit)}</td></tr>`), [1, 2, 3])}</div>
      <div class="col-lg-6">${card("expenses", "Expenses by day", ["Date", "Bills", "Restocking", "Salaries"],
        data.expenses.map((e) => html`<tr><td>${shortDate(e.day)}</td><td class="text-end">${money(e.management_bills)}</td><td class="text-end">${money(e.restocking_bill)}</td><td class="text-end">${money(e.salary_expense)}</td></tr>`), [1, 2, 3])}</div>
    </div>
    ${card("salaries", "Staff", ["#", "Name", "Position", "Monthly salary"],
      data.staff.map((e) => html`<tr><td class="text-secondary">${e.id}</td><td class="fw-medium">${e.name}</td><td>${e.designation}</td><td class="text-end">${money(e.salary)}</td></tr>`), [3])}`;
}

export { raw };
