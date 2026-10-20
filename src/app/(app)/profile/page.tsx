"use client";

import {
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconUser } from "@tabler/icons-react";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import ChangePasswordForm from "./_components/ChangePasswordForm/ChangePasswordForm";

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text size="sm" fw={500}>
        {value}
      </Text>
    </Stack>
  );
}

export default function ProfilePage() {
  const { employee, loading } = useCurrentEmployee();

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    );
  }

  if (!employee) {
    return (
      <Text size="sm" c="dimmed">
        Failed to load your profile.
      </Text>
    );
  }

  return (
    <Stack gap="md">
      <Title order={2}>Profile</Title>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Group gap="xs">
            <IconUser size={18} />
            <Text fw={600} size="lg">
              {employee.firstName} {employee.lastName}
            </Text>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <InfoItem label="First name" value={employee.firstName} />
            <InfoItem label="Last name" value={employee.lastName} />
            <InfoItem label="Email" value={employee.email} />
          </SimpleGrid>
        </Stack>
      </Card>

      <ChangePasswordForm />
    </Stack>
  );
}
