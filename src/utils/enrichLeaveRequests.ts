import dbConnect from "@/db/connection";
import Absence from "@/db/models/Absence";
import { getNonWorkingDays } from "@/utils/nonWorkingDays";
import { countAbsenceOverlapDays, type DateRange } from "@/utils/leaveBalance";
import { computeLeaveDaysRequested } from "@/utils/workingDays";
import { consumesAllowance } from "@/constants/leaveTypes";

interface EnrichableRequest {
    employee?: string;
    startDate: string;
    endDate: string;
    startHalfDay?: boolean;
    endHalfDay?: boolean;
    type: string;
}

export type WithChargedDays<T> = T & {
    /** Dni pracujace wniosku - wartosc pochodna (liczona z okresu i aktualnych dni nieroboczych). */
    daysRequested: number;
    /** Dni faktycznie odliczane od puli urlopu (po odjeciu dni pokrytych absencja). */
    chargedDays: number;
    /** Dni robocze urlopu pokryte absencja. */
    absenceDays: number;
};

/**
 * Uzupelnia wnioski o wartosci pochodne:
 * - `daysRequested` - dni robocze z okresu wniosku (z aktualnych dni nieroboczych),
 * - `chargedDays` - dni odliczane od puli urlopu (daysRequested minus dni pokryte absencja),
 * - `absenceDays` - dni robocze wniosku pokryte absencja.
 * Wnioski sa przekazywane po JSON.parse, wiec `employee` jest stringiem.
 * Tylko wnioski typu "holiday" sa korygowane o absencje.
 */
export async function addChargedDays<T extends EnrichableRequest>(
    requests: T[],
    organizationId: string
): Promise<WithChargedDays<T>[]> {
    if (requests.length === 0) return [];

    await dbConnect();

    const minStart = requests.reduce(
        (min, r) => (r.startDate < min ? r.startDate : min),
        requests[0].startDate
    );
    const maxEnd = requests.reduce(
        (max, r) => (r.endDate > max ? r.endDate : max),
        requests[0].endDate
    );

    const annual = requests.filter((r) => consumesAllowance(r.type) && r.employee);
    const employeeIds = Array.from(new Set(annual.map((r) => String(r.employee))));

    const [absenceDocs, nonWorkingDays] = await Promise.all([
        employeeIds.length > 0
            ? Absence.find({
                  organizationId,
                  employee: { $in: employeeIds },
                  startDate: { $lte: maxEnd },
                  endDate: { $gte: minStart },
              })
                  .select("employee startDate endDate")
                  .lean()
            : Promise.resolve([]),
        getNonWorkingDays(organizationId, minStart, maxEnd),
    ]);

    const absencesByEmployee = new Map<string, DateRange[]>();
    for (const a of absenceDocs) {
        const key = a.employee.toString();
        const list = absencesByEmployee.get(key) ?? [];
        list.push({ startDate: a.startDate, endDate: a.endDate });
        absencesByEmployee.set(key, list);
    }

    return requests.map((r) => {
        const daysRequested = computeLeaveDaysRequested(
            r.startDate,
            r.endDate,
            r.startHalfDay ?? false,
            r.endHalfDay ?? false,
            nonWorkingDays
        );

        if (!consumesAllowance(r.type) || !r.employee) {
            return { ...r, daysRequested, chargedDays: daysRequested, absenceDays: 0 };
        }

        const absences = absencesByEmployee.get(String(r.employee)) ?? [];
        const absenceDays = countAbsenceOverlapDays(r, absences, nonWorkingDays);
        return {
            ...r,
            daysRequested,
            chargedDays: Math.max(daysRequested - absenceDays, 0),
            absenceDays,
        };
    });
}
