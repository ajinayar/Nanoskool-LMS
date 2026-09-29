/** Today's date (YYYY-MM-DD) in a school's timezone. Attendance days follow the school's clock, not UTC. */
export function todayIn(timeZone = 'Asia/Kolkata', at = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}
