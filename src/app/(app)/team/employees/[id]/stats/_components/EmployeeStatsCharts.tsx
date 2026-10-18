"use client";

import { Group, Progress, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import "@mantine/charts/styles.css";
import { LineChart } from "@mantine/charts";
import {
  IconBeach,
  IconCalendarStats,
  IconStethoscope,
} from "@tabler/icons-react";

import type { EmployeeLeaveStats } from "@/types/stats";

export function EmployeeStatsCharts({
  sickByWeekday,
  sickByMonth,
  annual,
}: EmployeeLeaveStats) {
  const hasWeekdayData = sickByWeekday.some((item) => item.days > 0);
  const hasMonthData = sickByMonth.some((item) => item.days > 0);
  const hasAnnualData = annual.allowance > 0 || annual.used > 0;

  const annualTotal = annual.allowance > 0 ? annual.allowance : annual.used;
  const usedPercent =
    annualTotal > 0 ? Math.min((annual.used / annualTotal) * 100, 100) : 0;
  const remainingPercent = Math.max(100 - usedPercent, 0);

  return (
    <Stack gap="xl">
      <Stack gap="sm" maw={480} w="100%" mx="auto">
        <Group gap="xs" justify="center">
          <IconBeach size={20} />
          <Title order={4}>Annual Holiday</Title>
        </Group>
        {hasAnnualData ? (
          <Stack gap={6}>
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                {annual.used} days taken
              </Text>
              <Text size="sm" c="dimmed">
                {annual.remaining} left of {annual.allowance}
              </Text>
            </Group>
            <Progress.Root radius="xl" size={16}>
              <Progress.Section value={usedPercent} color="yellow.6" />
              <Progress.Section value={remainingPercent} color="gray.8" />
            </Progress.Root>
          </Stack>
        ) : (
          <Text size="sm" c="dimmed" ta="center">
            No annual allowance data.
          </Text>
        )}
      </Stack>

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
            Average sick days per weekday over the last 12 months.
          </Text>
          {hasWeekdayData ? (
            <LineChart
              h={300}
              data={sickByWeekday}
              dataKey="day"
              series={[
                { name: "average", label: "Avg sick days", color: "red.6" },
              ]}
              tickLine="y"
              gridAxis="x"
              withTooltip
              withDots
              valueFormatter={(value) => value.toFixed(1)}
              yAxisLabel="Avg days"
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
