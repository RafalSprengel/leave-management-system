import dayjs from "dayjs";
import { isWorkingDay } from "@/utils/workingDays";

export function listDays(start: string, end: string): string[] {
    const days: string[] = [];
    let cur = dayjs(start, "YYYY-MM-DD");
    const last = dayjs(end, "YYYY-MM-DD");
    while (!cur.isAfter(last, "day")) {
        days.push(cur.format("YYYY-MM-DD"));
        cur = cur.add(1, "day");
    }
    return days;
}

export function findNonWorkingInRange(
    start: string,
    end: string,
    nonWorkingDates: ReadonlySet<string>
): string[] {
    return listDays(start, end).filter((day) => nonWorkingDates.has(day));
}

/** Dni robocze z zakresu, ktore sa juz zajete przez zatwierdzone wpisy. */
export function findBookedWorkingDaysInRange(
    start: string,
    end: string,
    bookedDates: ReadonlySet<string>,
    nonWorkingDates: ReadonlySet<string>
): string[] {
    return listDays(start, end).filter(
        (day) => bookedDates.has(day) && isWorkingDay(day, nonWorkingDates)
    );
}

