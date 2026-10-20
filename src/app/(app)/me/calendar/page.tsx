"use client";

import {
  Center,
  Grid,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  MobileMonthView,
  ScheduleHeader,
  type ScheduleEventData,
} from "@mantine/schedule";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { getLeaveTypeLabel } from "@/constants/leaveTypes";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { useEmployees } from "@/hooks/useEmployees";
import { useMyLeaveRequests } from "@/hooks/useMyLeaveRequests";
import { useColleagueLeaveRequests } from "@/hooks/useColleagueLeaveRequests";
import { useNonWorkingDays } from "@/hooks/useNonWorkingDays";
import { getWorkingDays } from "@/utils/workingDays";

const dotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  flexShrink: 0,
};

/** Ile dni w przod pokazuje lista "Teammates on leave in next 7 days". */
const UPCOMING_DAYS = 7;

/** Kolory zdarzen = kolory kropek w legendzie pod kalendarzem. */
const MY_LEAVE_COLOR = "green";
const TEAM_LEAVE_COLOR = "blue";
const CLOSURE_COLOR = "gray";

/** Przesuwa miesiac wyswietlany w kalendarzu o podana liczbe miesiecy. */
const shiftMonth = (date: Date | string, amount: number) =>
  dayjs(date).add(amount, "month").startOf("month").format("YYYY-MM-DD");

