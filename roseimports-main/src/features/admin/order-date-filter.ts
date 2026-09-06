import { site } from "@/lib/config/site";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const dateTimeParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: site.timezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Aceita apenas datas reais no formato emitido por input[type=date]. */
export function parseOrderDate(value: string): string {
  if (!DATE_PATTERN.test(value)) return "";

  const [year, month, day] = value.split("-").map(Number);
  if (!year || year < 2000 || year > 2100 || !month || !day) return "";

  const normalized = new Date(Date.UTC(year, month - 1, day))
    .toISOString()
    .slice(0, 10);

  return normalized === value ? value : "";
}

function nextDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + 1))
    .toISOString()
    .slice(0, 10);
}

/** Converte meia-noite da loja para um instante UTC, inclusive em DST. */
function zonedMidnight(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const target = Date.UTC(year!, month! - 1, day!);
  let instant = target;

  // Duas passagens resolvem a diferença entre o palpite UTC e o fuso local.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = dateTimeParts.formatToParts(new Date(instant));
    const read = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value ?? 0);
    const representedAsUtc = Date.UTC(
      read("year"),
      read("month") - 1,
      read("day"),
      read("hour"),
      read("minute"),
      read("second"),
    );
    instant = target - (representedAsUtc - instant);
  }

  return new Date(instant).toISOString();
}

export function orderDateStart(value: string): string {
  return zonedMidnight(value);
}

/** O fim é exclusivo: inclui o dia escolhido inteiro, até 23:59:59.999. */
export function orderDateEndExclusive(value: string): string {
  return zonedMidnight(nextDate(value));
}
