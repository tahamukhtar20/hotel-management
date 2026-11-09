-- Schema for the hotel database (Cloudflare D1, SQLite).
-- Money is stored in whole dollars. Dates are ISO strings (YYYY-MM-DD).

CREATE TABLE customers (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  dob           TEXT
);

CREATE TABLE employees (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  designation   TEXT NOT NULL,           -- 'Manager', 'Front Desk', 'Housekeeping', 'Chef', ...
  salary        INTEGER NOT NULL,        -- monthly
  manager_id    TEXT REFERENCES employees (id),
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL
);

CREATE TABLE rooms (
  room_no   TEXT PRIMARY KEY,
  room_type TEXT NOT NULL CHECK (room_type IN ('Economic', 'Luxury', 'VIP')),
  beds      INTEGER NOT NULL,
  price     INTEGER NOT NULL             -- per night
);

CREATE TABLE bookings (
  id           INTEGER PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customers (id),
  created_on   TEXT NOT NULL,
  room_amount  INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'checked_out'))
);

CREATE TABLE booked_rooms (
  booking_id INTEGER NOT NULL REFERENCES bookings (id),
  room_no    TEXT NOT NULL REFERENCES rooms (room_no),
  check_in   TEXT NOT NULL,
  check_out  TEXT NOT NULL,
  PRIMARY KEY (booking_id, room_no),
  CHECK (check_out > check_in)
);
CREATE INDEX booked_rooms_room ON booked_rooms (room_no, check_in, check_out);

CREATE TABLE services (
  id             TEXT PRIMARY KEY,
  service_type   TEXT NOT NULL UNIQUE,
  stock          INTEGER NOT NULL,
  price_for_sale INTEGER NOT NULL,
  original_price INTEGER NOT NULL
);

CREATE TABLE booked_services (
  booking_id  INTEGER NOT NULL REFERENCES bookings (id),
  service_id  TEXT NOT NULL REFERENCES services (id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  added_on    TEXT NOT NULL,
  PRIMARY KEY (booking_id, service_id)
);

-- Stock used each day, to be bought back at original price.
CREATE TABLE restocking (
  day        TEXT NOT NULL,
  service_id TEXT NOT NULL REFERENCES services (id),
  quantity   INTEGER NOT NULL,
  PRIMARY KEY (day, service_id)
);

CREATE TABLE hotel_expenses (
  day              TEXT PRIMARY KEY,
  management_bills INTEGER NOT NULL,
  restocking_bill  INTEGER NOT NULL,
  salary_expense   INTEGER NOT NULL
);
