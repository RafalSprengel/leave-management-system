"use client";

import { Group, Paper, Stack, Tabs, Text, Title } from "@mantine/core";
import {
  IconBuilding,
  IconCalendarOff,
  IconLock,
  IconSettings,
} from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <div style={{ flex: "1 1 300px" }}>
          <Title order={2} size="h3">
            Team & Organization Settings
          </Title>
          <Text size="sm" c="dimmed">
            Manage company preferences and leave policies
          </Text>
        </div>
      </Group>

      <Paper
        p={{ base: "sm", sm: "md" }}
        radius="md"
        withBorder
        bg="var(--mantine-color-body)"
      >
        <Tabs
          value={pathname}
          onChange={(value) => value && router.push(value)}
        >
          <Tabs.List
            mb="lg"
            style={{
              flexWrap: "nowrap",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
            }}
          >
            <Tabs.Tab
              value="/team/settings/general"
              leftSection={<IconBuilding size={16} />}
              style={{ whiteSpace: "nowrap" }}
            >
              General
            </Tabs.Tab>
            <Tabs.Tab
              value="/team/settings/policies"
              leftSection={<IconSettings size={16} />}
              style={{ whiteSpace: "nowrap" }}
            >
              Leave Policies
            </Tabs.Tab>
            <Tabs.Tab
              value="/team/settings/holidays"
              leftSection={<IconCalendarOff size={16} />}
              style={{ whiteSpace: "nowrap" }}
            >
              Public Holidays
            </Tabs.Tab>
            <Tabs.Tab
              value="/team/settings/closures"
              leftSection={<IconLock size={16} />}
              style={{ whiteSpace: "nowrap" }}
            >
              Factory Closures
            </Tabs.Tab>
          </Tabs.List>

          {children}
        </Tabs>
      </Paper>
    </Stack>
  );
}
