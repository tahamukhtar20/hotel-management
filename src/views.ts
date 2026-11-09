// Server-rendered pages. `html` escapes every interpolated value unless it is itself html``.

import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { Session } from "./auth";
import type { CartItem, Invoice, Room } from "./db";
import { DEMO_PASSWORD, nightsBetween, ROOM_TYPES } from "./types";

type Html = HtmlEscapedString | Promise<HtmlEscapedString>;

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const BOOTSTRAP = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";

export type Notice = { type: "success" | "danger" | "info"; text: string } | null;

function nav(session: Session | null, cartCount: number) {
  const link = (href: string, label: string) =>
    html`<a class="btn btn-sm btn-outline-secondary" href="${href}">${label}</a>`;
  const logout = (action: string) =>
    html`<form method="post" action="${action}" class="d-inline"><button class="btn btn-sm btn-outline-secondary">Log out</button></form>`;
  let links;
  if (session?.kind === "staff") {
    links = html`${session.role === "Manager" ? link("/manager", "Manager") : ""} ${link("/front-desk", "Front desk")}
      ${logout("/staff/logout")}`;
  } else if (session?.kind === "guest") {
    links = html`${link("/book", "Book")} ${link("/my-bookings", "My bookings")}
      ${link("/cart", cartCount ? `Cart (${cartCount})` : "Cart")} ${logout("/logout")}`;
  } else {
    links = html`${link("/login", "Log in")} ${link("/signup", "Sign up")} ${link("/staff/login", "Staff")}`;
  }
  return html`<nav class="navbar bg-light border-bottom sticky-top">
    <div class="container">
      <a class="navbar-brand fw-semibold" href="/">Hotel</a>
      <div class="d-flex flex-wrap gap-2 align-items-center">
        ${session ? html`<span class="text-muted small me-1">${session.name}</span>` : ""}${links}
      </div>
    </div>
  </nav>`;
}

