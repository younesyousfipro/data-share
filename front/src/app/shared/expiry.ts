const DAY_MS = 24 * 60 * 60 * 1000;

// Counts calendar days: a file expiring at 9 am tomorrow expires "demain", even 30 h ahead
export function expiryDay(expiresAt: Date, now: Date): string {
  const days = calendarDaysBetween(now, expiresAt);
  if (days === 0) {
    return "aujourd'hui";
  }
  if (days === 1) {
    return 'demain';
  }
  return `dans ${days} jours`;
}

// Same threshold as the EXPIRING_SOON status of the API
export function expiresWithinADay(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() - now.getTime() < DAY_MS;
}

// Math.round absorbs the hour gained or lost when summer time starts or ends
function calendarDaysBetween(from: Date, to: Date): number {
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}
