import dayjs, { type Dayjs } from "dayjs";

/**
 * Okres rozliczeniowy urlopu wyliczony z holidayYearStart ("MM-DD") z OrganizationSettings.
 * Zwraca bieżący okres obejmujący podaną datę (domyślnie dziś) w formacie YYYY-MM-DD.
 */
export function getBillingPeriod(
    holidayYearStart: string,
    today: Dayjs = dayjs()
): { start: string; end: string } {
    const startInYear = (year: number) => {
        const [month, day] = holidayYearStart.split("-").map(Number);
        const lastDay = dayjs(`${year}-${String(month).padStart(2, "0")}-01`).daysInMonth();
        return dayjs(`${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`);
    };

    let start = startInYear(today.year());

    if (today.isBefore(start, "day")) {
        start = startInYear(today.year() - 1);
    }

    const end = start.add(1, "year").subtract(1, "day");

    return { start: start.format("YYYY-MM-DD"), end: end.format("YYYY-MM-DD") };
}