export default function EmployeeCalendarPage() {
  const router = useRouter();

  // Miesiac wyswietlany w kalendarzu oraz dzien wybrany kliknieciem.
  // Szczegoly wybranego dnia renderuje MobileMonthView (lista pod siatka miesiaca).
  const [calendarDate, setCalendarDate] = useState(
    dayjs().format("YYYY-MM-DD"),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(
    dayjs().format("YYYY-MM-DD"),
  );

  const { employee: currentEmployee, loading: loadingEmployee } =
    useCurrentEmployee();
  const { employees, loading: loadingEmployees } = useEmployees();
  const { requests: myRequests, loading: loadingMyRequests } =
    useMyLeaveRequests();
  const { requests: teamRequests, loading: loadingTeamRequests } =
    useColleagueLeaveRequests();
  const { bankHolidaysMap, closuresMap, loading: loadingClosures } =
    useNonWorkingDays();

  // Dni nierobocze (bank holidays + closures) -> wspolny Set dla helpera dni pracujacych
  const nonWorkingDates = useMemo(() => {
    const set = new Set<string>();
    bankHolidaysMap.forEach((_, date) => {
      set.add(date);
    });
    closuresMap.forEach((_, date) => {
      set.add(date);
    });
    return set;
  }, [bankHolidaysMap, closuresMap]);

  const loading =
    loadingEmployee ||
    loadingEmployees ||
    loadingMyRequests ||
    loadingTeamRequests ||
    loadingClosures;

  // Pracownicy z mojego dzialu, bez mnie
  const colleagueIds = useMemo(() => {
    if (!currentEmployee) return new Set<string>();

    const myDeptId =
      typeof currentEmployee.department === "object"
        ? currentEmployee.department?._id
        : currentEmployee.department;

    if (!myDeptId) return new Set<string>();

    return new Set(
      employees
        .filter((emp) => emp._id !== currentEmployee._id)
        .filter((emp) => {
          const deptId =
            typeof emp.department === "object"
              ? emp.department?._id
              : emp.department;
          return deptId === myDeptId;
        })
        .map((emp) => emp._id),
    );
  }, [currentEmployee, employees]);

  // Zdarzenia kalendarza: moje zatwierdzone urlopy (zielone), zatwierdzone urlopy
  // kolegow z dzialu (niebieskie) oraz dni zamkniecia firmy (szare).
  const calendarEvents: ScheduleEventData[] = useMemo(() => {
    // Jedno zdarzenie na kazdy dzien roboczy urlopu — kropka pojawia sie wtedy w
    // kazdym dniu urlopu, a lista pod kalendarzem pokazuje dokladnie ten dzien.
    const toDailyEvents = (
      startDate: string,
      endDate: string,
      build: (date: string) => { id: string; title: string; color: string },
    ): ScheduleEventData[] =>
      getWorkingDays(startDate, endDate, nonWorkingDates).map((date) => ({
        ...build(date),
        // 00:00:00 dla startu i konca => zdarzenie calodniowe ("All day")
        start: `${date} 00:00:00`,
        end: `${date} 00:00:00`,
      }));

    const myEvents = myRequests
      .filter((req) => req.status === "approved")
      .flatMap((req) =>
        toDailyEvents(req.startDate, req.endDate, (date) => ({
          id: `mine-${req._id}#${date}`,
          title: `My ${getLeaveTypeLabel(req.type)}`,
          color: MY_LEAVE_COLOR,
        })),
      );

    const teamEvents = teamRequests
      .filter(
        (req) =>
          req.status === "approved" &&
          req.employee &&
          colleagueIds.has(req.employee),
      )
      .flatMap((req) =>
        toDailyEvents(req.startDate, req.endDate, (date) => ({
          id: `team-${req._id}#${date}`,
          title: `${req.employeeName || "Team member"} · ${getLeaveTypeLabel(
            req.type,
          )}`,
          color: TEAM_LEAVE_COLOR,
        })),
      );

    const closureEvents: ScheduleEventData[] = Array.from(
      closuresMap,
      ([date, title]) => ({
        id: `closure-${date}`,
        title,
        start: `${date} 00:00:00`,
        end: `${date} 00:00:00`,
        color: CLOSURE_COLOR,
      }),
    );

    return [...closureEvents, ...myEvents, ...teamEvents];
  }, [myRequests, teamRequests, closuresMap, colleagueIds, nonWorkingDates]);

  // Zatwierdzone urlopy kolegow z dzialu w najblizszych 7 dniach (do listy w panelu).
  // Pokazujemy tylko wnioski, ktore nachodza na okno [dzisiaj, dzisiaj + 7 dni].
  const colleaguesApprovedRequests = useMemo(() => {
    const windowStart = dayjs().startOf("day");
    const windowEnd = windowStart.add(UPCOMING_DAYS, "day");

    return teamRequests
      .filter(
        (req) =>
          req.status === "approved" &&
          req.employee &&
          colleagueIds.has(req.employee) &&
          !dayjs(req.endDate).isBefore(windowStart, "day") &&
          !dayjs(req.startDate).isAfter(windowEnd, "day"),
      )
      .sort(
        (a, b) =>
          dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf(),
      );
  }, [teamRequests, colleagueIds]);

  const handleEventClick = (event: ScheduleEventData) => {
    const rawId = String(event.id);
    // Klikniecie we wlasny urlop otwiera szczegoly wniosku. Zdarzenia kolegow
    // oraz dni zamkniecia firmy nie prowadza do zadnej strony.
    if (!rawId.startsWith("mine-")) return;

    // id ma format `mine-${requestId}#${date}`
    const leaveRequestId = rawId.split("#")[0].replace("mine-", "");
    router.push(`/me/leave-requests/${leaveRequestId}`);
  };

  const renderLegend = (dotColor: string, label: string) => (
    <Group gap="xs" align="center">
      <span
        style={{
          ...dotStyle,
          background: `var(--mantine-color-${dotColor}-6)`,
        }}
      />
      <Text size="sm">{label}</Text>
    </Group>
  );

  if (loading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Title order={2}>My Schedule & Calendar</Title>

      <Grid gap="md" align="start">
        <Grid.Col span={{ base: 12, md: "content" }}>
          <Paper
            p="md"
            radius="md"
            withBorder
            bg="var(--mantine-color-body)"
            w={{ base: "100%", md: 420 }}
          >
            <MobileMonthView
              date={calendarDate}
              selectedDate={selectedDate}
              onSelectedDateChange={setSelectedDate}
              events={calendarEvents}
              firstDayOfWeek={1}
              withOutsideDays
              onEventClick={handleEventClick}
              renderHeader={({ date }) => (
                <Group
                  justify="space-between"
                  align="center"
                  wrap="nowrap"
                  gap="xs"
                  w="100%"
                >
                  <Group gap={4} align="center" wrap="nowrap">
                    <ScheduleHeader.Previous
                      onClick={() => setCalendarDate(shiftMonth(date, -1))}
                    />
                    <ScheduleHeader.Control interactive={false}>
                      {dayjs(date).format("MMMM YYYY")}
                    </ScheduleHeader.Control>
                    <ScheduleHeader.Next
                      onClick={() => setCalendarDate(shiftMonth(date, 1))}
                    />
                  </Group>
                  <ScheduleHeader.Today
                    onClick={() =>
                      setCalendarDate(dayjs().format("YYYY-MM-DD"))
                    }
                  />
                </Group>
              )}
            />

            <Stack gap="xs" align="flex-start" mt="md">
              {renderLegend("green", "My approved leave")}
              {renderLegend("blue", "Team members on leave")}
              {renderLegend("gray", "Closure days")}
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: "auto" }}>
          <Paper
            p="md"
            radius="md"
            withBorder
            bg="var(--mantine-color-body)"
            style={{ minHeight: 350 }}
          >
            <Title order={4} mb="md">
             Upcoming Team Leave
            </Title>

            <Stack gap="xs">
              {colleaguesApprovedRequests.length === 0 && (
                <Text size="sm" c="dimmed">
                  No one from your team is on leave in the next 7 days.
                </Text>
              )}

              {colleaguesApprovedRequests.map((req) => (
                <Paper
                  key={req._id}
                  p="sm"
                  radius="sm"
                  withBorder
                  bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))"
                >
                  <Group justify="space-between" mb="xs">
                    <Text fw={600} size="sm">
                      {req.employeeName || "Team member"}
                    </Text>
                    <span
                      style={{
                        ...dotStyle,
                        background: "var(--mantine-color-blue-6)",
                      }}
                    />
                  </Group>
                  <Text size="xs" c="dimmed" tt="capitalize">
                    {req.type} Leave
                  </Text>
                  <Text size="xs" c="dimmed">
                    {dayjs(req.startDate).format("DD-MM-YYYY")} →{" "}
                    {dayjs(req.endDate).format("DD-MM-YYYY")}
                  </Text>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
