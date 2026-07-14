/**
 * Shop schedule: orders accepted Monday–Friday, closed weekends,
 * all orders ship the following Monday.
 *
 * All day boundaries use SHOP_TIMEZONE, not the customer's clock.
 */

// The bakery's local timezone (Mississippi = US Central)
export const SHOP_TIMEZONE = "America/Chicago";

const WEEKDAY_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: SHOP_TIMEZONE,
  weekday: "short",
});

const DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  // en-CA gives YYYY-MM-DD
  timeZone: SHOP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

export function shopWeekday(date: Date = new Date()): number {
  return DAY_INDEX[WEEKDAY_FMT.format(date)];
}

/** Shop-timezone calendar date as YYYY-MM-DD */
export function shopDate(date: Date = new Date()): string {
  return DATE_FMT.format(date);
}

/** Open Monday–Friday, closed Saturday & Sunday (shop timezone). */
export function isShopOpen(date: Date = new Date()): boolean {
  const day = shopWeekday(date);
  return day >= 1 && day <= 5;
}

/**
 * Start date (YYYY-MM-DD, shop TZ) of the current order batch.
 * A batch runs Saturday→Friday and ships the Monday after it closes,
 * so the weekly cap counts orders since the most recent Saturday.
 */
export function currentBatchStartDate(date: Date = new Date()): string {
  const day = shopWeekday(date);
  const daysSinceSaturday = (day + 1) % 7; // Sat=0, Sun=1, Mon=2, ... Fri=6
  const d = new Date(date.getTime() - daysSinceSaturday * 86_400_000);
  return shopDate(d);
}

/** Date (YYYY-MM-DD, shop TZ) of the Monday this batch ships. */
export function nextShipDate(date: Date = new Date()): string {
  const day = shopWeekday(date);
  // Mon–Fri orders ship the NEXT Monday; Sat/Sun sits in next week's batch
  const daysUntilMonday = ((1 - day) + 7) % 7 || 7;
  const d = new Date(date.getTime() + daysUntilMonday * 86_400_000);
  return shopDate(d);
}

export const CLOSED_MESSAGE =
  "Shop is closed on weekends — order Monday through Friday. All orders ship out on Monday.";