export function layout(
  title: string,
  body: Html,
  opts: { session?: Session | null; cartCount?: number; notice?: Notice; bare?: boolean } = {},
) {
  return html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title} · Hotel Management System</title>
        <link rel="stylesheet" href="${BOOTSTRAP}" />
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body class="${opts.bare ? "screen-welcome" : "d-flex flex-column min-vh-100"}">
        ${opts.bare ? "" : nav(opts.session ?? null, opts.cartCount ?? 0)}
        <main class="${opts.bare ? "" : "container py-4 flex-grow-1"}">
          ${opts.notice ? html`<div class="alert alert-${opts.notice.type}" role="alert">${opts.notice.text}</div>` : ""}
          ${body}
        </main>
        ${opts.bare
          ? ""
          : html`<footer class="bg-dark text-secondary small py-3 mt-4">
              <div class="container text-center">Hotel Management System · demo data resets every night</div>
            </footer>`}
      </body>
    </html>`;
}

export const welcome = () => html`
  <div class="welcome">
    <p class="huge-title">Welcome.</p>
    <p class="welcome-sub">Book rooms, add services and run the front desk of a small demo hotel.</p>
    <div class="btn-group welcome-buttons" role="group" aria-label="Get started">
      <a class="btn btn1 effect01 button-left" href="/signup">Sign up</a>
      <a class="btn btn1 effect01" href="/login">Log in</a>
      <a class="btn btn1 effect01 button-right" href="/book">Book now</a>
    </div>
    <p class="welcome-staff"><a href="/staff/login">Staff login</a></p>
  </div>`;

const demoButtons = (roles: [string, string][]) => html`
  <div class="demo-box mt-4">
    <p class="mb-2 fw-semibold">Just looking around?</p>
    <div class="d-flex flex-wrap gap-2">
      ${roles.map(
        ([role, label]) =>
          html`<form method="post" action="/demo/${role}"><button class="btn btn-sm btn-outline-dark">${label}</button></form>`,
      )}
    </div>
    <p class="small text-muted mt-2 mb-0">Demo accounts use the password <code>${DEMO_PASSWORD}</code>.</p>
  </div>`;

export const login = (email = "") => html`
  <form method="post" action="/login" class="form-narrow">
    <h1 class="h3 mb-3">Log in</h1>
    <label class="form-label" for="email">Email address</label>
    <input class="form-control mb-3" id="email" name="email" type="email" value="${email}" required autocomplete="email" />
    <label class="form-label" for="password">Password</label>
    <input class="form-control mb-3" id="password" name="password" type="password" required autocomplete="current-password" />
    <button class="btn btn1 effect01">Log in</button>
    <p class="mt-3">No account? <a href="/signup">Sign up here</a></p>
    ${demoButtons([["guest", "Continue as demo guest"], ["frontdesk", "Front desk demo"], ["manager", "Manager demo"]])}
  </form>`;

export const staffLogin = (email = "") => html`
  <form method="post" action="/staff/login" class="form-narrow">
    <h1 class="h3 mb-3">Staff login</h1>
    <label class="form-label" for="email">Email address</label>
    <input class="form-control mb-3" id="email" name="email" type="email" value="${email}" required autocomplete="username" />
    <label class="form-label" for="password">Password</label>
    <input class="form-control mb-3" id="password" name="password" type="password" required autocomplete="current-password" />
    <button class="btn btn1 effect01">Log in</button>
    ${demoButtons([["frontdesk", "Front desk demo"], ["manager", "Manager demo"]])}
  </form>`;

export const signup = (values: Record<string, string> = {}) => html`
  <form method="post" action="/signup" class="form-narrow">
    <h1 class="h3 mb-3">Sign up</h1>
    <div class="row g-2">
      <div class="col-sm-6">
        <label class="form-label" for="first">First name</label>
        <input class="form-control" id="first" name="first" value="${values.first ?? ""}" required autocomplete="given-name" />
      </div>
      <div class="col-sm-6">
        <label class="form-label" for="last">Last name</label>
        <input class="form-control" id="last" name="last" value="${values.last ?? ""}" required autocomplete="family-name" />
      </div>
    </div>
    <label class="form-label mt-3" for="dob">Date of birth</label>
    <input class="form-control" id="dob" name="dob" type="date" min="1920-01-01" max="2010-12-31" value="${values.dob ?? ""}" required />
    <label class="form-label mt-3" for="email">Email address</label>
    <input class="form-control" id="email" name="email" type="email" value="${values.email ?? ""}" required autocomplete="email" />
    <label class="form-label mt-3" for="password">Password</label>
    <input class="form-control" id="password" name="password" type="password" minlength="8" required autocomplete="new-password" />
    <label class="form-label mt-3" for="confirm">Confirm password</label>
    <input class="form-control mb-3" id="confirm" name="confirm" type="password" minlength="8" required autocomplete="new-password" />
    <button class="btn btn1 effect01">Sign up</button>
    <p class="mt-3">Already signed up? <a href="/login">Log in here</a></p>
  </form>`;

export function book(q: { checkIn: string; checkOut: string; type: string; beds: number; min: string; max: string }, rooms: Room[] | null) {
  const nights = nightsBetween(q.checkIn, q.checkOut);
  return html`
    <h1 class="h3 mb-3">Book a room</h1>
    <div class="row g-4">
      <div class="col-lg-4">
        <form method="get" action="/book" class="search-panel">
          <label class="form-label" for="checkIn">Check in</label>
          <input class="form-control mb-2" id="checkIn" name="checkIn" type="date" value="${q.checkIn}" min="${q.min}" max="${q.max}" required />
          <label class="form-label" for="checkOut">Check out</label>
          <input class="form-control mb-2" id="checkOut" name="checkOut" type="date" value="${q.checkOut}" min="${q.min}" max="${q.max}" required />
          <label class="form-label" for="type">Room type</label>
          <select class="form-select mb-2" id="type" name="type">
            ${ROOM_TYPES.map((t) => html`<option ${t === q.type ? "selected" : ""}>${t}</option>`)}
          </select>
          <label class="form-label" for="beds">Beds</label>
          <select class="form-select mb-3" id="beds" name="beds">
            ${[2, 3].map((b) => html`<option ${b === q.beds ? "selected" : ""}>${b}</option>`)}
          </select>
          <button class="btn btn-primary">Search</button>
        </form>
      </div>
      <div class="col-lg-8">
        ${rooms === null
          ? html`<p class="text-muted">Pick your dates and a room type to see what's free.</p>`
          : rooms.length === 0
            ? html`<p>No ${q.type} rooms with ${q.beds} beds are free for those dates.</p>`
            : html`<p class="text-muted">${rooms.length} room${rooms.length === 1 ? "" : "s"} free for ${nights} night${nights === 1 ? "" : "s"}, ${q.checkIn} to ${q.checkOut}.</p>
                <div class="table-responsive"><table class="table align-middle">
                  <thead><tr><th>Room</th><th>Type</th><th>Beds</th><th>Per night</th><th>Stay</th><th></th></tr></thead>
                  <tbody>
                    ${rooms.map(
                      (r) => html`<tr>
                        <td>${r.room_no}</td><td>${r.room_type}</td><td>${r.beds}</td><td>${money(r.price)}</td>
                        <td>${money(r.price * nights)}</td>
                        <td><form method="post" action="/cart/add">
                          <input type="hidden" name="room" value="${r.room_no}" />
                          <input type="hidden" name="checkIn" value="${q.checkIn}" />
                          <input type="hidden" name="checkOut" value="${q.checkOut}" />
                          <button class="btn btn-sm btn-primary">Add to cart</button>
                        </form></td>
                      </tr>`,
                    )}
                  </tbody>
                </table></div>`}
      </div>
    </div>`;
}

export function cart(items: (CartItem & { room_type: string; beds: number; price: number })[]) {
  if (!items.length) return html`<h1 class="h3">Cart</h1><p class="mt-3">Your cart is empty. <a href="/book">Find a room</a></p>`;
  const total = items.reduce((s, i) => s + i.price * nightsBetween(i.checkIn, i.checkOut), 0);
  return html`
    <h1 class="h3 mb-3">Cart</h1>
    <div class="table-responsive"><table class="table align-middle">
      <thead><tr><th>Room</th><th>Type</th><th>Beds</th><th>Check in</th><th>Check out</th><th>Total</th><th></th></tr></thead>
      <tbody>
        ${items.map(
          (i) => html`<tr>
            <td>${i.room}</td><td>${i.room_type}</td><td>${i.beds}</td><td>${i.checkIn}</td><td>${i.checkOut}</td>
            <td>${money(i.price * nightsBetween(i.checkIn, i.checkOut))}</td>
            <td><form method="post" action="/cart/remove"><input type="hidden" name="room" value="${i.room}" />
              <input type="hidden" name="checkIn" value="${i.checkIn}" />
              <button class="btn btn-sm btn-outline-danger">Remove</button></form></td>
          </tr>`,
        )}
      </tbody>
      <tfoot><tr><th colspan="5">Total</th><th>${money(total)}</th><th></th></tr></tfoot>
    </table></div>
    <form method="post" action="/checkout"><button class="btn btn-primary">Check out</button></form>`;
}

export const invoicePage = (inv: Invoice, back: { href: string; label: string }) => html`
  <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
    <div>
      <h1 class="h3 mb-1">Invoice for booking #${inv.id}</h1>
      <p class="text-muted mb-0">${inv.customer} · ${inv.email} · booked ${inv.created_on} · ${inv.status.replace("_", " ")}</p>
    </div>
    <div class="d-print-none d-flex gap-2">
      <a class="btn btn-outline-secondary" href="${back.href}">${back.label}</a>
      <button class="btn btn-primary" onclick="print()">Print bill</button>
    </div>
  </div>
  <h2 class="h5 mt-4">Rooms</h2>
  <div class="table-responsive"><table class="table table-bordered table-striped">
    <thead><tr><th>Room</th><th>Type</th><th>Beds</th><th>Check in</th><th>Check out</th><th>Nights</th><th>Per night</th><th>Total</th></tr></thead>
    <tbody>
      ${inv.rooms.map(
        (r) => html`<tr><td>${r.room_no}</td><td>${r.room_type}</td><td>${r.beds}</td><td>${r.check_in}</td><td>${r.check_out}</td>
          <td>${r.nights}</td><td>${money(r.price)}</td><td>${money(r.total)}</td></tr>`,
      )}
    </tbody>
  </table></div>
  <h2 class="h5 mt-4">Services</h2>
  ${inv.services.length
    ? html`<div class="table-responsive"><table class="table table-bordered table-striped">
        <thead><tr><th>Service</th><th>Quantity</th><th>Price</th><th>Total</th></tr></thead>
        <tbody>${inv.services.map((s) => html`<tr><td>${s.service_type}</td><td>${s.quantity}</td><td>${money(s.price)}</td><td>${money(s.total)}</td></tr>`)}</tbody>
      </table></div>`
    : html`<p class="text-muted">No services yet.</p>`}
  <p class="h5 text-end mt-4">Total: ${money(inv.roomTotal + inv.serviceTotal)}</p>`;

export const myBookings = (rows: Awaited<ReturnType<typeof import("./db").customerBookings>>) => html`
  <h1 class="h3 mb-3">My bookings</h1>
  ${rows.length
    ? html`<div class="table-responsive"><table class="table align-middle">
        <thead><tr><th>#</th><th>Rooms</th><th>Check in</th><th>Check out</th><th>Rooms total</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows.map(
          (b) => html`<tr><td>${b.id}</td><td>${b.rooms}</td><td>${b.check_in}</td><td>${b.check_out}</td><td>${money(b.room_amount)}</td>
            <td>${b.status.replace("_", " ")}</td><td><a href="/bookings/${b.id}">Invoice</a></td></tr>`,
        )}</tbody>
      </table></div>`
    : html`<p>No bookings yet. <a href="/book">Book a room</a></p>`}`;

type Stay = { id: number; name: string; room_no: string; check_in: string; check_out: string };
type Service = { id: string; service_type: string; stock: number; price_for_sale: number };

export function frontDesk(stays: Stay[], services: Service[], today: string) {
  return html`
    <h1 class="h3 mb-3">Front desk</h1>
    <h2 class="h5">Current and upcoming stays</h2>
    <div class="table-responsive"><table class="table align-middle">
      <thead><tr><th>#</th><th>Guest</th><th>Room</th><th>Check in</th><th>Check out</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        ${stays.map((s) => {
          const ongoing = s.check_in <= today;
          return html`<tr>
            <td>${s.id}</td><td>${s.name}</td><td>${s.room_no}</td><td>${s.check_in}</td><td>${s.check_out}</td>
            <td><span class="badge ${ongoing ? "text-bg-success" : "text-bg-secondary"}">${ongoing ? "In house" : "Upcoming"}</span></td>
            <td class="d-flex gap-2">
              <a class="btn btn-sm btn-outline-secondary" href="/front-desk/bill/${s.id}">Bill</a>
              <form method="post" action="/front-desk/bookings/${s.id}/${ongoing ? "check-out" : "cancel"}">
                <button class="btn btn-sm ${ongoing ? "btn-outline-primary" : "btn-outline-danger"}">${ongoing ? "Check out" : "Cancel"}</button>
              </form>
            </td>
          </tr>`;
        })}
      </tbody>
    </table></div>
    <div class="row g-4 mt-1">
      <div class="col-md-6">
        <h2 class="h5">Add a service</h2>
        <form method="post" action="/front-desk/services" class="search-panel">
          <label class="form-label" for="booking">Booking number</label>
          <input class="form-control mb-2" id="booking" name="booking" type="number" min="1" required />
          <label class="form-label" for="service">Service</label>
          <select class="form-select mb-2" id="service" name="service">
            ${services.map((s) => html`<option value="${s.id}">${s.service_type} (${money(s.price_for_sale)}, ${s.stock} in stock)</option>`)}
          </select>
          <label class="form-label" for="quantity">Quantity</label>
          <input class="form-control mb-3" id="quantity" name="quantity" type="number" min="1" max="20" value="1" required />
          <button class="btn btn-primary">Add service</button>
        </form>
      </div>
      <div class="col-md-6">
        <h2 class="h5">Generate a bill</h2>
        <form method="get" action="/front-desk/bill" class="search-panel">
          <label class="form-label" for="billBooking">Booking number</label>
          <input class="form-control mb-3" id="billBooking" name="booking" type="number" min="1" required />
          <button class="btn btn-primary">Show bill</button>
        </form>
      </div>
    </div>`;
}

export function manager(data: Awaited<ReturnType<typeof import("./db").managerOverview>>) {
  const table = (head: string[], rows: Html[]) =>
    html`<div class="table-responsive"><table class="table"><thead><tr>${head.map((h) => html`<th>${h}</th>`)}</tr></thead><tbody>${rows}</tbody></table></div>`;
  return html`
    <nav class="manager-nav mb-4 d-flex flex-wrap gap-3">
      <a href="#bookings">Current bookings</a><a href="#salaries">Employee salaries</a><a href="#profit">Profit</a><a href="#expenses">Expenses</a>
    </nav>
    <section id="bookings"><h2 class="h4">Current bookings</h2>
      ${table(["#", "Guest", "Email", "Rooms", "Check in", "Check out"],
        data.current.map((b) => html`<tr><td>${b.id}</td><td>${b.name}</td><td>${b.email}</td><td>${b.rooms}</td><td>${b.check_in}</td><td>${b.check_out}</td></tr>`))}
    </section>
    <section id="salaries" class="mt-4"><h2 class="h4">Employee salaries</h2>
      ${table(["#", "Employee", "Position", "Monthly salary"],
        data.staff.map((e) => html`<tr><td>${e.id}</td><td>${e.name}</td><td>${e.designation}</td><td>${money(e.salary)}</td></tr>`))}
    </section>
    <section id="profit" class="mt-4"><h2 class="h4">Profit, last 10 days</h2>
      ${table(["Date", "Revenue", "Expenses", "Profit"],
        data.profit.map((p) => html`<tr><td>${p.day}</td><td>${money(p.revenue)}</td><td>${money(p.expenses)}</td>
          <td class="${p.profit < 0 ? "text-danger" : ""}">${money(p.profit)}</td></tr>`))}
    </section>
    <section id="expenses" class="mt-4"><h2 class="h4">Expenses, last 10 days</h2>
      ${table(["Date", "Management bills", "Restocking", "Salaries"],
        data.expenses.map((e) => html`<tr><td>${e.day}</td><td>${money(e.management_bills)}</td><td>${money(e.restocking_bill)}</td><td>${money(e.salary_expense)}</td></tr>`))}
    </section>`;
}

export { raw };
