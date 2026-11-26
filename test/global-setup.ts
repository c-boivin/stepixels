// runs once before the test workers start: they inherit this time zone, so the tests of the
// game day (src/lib/day.ts) give the same result on every computer, with the French time changes
export default function globalSetup() {
  process.env.TZ = 'Europe/Paris'
}
