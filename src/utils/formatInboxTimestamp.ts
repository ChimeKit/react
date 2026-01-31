export type FormatInboxTimestampOptions = {
  now?: Date;
  locale?: string | string[];
};

const MS_IN_DAY = 1000 * 60 * 60 * 24;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export function formatInboxTimestamp(
  date: Date,
  { now = new Date(), locale }: FormatInboxTimestampOptions = {}
): string {
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const todayStart = startOfDay(now);
  const targetStart = startOfDay(date);
  const diff = todayStart.getTime() - targetStart.getTime();

  const timeLabel = timeFormatter.format(date);

  if (diff === 0) {
    return `Today at ${timeLabel}`;
  }

  if (diff === MS_IN_DAY) {
    return `Yesterday at ${timeLabel}`;
  }

  const includeYear = date.getFullYear() !== now.getFullYear();
  const monthDayFormatter = new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    ...(includeYear ? { year: "numeric" as const } : {}),
  });
  const dayLabel = monthDayFormatter.format(date);

  return `${dayLabel} at ${timeLabel}`;
}
