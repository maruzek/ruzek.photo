// Event length from the start and end time in the inquiry form: the form fills the hours from it, so a client
// never has to give the same information twice.
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_MIN = 24 * 60;

const minutes = (v: string): number | undefined => {
  const m = TIME.exec(v);
  return m ? Number(m[1]) * 60 + Number(m[2]) : undefined;
};

/** Whole hours from `from` to `to` ("HH:MM"), rounded up; an end before the start runs past midnight. */
export function hoursBetween(from: string, to: string): number | undefined {
  const a = minutes(from);
  const b = minutes(to);
  if (a === undefined || b === undefined || a === b) return undefined;
  return Math.ceil(((b - a + DAY_MIN) % DAY_MIN) / 60);
}
