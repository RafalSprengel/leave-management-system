"use client";

import { useEffect, useState } from "react";
import {
  ActionIcon,
  Avatar,
  Box,
  Divider,
  Group,
  SegmentedControl,
  Stack,
  Text,
  UnstyledButton,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconBriefcase,
  IconCalendar,
  IconFileDescription,
  IconLayoutDashboard,
  IconLogout,
  IconMoon,
  IconReportAnalytics,
  IconSettings,
  IconSun,
  IconUser,
  IconUserOff,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import styles from "./SidebarContent.module.css";

interface SidebarContentProps {
  onClose: () => void;
  isMobile: boolean;
  role: "Manager" | "Employee" | null;
}

export default function SidebarContent({
  onClose,
  isMobile,
  role,
}: SidebarContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [mounted, setMounted] = useState(false);

  const { employee, loading } = useCurrentEmployee();
  const fullName = `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim();
  const initials = `${employee?.firstName?.[0] || ""}${employee?.lastName?.[0] || ""}`.toUpperCase();

  const [viewMode, setViewMode] = useState<string>(() =>
    role === "Employee" ? "me" : pathname.startsWith("/team") ? "team" : "me"
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (role === "Employee") {
      setViewMode("me");
    } else if (pathname.startsWith("/team")) {
      setViewMode("team");
    } else if (pathname.startsWith("/me")) {
      setViewMode("me");
    }
  }, [pathname, role]);

  const handleViewModeChange = (value: string) => {
    setViewMode(value);
    if (value === "team") {
      router.push("/team");
    } else if (value === "me") {
      router.push("/me");
    }
  };

  const isActive = (path: string) => {
    if (path === "/me" || path === "/team") {
      return pathname === path ? true : undefined;
    }
    return pathname === path || pathname.startsWith(path + "/") ? true : undefined;
  };

  const toggleColorScheme = () => {
    setColorScheme(colorScheme === "dark" ? "light" : "dark");
    onClose();
  };

  const handleLogout = async () => {
    onClose();
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/sign-in";
        },
      },
    });
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topSection}>
        <Group justify="space-between" align="center" w="100%" mb="xs">
          <Group gap={10} align="center">
            <Box
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
              }}
            >
              <IconBriefcase size={18} stroke={2.2} />
            </Box>
            <Text
              fw={800}
              size="lg"
              style={{
                letterSpacing: "1.2px",
                textTransform: "uppercase",
                fontFamily: "var(--mantine-font-family-monospace)",
                fontSize: "1.05rem",
              }}
            >
              OFF<span style={{ color: "#10b981" }}>-</span>WORK
            </Text>
          </Group>

          {isMobile && (
            <UnstyledButton onClick={onClose} className={styles.closeBtn}>
              <IconX size={20} />
            </UnstyledButton>
          )}
        </Group>

        {role === "Manager" && (
          <SegmentedControl
            fullWidth
            mt="lg"
            value={viewMode}
            onChange={handleViewModeChange}
            data={[
              { label: "TEAM", value: "team" },
              { label: "ME", value: "me" },
            ]}
            styles={{
              root: {
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                padding: "4px",
              },
              indicator: {
                backgroundColor: "rgba(255, 255, 255, 0.12)",
              },
              label: {
                color: "var(--mantine-color-dimmed)",
                fontWeight: 600,
                fontSize: "12px",
                letterSpacing: "0.5px",
              },
            }}
          />
        )}
      </div>

      <div className={styles.scrollSection}>
        <Stack gap="xs" px="md">
          {viewMode === "me" ? (
            <>
              <Text size="xs" fw={700} c="dimmed" lts="1px">
                MENU
              </Text>

              <UnstyledButton
                className={styles.menuItem}
                data-active={isActive("/me")}
                component={Link}
                href="/me"
                prefetch={false}
                onClick={onClose}
              >
                <Group gap="sm">
                  <IconLayoutDashboard size={18} />
                  <Text size="sm">Dashboard</Text>
                </Group>
              </UnstyledButton>

              <UnstyledButton
                className={styles.menuItem}
                data-active={isActive("/me/leave-requests")}
                component={Link}
                href="/me/leave-requests"
                prefetch={false}
                onClick={onClose}
              >
                <Group gap="sm">
                  <IconFileDescription size={18} />
                  <Text size="sm">Leave Requests</Text>
                </Group>
              </UnstyledButton>

              <UnstyledButton
                className={styles.menuItem}
                data-active={isActive("/me/calendar")}
                component={Link}
                href="/me/calendar"
                prefetch={false}
                onClick={onClose}
              >
                <Group gap="sm">
                  <IconCalendar size={18} />
                  <Text size="sm">Calendar</Text>
                </Group>
              </UnstyledButton>
            </>
          ) : (
            <>
              <Text size="xs" fw={700} c="dimmed" lts="1px">
                MENU
              </Text>

              <UnstyledButton
                className={styles.menuItem}
                data-active={isActive("/team")}
                component={Link}
                href="/team"
                prefetch={false}
                onClick={onClose}
              >
                <Group gap="sm">
                  <IconLayoutDashboard size={18} />
                  <Text size="sm">Dashboard</Text>
                </Group>
              </UnstyledButton>

              <UnstyledButton
                className={styles.menuItem}
                data-active={isActive("/team/leave-requests")}
                component={Link}
                href="/team/leave-requests"
                prefetch={false}
                onClick={onClose}
              >
                <Group gap="sm">
                  <IconFileDescription size={18} />
                  <Text size="sm">Leave Requests</Text>
                </Group>
              </UnstyledButton>

              <UnstyledButton
                className={styles.menuItem}
                data-active={isActive("/team/absences")}
                component={Link}
                href="/team/absences"
                prefetch={false}
                onClick={onClose}
              >
                <Group gap="sm">
                  <IconUserOff size={18} />
                  <Text size="sm">Absences</Text>
                </Group>
              </UnstyledButton>

              <UnstyledButton
                className={styles.menuItem}
                data-active={isActive("/team/calendar")}
                component={Link}
                href="/team/calendar"
                prefetch={false}
                onClick={onClose}
              >
                <Group gap="sm">
                  <IconCalendar size={18} />
                  <Text size="sm">Calendar</Text>
                </Group>
              </UnstyledButton>

              <UnstyledButton
                className={styles.menuItem}
                data-active={isActive("/team/reports")}
                component={Link}
                href="/team/reports"
                prefetch={false}
                onClick={onClose}
              >
                <Group gap="sm">
                  <IconReportAnalytics size={18} />
                  <Text size="sm">Reports</Text>
                </Group>
              </UnstyledButton>

              <Text size="xs" fw={700} c="dimmed" lts="1px" mt="md">
                SETTINGS
              </Text>

              <UnstyledButton
                className={styles.menuItem}
                data-active={isActive("/team/departments")}
                component={Link}
                href="/team/departments"
                prefetch={false}
                onClick={onClose}
              >
                <Group gap="sm">
                  <IconUsers size={18} />
                  <Text size="sm">Departments</Text>
                </Group>
              </UnstyledButton>

              <UnstyledButton
                className={styles.menuItem}
                data-active={isActive("/team/employees")}
                component={Link}
                href="/team/employees"
                prefetch={false}
                onClick={onClose}
              >
                <Group gap="sm">
                  <IconUser size={18} />
                  <Text size="sm">Employees</Text>
                </Group>
              </UnstyledButton>

              <UnstyledButton
                className={styles.menuItem}
                data-active={isActive("/team/settings")}
                component={Link}
                href="/team/settings"
                prefetch={false}
                onClick={onClose}
              >
                <Group gap="sm">
                  <IconSettings size={18} />
                  <Text size="sm">Settings</Text>
                </Group>
              </UnstyledButton>
            </>
          )}
        </Stack>
      </div>

      <div className={styles.bottomSection}>
        <Divider color="#222" my="md" />
        <Group justify="space-between" px="md" wrap="nowrap">
          <UnstyledButton
            component={Link}
            href="/profile"
            prefetch={false}
            onClick={onClose}
            className={styles.profileLink}
          >
            <Group gap="xs" wrap="nowrap">
              <Avatar color="gray" radius="xl">
                {initials || "?"}
              </Avatar>
              <div style={{ overflow: "hidden" }}>
                <Text size="sm" fw={600} truncate>
                  {loading ? "..." : fullName || "User"}
                </Text>
                <Text size="xs" c="dimmed" truncate>
                  {employee?.email || ""}
                </Text>
              </div>
            </Group>
          </UnstyledButton>
          <Group gap={4} wrap="nowrap">
            <ActionIcon
              onClick={toggleColorScheme}
              variant="subtle"
              aria-label="Toggle color scheme"
              className={styles.themeBtn}
            >
              {mounted && colorScheme === "dark" ? (
                <IconSun size={18} />
              ) : (
                <IconMoon size={18} />
              )}
            </ActionIcon>
            <UnstyledButton className={styles.logoutBtn} onClick={handleLogout}>
              <IconLogout size={18} />
            </UnstyledButton>
          </Group>
        </Group>
      </div>
    </div>
  );
}
