import "dotenv/config";
import { getMonthRange, parseTripFilters, getUpcomingMonthOptions, findPriceBand } from "../lib/trip-filters";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`);
}

const r = getMonthRange("2026-12");
check("2026-12 starts 1 Dec", r?.start.toISOString().slice(0, 10), "2026-12-01");
check("2026-12 ends 1 Jan next year", r?.end.toISOString().slice(0, 10), "2027-01-01");
check("month 13 rejected", getMonthRange("2026-13"), null);
check("month 00 rejected", getMonthRange("2026-00"), null);
check("garbage rejected", getMonthRange("december"), null);
check("sql-ish string rejected", getMonthRange("2026-01' OR 1=1"), null);

const known = ["trek", "beach"];
check("unknown category dropped", parseTripFilters({ category: "'; DROP TABLE" }, known).categorySlug, null);
check("known category kept", parseTripFilters({ category: "trek" }, known).categorySlug, "trek");
check("unknown trip type dropped", parseTripFilters({ type: "anything" }, known).tripType, null);
check("known trip type kept", parseTripFilters({ type: "ladies_only" }, known).tripType, "ladies_only");
check("unknown price band dropped", parseTripFilters({ price: "free" }, known).priceBandId, null);
check("known price band kept", parseTripFilters({ price: "under-10k" }, known).priceBandId, "under-10k");
check("repeated param takes first", parseTripFilters({ category: ["trek", "beach"] }, known).categorySlug, "trek");
check("empty string becomes null", parseTripFilters({ category: "" }, known).categorySlug, null);

check("12 month options", getUpcomingMonthOptions().length, 12);
check("past month rejected at the url boundary", parseTripFilters({ month: "2020-01" }, known).month, null);
check("an offered month is kept", parseTripFilters({ month: getUpcomingMonthOptions()[1].value }, known).month, getUpcomingMonthOptions()[1].value);
check("above-50k has no upper bound", findPriceBand("above-50k")?.maxRupees, null);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
