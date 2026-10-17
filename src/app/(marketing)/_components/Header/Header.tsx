"use client";

import { Box, Button, Group, Text } from "@mantine/core";
import { IconBriefcase } from "@tabler/icons-react";
import Link from "next/link";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <Box component="header" className={styles.header}>
      <Box className={styles.inner}>
        <Group gap={10} align="center">
          <Box className={styles.logoMark}>
            <IconBriefcase size={18} stroke={2.2} />
          </Box>
          <Text className={styles.logoText}>
            OFF<span className={styles.logoDash}>-</span>WORK
          </Text>
        </Group>

        <Group gap="sm">
          <Button
            component={Link}
            href="/sign-in"
            variant="default"
            color="gray"
            radius="md"
          >
            Login
          </Button>
          <Button
            component={Link}
            href="/sign-up"
            variant="filled"
            radius="md"
            className={styles.ctaButton}
          >
            Try For Free
          </Button>
        </Group>
      </Box>
    </Box>
  );
}
