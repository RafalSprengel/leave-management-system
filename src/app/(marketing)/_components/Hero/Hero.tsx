"use client";

import { Box, Button, Container, Group, Stack, Text } from "@mantine/core";
import {
  IconArrowRight,
  IconCalendar,
  IconFileDescription,
  IconLayoutDashboard,
  IconReportAnalytics,
} from "@tabler/icons-react";
import { Instrument_Serif } from "next/font/google";
import Link from "next/link";
import AnimatedBackground from "../AnimatedBackground/AnimatedBackground";
import styles from "./Hero.module.css";

const serif = Instrument_Serif({
  weight: "400",
  style: "italic",
  subsets: ["latin"],
  variable: "--font-serif",
});

const navItems = [
  { label: "Dashboard", icon: IconLayoutDashboard, active: true },
  { label: "Leave requests", icon: IconFileDescription },
  { label: "Calendar", icon: IconCalendar },
  { label: "Reports", icon: IconReportAnalytics },
];

export default function Hero() {
  return (
    <Box component="section" className={`${styles.hero} ${serif.variable}`}>
      <AnimatedBackground />

      <Container size="md" className={styles.heroInner}>
        <Stack gap="lg" align="center">
          <h1 className={styles.title}>
            Leave management{" "}
            <span className={styles.accent}>that runs itself</span>
          </h1>
          <Text
            size="lg"
            ta="center"
            maw={620}
            c="light-dark(var(--mantine-color-gray-7), var(--mantine-color-gray-4))"
          >
            Off-Work gives employees an easy way to request leave, track their
            remaining allowance, and check team absences. Managers get one
            central place to review requests, manage leave policies, and plan
            team availability.
          </Text>
          <Group gap="md" mt="sm" justify="center">
            <Button
              component={Link}
              href="/sign-up"
              size="lg"
              radius="md"
              rightSection={<IconArrowRight size={18} />}
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

      <div className={styles.previewWrap} aria-hidden="true">
        <div className={styles.preview}>
          <div className={styles.sidebar}>
            {navItems.map((item) => (
              <div
                key={item.label}
                className={`${styles.navItem} ${item.active ? styles.navItemActive : ""}`}
              >
                <item.icon size={14} />
                {item.label}
              </div>
            ))}
          </div>

          <div className={styles.content}>
            <div className={styles.statRow}>
              <div className={styles.card}>
                <div className={styles.cardLabel}>Annual leave</div>
                <div className={styles.cardValue}>18 days left</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardLabel}>Pending</div>
                <div className={styles.cardValue}>3</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardLabel}>On leave today</div>
                <div className={styles.cardValue}>4</div>
              </div>
            </div>

            <div className={styles.chartRow}>
              <div className={styles.card}>
                <div className={styles.cardLabel}>Leave per month</div>
                <svg
                  viewBox="0 0 300 120"
                  width="100%"
                  height="120"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#10b981"
                        stopOpacity="0.35"
                      />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 95 L40 85 L80 40 L120 50 L160 45 L200 28 L240 38 L300 15 L300 120 L0 120 Z"
                    fill="url(#heroArea)"
                  />
                  <path
                    d="M0 95 L40 85 L80 40 L120 50 L160 45 L200 28 L240 38 L300 15"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div className={styles.card}>
                <div className={styles.cardLabel}>Employees</div>
                <div className={styles.donut}>
                  <div className={styles.donutInner}>120</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Box>
  );
}
