"use client";

import { Paper, Tabs } from "@mantine/core";
import {
  IconCalendarEvent,
  IconCalendarStats,
  IconChartLine,
  IconCoins,
  IconUser,
} from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";

const tabs = [
  { value: "profile", label: "Profile", icon: IconUser },
  { value: "leaves", label: "Leaves", icon: IconCalendarEvent },
  { value: "calendar", label: "Calendar", icon: IconCalendarStats },
  { value: "allowances", label: "Allowances", icon: IconCoins },
  { value: "stats", label: "Stats", icon: IconChartLine },
];

export default function EmployeeDetailTabs({
  employeeId,
  children,
}: {
  employeeId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Paper
      p={{ base: "sm", sm: "md" }}
      radius="md"
      withBorder
      bg="var(--mantine-color-body)"
    >
      <Tabs value={pathname} onChange={(value) => value && router.push(value)}>
        <Tabs.List
          mb="lg"
          style={{
            flexWrap: "nowrap",
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tabs.Tab
                key={tab.value}
                value={`/team/employees/${employeeId}/${tab.value}`}
                leftSection={<Icon size={16} />}
                style={{ whiteSpace: "nowrap" }}
              >
                {tab.label}
              </Tabs.Tab>
            );
          })}
        </Tabs.List>

        {children}
      </Tabs>
    </Paper>
  );
}
