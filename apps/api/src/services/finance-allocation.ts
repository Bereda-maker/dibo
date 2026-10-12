export const FINANCE_TIME_ZONE = "Africa/Addis_Ababa";
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

export const OWNER_PLAN = [
  { key: "essential", sharePercent: 30 },
  { key: "reinvestment", sharePercent: 30 },
  { key: "emergency", sharePercent: 15 },
  { key: "longTerm", sharePercent: 10 },
  { key: "learning", sharePercent: 10 },
  { key: "enjoyment", sharePercent: 5 },
] as const;

export type OwnerPlanKey = (typeof OWNER_PLAN)[number]["key"];

export function monthRangeEAT(month: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) throw new RangeError("Month must use YYYY-MM format");
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1) - EAT_OFFSET_MS);
  const end = new Date(Date.UTC(year, monthIndex + 1, 1) - EAT_OFFSET_MS);
  return { start, end };
}

/** Split verified gross revenue into integer minor units, preserving every minor unit. */
export function calculateRevenueAllocation(grossMinor: number) {
  if (!Number.isSafeInteger(grossMinor) || grossMinor < 0) {
    throw new RangeError("Revenue must be a non-negative safe integer in minor units");
  }
  const godMinor = Math.round(grossMinor / 10);
  const ownerMinor = grossMinor - godMinor;
  const shares = OWNER_PLAN.map((item, index) => {
    const exact = (ownerMinor * item.sharePercent) / 100;
    const amountMinor = Math.floor(exact);
    return { key: item.key, sharePercent: item.sharePercent, amountMinor, remainder: exact - amountMinor, index };
  });
  let remaining = ownerMinor - shares.reduce((sum, item) => sum + item.amountMinor, 0);
  for (const item of [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index)) {
    if (remaining <= 0) break;
    item.amountMinor += 1;
    remaining -= 1;
  }
  return {
    grossMinor,
    godMinor,
    ownerMinor,
    ownerAllocations: shares.map(({ key, sharePercent, amountMinor }) => ({ key, sharePercent, amountMinor })),
  };
}
