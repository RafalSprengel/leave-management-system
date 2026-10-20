// src/app/(app)/components/AppShellClient/AppShellClient.tsx
"use client";

import {
  ActionIcon,
  AppShell,
  Avatar,
  Box,
  Burger,
  Drawer,
  Group,
  Menu,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconLogout,
  IconSettings,
  IconUser,
} from "@tabler/icons-react";
import SidebarContent from "../SidebarContent/SidebarContent";
import styles from "./AppShellClient.module.css";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { NotificationsDropdown } from "../NotificationsDropdown/NotificationsDropdown";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";

export default function LayoutClient({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "Manager" | "Employee" | null;
}) {
  const router = useRouter();
  const [opened, { toggle, close }] = useDisclosure();

  const { employee, loading } = useCurrentEmployee();
  const fullName = `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim();
  const initials = `${employee?.firstName?.[0] || ""}${employee?.lastName?.[0] || ""}`.toUpperCase();

  const handleLogout = async () => {
    close();
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/sign-in";
        },
      },
    });
  };

  return (
    <AppShell
      layout="alt"
      header={{ height: 60 }}
      navbar={{
        width: 230,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header
        className={styles.header}
        bg="light-dark(var(--mantine-color-white), #0d0d0d)"
        style={{ zIndex: 100 }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              className={styles.burger}
              aria-label="Toggle navigation"
            />
            <Box hiddenFrom="sm" className={styles.logo}>
              OFF-WORK
            </Box>
          </Group>

          <Group gap="sm">
            {/* Notifications Dropdown */}
            <NotificationsDropdown role={role} />

            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <UnstyledButton>
                  <Group gap={8}>
                    <Avatar color="blue" radius="xl" size="sm">
                      {initials || "?"}
                    </Avatar>
                    <Box visibleFrom="sm">
                      <Text size="sm" fw={600} lh={1.2}>
                        {loading ? "..." : fullName || "User"}
                      </Text>
                      <Text size="xs" c="dimmed" lh={1}>
                        {role}
                      </Text>
                    </Box>
                    <IconChevronDown size={14} style={{ opacity: 0.5 }} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Account</Menu.Label>
                <Menu.Item
                  leftSection={<IconUser size={14} />}
                  onClick={() => router.push("/profile")}
                >
                  Profile
                </Menu.Item>
                {role === "Manager" && (
                  <Menu.Item
                    leftSection={<IconSettings size={14} />}
                    onClick={() => router.push("/team/settings/general")}
                  >
                    Settings
                  </Menu.Item>
                )}
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={14} />}
                  onClick={handleLogout}
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar className={styles.sidebar} visibleFrom="sm">
        <SidebarContent onClose={close} isMobile={false} role={role} />
      </AppShell.Navbar>

      <Drawer
        opened={opened}
        onClose={close}
        size={280}
        withCloseButton={false}
        hiddenFrom="sm"
        transitionProps={{ duration: 200, transition: "slide-right" }}
        styles={{
          body: { padding: 0, height: "100%" },
          content: { backgroundColor: "#0d0d0d", color: "#fff" },
          overlay: { backdropFilter: "blur(4px)" },
        }}
      >
        <SidebarContent onClose={close} isMobile={true} role={role} />
      </Drawer>

      <AppShell.Main className={styles.main}>{children}</AppShell.Main>
    </AppShell>
  );
}