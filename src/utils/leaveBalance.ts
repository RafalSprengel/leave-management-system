import dayjs from "dayjs";
import { computeLeaveDaysRequested, isWorkingDay } from "@/utils/workingDays";

/**
 * Czyste funkcje (bez dostepu do bazy) do liczenia salda urlopu z uwzglednieniem absencji.
 * Absencja (sick / unauthorised / other) ma wyzszy priorytet niz urlop - dni robocze
 * urlopu pokryte absencja nie sa odliczane od puli urlopowej.
 * Polowki dni sa ignorowane: absencja pokrywa cale dni.
 */

export interface DateRange {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
}

interface ChargeableRequest {
    status: string;
    type: string;
    daysRequested: number;
    chargedDays?: number;
}

/**
 * Liczy dni robocze z zakresu urlopu, ktore pokrywaja sie z dowolna absencja.
 * Weekendy i dni nierobocze (bank holidays, company closures) nie sa liczone.
 */
export function countAbsenceOverlapDays(
    leave: DateRange,
    absences: DateRange[],
    nonWorkingDays: Set<string>
): number {
    if (absences.length === 0) return 0;

    const end = dayjs(leave.endDate, "YYYY-MM-DD");
    let current = dayjs(leave.startDate, "YYYY-MM-DD");
    let overlap = 0;

    while (!current.isAfter(end, "day")) {
        const formatted = current.format("YYYY-MM-DD");

        if (
            isWorkingDay(current, nonWorkingDays) &&
            absences.some((a) => a.startDate <= formatted && a.endDate >= formatted)
        ) {
            overlap++;
        }
        current = current.add(1, "day");
    }

    return overlap;
}

/** Dni faktycznie odliczane od puli (wniosek bez pola chargedDays = daysRequested). */
export function getChargedDays(request: Pick<ChargeableRequest, "daysRequested" | "chargedDays">): number {
    return request.chargedDays ?? request.daysRequested;
}

/**
 * Tekst do wyswietlenia liczby dni wniosku, np. "5" albo "5 (2 covered by absence)".
 * Adnotacja pojawia sie tylko, gdy czesc dni pokrywa absencja.
 */
export function formatRequestDays(
    request: Pick<ChargeableRequest, "daysRequested"> & { absenceDays?: number },
    suffix = ""
): string {
    const base = `${request.daysRequested}${suffix}`;
    return request.absenceDays && request.absenceDays > 0
        ? `${base} (${request.absenceDays} covered by absence)`
        : base;
}

/**
 * Zuzyte dni holiday w okresie [start, end]: zatwierdzone wnioski holiday (dni robocze,
 * z polowkami) pomniejszone o dni pokryte absencja. Wniosek jest przycinany do okresu.
 */
/**
 * Jedno zrodlo allowance typu holiday. Priorytet: wpis LeaveAllowance,
 * potem employee.holidayAllowance, potem domyslna wartosc organizacji, na koncu stala.
 */
export function resolveHolidayAllowance(input: {
    allowanceDays?: number | null;
    employeeHolidayAllowance?: number | null;
    orgDefault?: number | null;
    fallback: number;
}): number {
    return input.allowanceDays ?? input.employeeHolidayAllowance ?? input.orgDefault ?? input.fallback;
}

export interface LeaveRequestDates {
    startDate: string;
    endDate: string;
    startHalfDay?: boolean;
    endHalfDay?: boolean;
}

/**
 * Dni jednego wniosku przypadajace na okres. Polowka dnia jest odejmowana tylko wtedy,
 * gdy odpowiednia krawedz wniosku nie zostala przycieta do okresu.
 */
export function countLeaveDaysInPeriod(
    req: LeaveRequestDates,
    period: DateRange,
    absences: DateRange[],
    nonWorkingDays: Set<string>
): number {
    const from = req.startDate < period.startDate ? period.startDate : req.startDate;
    const to = req.endDate > period.endDate ? period.endDate : req.endDate;
    if (from > to) return 0;

    const days = computeLeaveDaysRequested(
        from,
        to,
        !!req.startHalfDay && from === req.startDate,
        !!req.endHalfDay && to === req.endDate,
        nonWorkingDays
    );
    return Math.max(days - countAbsenceOverlapDays({ startDate: from, endDate: to }, absences, nonWorkingDays), 0);
}

export function countHolidayUsedInPeriod(
    requests: LeaveRequestDates[],
    absences: DateRange[],
    period: DateRange,
    nonWorkingDays: Set<string>
): number {
    return requests.reduce((sum, req) => sum + countLeaveDaysInPeriod(req, period, absences, nonWorkingDays), 0);
}

