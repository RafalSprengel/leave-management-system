"use client";

import { Box, Button, Container, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import {
  IconBellRinging,
  IconCalendarEvent,
  IconCalendarStats,
  IconChartInfographic,
  IconLayoutDashboard,
  IconReportAnalytics,
  IconShieldLock,
  IconUserCircle,
  IconUsersGroup,
} from "@tabler/icons-react";
import Link from "next/link";
import Footer from "./_components/Footer/Footer";
import FeatureCard from "./_components/FeatureCard/FeatureCard";
import Header from "./_components/Header/Header";
import styles from "./page.module.css";

const features = [
  {
    icon: IconCalendarEvent,
    title: "Online Time-Off Requests",
    description:
      "Employees submit holiday and absence requests in a couple of clicks, from any device — no spreadsheets or paper forms.",
  },
  {
    icon: IconLayoutDashboard,
    title: "Dedicated Manager & Employee Panels",
    description:
      "Two separate panels, one per role — managers review, approve, and reject requests from a team overview, while employees manage their own requests and keep an eye on their balance.",
  },
  {
    icon: IconChartInfographic,
    title: "Automated Accrual & Balance Tracking",
    description:
      "Leave balances update in real time based on tenure, employment type, and your carry-over rules — no manual maths.",
  },
  {
    icon: IconUsersGroup,
    title: "Team Calendar & Availability View",
    description:
      "See who's off across every department at a glance, spot overlaps early, and keep coverage under control.",
  },
  {
    icon: IconBellRinging,
    title: "Automated Notifications",
    description:
      "Instant email and chat alerts for submissions, approvals, rejections, and upcoming absences — nobody's left guessing.",
  },
  {
    icon: IconReportAnalytics,
    title: "Reporting & Analytics",
    description:
      "Understand absence trends and holiday usage across your teams, so HR and managers can spot patterns early and plan ahead — no spreadsheets required.",
  },
  {
    icon: IconUserCircle,
    title: "Employee Self-Service Portal",
    description:
      "A personal dashboard where staff can check remaining leave and browse their request history anytime.",
  },
  {
    icon: IconShieldLock,
    title: "Secure, Isolated Workspace",
    description:
      "Every company runs in its own fully isolated workspace, with permissions that control exactly who can view and manage its employee data.",
  },
  {
    icon: IconCalendarStats,
    title: "Public Holidays & Custom Closures",
    description:
      "Import official bank holidays in a single click and add your own company closure dates on top — no manual calendar upkeep.",
  },
];

export default function Home() {
  return (
    <>
      <Header />

      <Box component="section" className={styles.hero}>
        <Container size="md" className={styles.heroInner}>
          <Stack gap="lg" align="center">
            <Title order={1} ta="center" className={styles.heroTitle}>
              Leave management that runs itself
            </Title>
            <Text
              size="xl"
              ta="center"
              maw={620}
              c="light-dark(var(--mantine-color-gray-6), var(--mantine-color-gray-4))"
            >
              Off-Work gives employees an easy way to request leave, track
              their remaining allowance, and check team absences. Managers get
              one central place to review requests, manage leave policies, and
              plan team availability.
            </Text>
            <Group gap="md" mt="md">
              <Button
                component={Link}
                href="/sign-up"
                size="lg"
                radius="md"
                className={styles.primaryCta}
              >
                Try For Free
              </Button>
              <Button
                component={Link}
                href="/sign-in"
                size="lg"
                radius="md"
                variant="default"
              >
                Login
              </Button>
            </Group>
          </Stack>
        </Container>
      </Box>

      <Box component="section" className={styles.features}>
        <Container size="lg">
          <Stack gap={4} align="center" mb="xl">
            <Text
              fw={700}
              size="sm"
              tt="uppercase"
              style={{ letterSpacing: 1 }}
              c="#10b981"
            >
              Why Off-Work
            </Text>
            <Title order={2} ta="center" fz={{ base: "1.75rem", sm: "2.25rem" }}>
              All-in-one Leave &amp; Absence Management for your team
            </Title>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {features.map((feature) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      <Box component="section" className={styles.bottomCta}>
        <Container size="sm">
          <Stack align="center" gap="md">
            <Title order={2} ta="center" fz={{ base: "1.5rem", sm: "2rem" }}>
              Ready to stop chasing time-off requests over email?
            </Title>
            <Button
              component={Link}
              href="/sign-up"
              size="lg"
              radius="md"
              className={styles.primaryCta}
            >
              Try Off-Work For Free
            </Button>
          </Stack>
        </Container>
      </Box>

      <Footer />
    </>
  );
}
