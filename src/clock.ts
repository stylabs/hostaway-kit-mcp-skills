/** Fixture tests pin "now" so SLA hours stay deterministic. */
export function now(): Date {
  const pinned = process.env.HOSTAWAY_KIT_NOW;
  if (pinned) {
    const date = new Date(pinned);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
}

export function parseHostawayDateTime(value: string): Date {
  if (value.includes("T")) return new Date(value);
  return new Date(`${value.replace(" ", "T")}Z`);
}

export function hoursBetween(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / 3_600_000;
}

export function formatHour(hour: number | null): string | null {
  if (hour === null || hour === undefined) return null;
  if (hour < 0 || hour > 23) {
    return null;
  }
  return `${String(hour).padStart(2, "0")}:00`;
}
