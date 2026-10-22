"use client";

import {
  Anchor,
  Badge,
  Card,
  Flex,
  Group,
  Popover,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import "@mantine/charts/styles.css";
import { LineChart } from "@mantine/charts";
import {
  IconBeach,
  IconCalendarStats,
  IconHourglass,
  IconStethoscope,
} from "@tabler/icons-react";
import dayjs from "dayjs";

import type { EmployeeLeaveStats } from "@/types/stats";

function getTenureDays(employmentDate: string): number {
  if (!employmentDate) return 0;
  return Math.max(dayjs().diff(dayjs(employmentDate), "day"), 0);
}

function formatTenure(days: number): string {
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years > 0) return `${years}y ${months}m`;
  if (months > 0) return `${months}m ${days % 30}d`;
  return `${days}d`;
}

export function EmployeeStatsCharts({
  sickByWeekday,
  sickByMonth,
  annual,
  sickThisPeriod,
  absenceBreakdown,
  employmentDate,
}: EmployeeLeaveStats & { employmentDate: string }) {
  const formatDays = (count: number) =>
    `${count} ${count === 1 ? "day" : "days"}`;

  const hasWeekdayData = sickByWeekday.some((item) => item.days > 0);
  const hasMonthData = sickByMonth.some((item) => item.days > 0);
  const hasAnnualData = annual.allowance > 0 || annual.used > 0;

  const annualTotal = annual.allowance > 0 ? annual.allowance : annual.used;
  const usedPercent =
    annualTotal > 0 ? Math.min((annual.used / annualTotal) * 100, 100) : 0;
  const remainingPercent = Math.max(100 - usedPercent, 0);

  return (
    <Stack gap="xl">
      <SimpleGrid cols={3} spacing={{ base: 6, sm: "lg" }}>
        <Card p={{ base: "xs", sm: "lg" }} radius="md" withBorder h="100%">
          <Flex direction="column" gap="xs" h="100%">
            <Group
              justify="space-between"
              align="flex-start"
              wrap="nowrap"
              gap="xs"
              mih={{ base: 28, sm: 38 }}
            >
              <Text
                fz={{ base: 9, sm: 12 }}
                c="dimmed"
                fw={700}
                tt="uppercase"
                style={{ letterSpacing: "0.05em", minWidth: 0 }}
              >
                Annual Holiday
              </Text>
              <ThemeIcon
                variant="light"
                color="yellow"
                radius="md"
                size="md"
                visibleFrom="sm"
                style={{ flexShrink: 0 }}
              >
                <IconBeach size={20} />
              </ThemeIcon>
            </Group>
            <Stack gap={0}>
              <Text fw={700} fz={{ base: 18, sm: 28 }} lh={1.15}>
                {hasAnnualData ? `${Math.round(usedPercent)}%` : "—"}
              </Text>
              <Group gap={4} mt="sm" wrap="wrap">
                <Badge
                  variant="light"
                  color="yellow"
                  size="sm"
                  styles={{
                    root: { height: "auto", paddingBlock: 2 },
                    label: {
                      whiteSpace: "normal",
                      textAlign: "center",
                      fontSize: "clamp(9px, 2.5vw, 12px)",
                      lineHeight: 1.2,
                    },
                  }}
                >
                  {hasAnnualData
                    ? `${annual.used} of ${annualTotal} days used`
                    : "No allowance data"}
                </Badge>
                {hasAnnualData && (
                  <Text size="xs" fz={{ base: 10, sm: 12 }} c="dimmed">
                    {annual.remaining} days left
                  </Text>
                )}
              </Group>
              {hasAnnualData && (
                <Progress.Root radius="xl" size={10} mt="md">
                  <Progress.Section value={usedPercent} color="yellow.6" />
                  <Progress.Section value={remainingPercent} color="gray.8" />
                </Progress.Root>
              )}
            </Stack>
          </Flex>
        </Card>

        <Card p={{ base: "xs", sm: "lg" }} radius="md" withBorder h="100%">
          <Flex direction="column" gap="xs" h="100%">
            <Group
              justify="space-between"
              align="flex-start"
              wrap="nowrap"
              gap="xs"
              mih={{ base: 28, sm: 38 }}
            >
              <Text
                fz={{ base: 9, sm: 12 }}
                c="dimmed"
                fw={700}
                tt="uppercase"
                style={{ letterSpacing: "0.05em", minWidth: 0 }}
              >
                Absences
              </Text>
              <ThemeIcon
                variant="light"
                color="red"
                radius="md"
                size="md"
                visibleFrom="sm"
                style={{ flexShrink: 0 }}
              >
                <IconStethoscope size={20} />
              </ThemeIcon>
            </Group>
            <Stack gap={0} h="100%" justify="space-between">
              <Stack gap={4}>
                <Text fz={{ base: 10, sm: 12 }} c="dimmed" fw={500}>
                  Sick
                </Text>
                <Text fw={700} fz={{ base: 18, sm: 28 }} lh={1.15}>
                  {sickThisPeriod} {sickThisPeriod === 1 ? "day" : "days"}
                </Text>
              </Stack>
              <Popover
                position="bottom-start"
                withArrow
                shadow="md"
                radius="md"
                width={230}
                withinPortal
              >
                <Popover.Target>
                  <Anchor
                    component="button"
                    type="button"
                    size="xs"
                    underline="always"
                    ta="left"
                    style={{ alignSelf: "flex-start" }}
                  >
                    more...
                  </Anchor>
                </Popover.Target>
                <Popover.Dropdown
                  p="xs"
                  style={{
                    borderRadius: 12,
                    boxShadow: "0 16px 40px rgba(0, 0, 0, 0.18)",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6}>
                    Additional Absences
                  </Text>
                  <Stack gap={4}>
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm" c="dimmed" fw={400}>
                        Unauthorized
                      </Text>
                      <Badge color="gray" variant="light" size="sm">
                        {formatDays(absenceBreakdown.unauthorised)}
                      </Badge>
                    </Group>
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm" c="dimmed" fw={400}>
                        Unpaid Leave
                      </Text>
                      <Badge color="gray" variant="light" size="sm">
                        {formatDays(absenceBreakdown.unpaid)}
                      </Badge>
                    </Group>
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm" c="dimmed" fw={400}>
                        Bereavement
                      </Text>
                      <Badge color="gray" variant="light" size="sm">
                        {formatDays(absenceBreakdown.bereavement)}
                      </Badge>
                    </Group>
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm" c="dimmed" fw={400}>
                        Other
                      </Text>
                      <Badge color="gray" variant="light" size="sm">
                        {formatDays(absenceBreakdown.other)}
                      </Badge>
                    </Group>
                  </Stack>
                </Popover.Dropdown>
              </Popover>
            </Stack>
          </Flex>
        </Card>

        <Card p={{ base: "xs", sm: "lg" }} radius="md" withBorder h="100%">
          <Flex direction="column" gap="xs" h="100%">
            <Group
              justify="space-between"
              align="flex-start"
              wrap="nowrap"
              gap="xs"
              mih={{ base: 28, sm: 38 }}
            >
              <Text
                fz={{ base: 9, sm: 12 }}
                c="dimmed"
                fw={700}
                tt="uppercase"
                style={{ letterSpacing: "0.05em", minWidth: 0 }}
              >
                Tenure
              </Text>
              <ThemeIcon
                variant="light"
                color="blue"
                radius="md"
                size="md"
                visibleFrom="sm"
                style={{ flexShrink: 0 }}
              >
                <IconHourglass size={20} />
              </ThemeIcon>
            </Group>
            <Stack gap={0}>
              <Text fw={700} fz={{ base: 18, sm: 28 }} lh={1.15}>
                {employmentDate
                  ? formatTenure(getTenureDays(employmentDate))
                  : "-"}
              </Text>
              <Group gap={4} mt="sm" wrap="wrap">
                <Badge
                  variant="light"
                  color="blue"
                  size="sm"
                  styles={{
                    root: { height: "auto", paddingBlock: 2 },
                    label: {
                      whiteSpace: "normal",
                      textAlign: "center",
                      fontSize: "clamp(9px, 2.5vw, 12px)",
                      lineHeight: 1.2,
                    },
                  }}
                >
                  {employmentDate
                    ? `Since ${dayjs(employmentDate).format("DD.MM.YYYY")}`
                    : "No employment date"}
                </Badge>
              </Group>
            </Stack>
          </Flex>
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Stack gap="xs">
          <Group gap="xs">
            <IconCalendarStats size={20} />
            <Title order={4}>Sick per Month</Title>
          </Group>
          <Text size="xs" c="dimmed">
            Sick days per month over the last 12 months.
          </Text>
          {hasMonthData ? (
            <LineChart
              h={300}
              data={sickByMonth}
              dataKey="month"
              series={[{ name: "days", label: "Sick days", color: "red.6" }]}
              tickLine="y"
              gridAxis="x"
              withTooltip
              withDots
              xAxisProps={{ angle: -45, textAnchor: "end", height: 55 }}
              yAxisLabel="Days"
            />
          ) : (
            <Text size="sm" c="dimmed">
              No sick leave data in the last 12 months.
            </Text>
          )}
        </Stack>

        <Stack gap="xs">
          <Group gap="xs">
            <IconStethoscope size={20} />
            <Title order={4}>Sick Leave by Weekday</Title>
          </Group>
          <Text size="xs" c="dimmed">
            Sick days per weekday over the last 12 months.
          </Text>
          {hasWeekdayData ? (
            <LineChart
              h={300}
              data={sickByWeekday}
              dataKey="day"
              series={[{ name: "days", label: "Sick days", color: "red.6" }]}
              tickLine="y"
              gridAxis="x"
              withTooltip
              withDots
              yAxisProps={{ allowDecimals: false }}
              yAxisLabel="Days"
            />
          ) : (
            <Text size="sm" c="dimmed">
              No sick leave data in the last 12 months.
            </Text>
          )}
        </Stack>
      </SimpleGrid>
    </Stack>
  );
}
