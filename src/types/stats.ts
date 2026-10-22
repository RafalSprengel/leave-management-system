export interface SickWeekdayStat {
  day: string;
  /** Liczba dni chorobowych przypadajacych na ten dzien tygodnia w okresie. */
  days: number;
  /** Liczba wystapien tego dnia tygodnia w okresie (mianownik sredniej). */
  occurrences: number;
  average: number;
}

export interface SickMonthStat {
  /** Klucz miesiaca w formacie YYYY-MM. */
  month: string;
  days: number;
}

export interface AnnualLeaveSummary {
  /** Pula dni urlopu wypoczynkowego (LeaveAllowance, fallback: employee.holidayAllowance). */
  allowance: number;
  used: number;
  remaining: number;
}

export interface AbsenceBreakdown {
  unauthorised: number;
  other: number;
  unpaid: number;
  bereavement: number;
}

export interface EmployeeLeaveStats {
  sickByWeekday: SickWeekdayStat[];
  sickByMonth: SickMonthStat[];
  annual: AnnualLeaveSummary;
  sickThisPeriod: number;
  absenceBreakdown: AbsenceBreakdown;
}
