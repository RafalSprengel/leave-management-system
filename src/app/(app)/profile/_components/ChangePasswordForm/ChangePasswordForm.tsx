"use client";

import { Button, Card, PasswordInput, Stack, Text, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function ChangePasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validate: {
      currentPassword: (value) =>
        value.length > 0 ? null : "Current password is required",
      newPassword: (value) =>
        value.length >= 8 ? null : "Password must be at least 8 characters",
      confirmPassword: (value, values) =>
        value === values.newPassword ? null : "Passwords do not match",
    },
  });

  async function handleSubmit() {
    const { hasErrors } = form.validate();
    if (hasErrors) return;

    setIsSubmitting(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: form.values.currentPassword,
        newPassword: form.values.newPassword,
        revokeOtherSessions: true,
      });

      if (error) {
        notifications.show({
          title: "Password not changed",
          message:
            error.message ||
            "Could not change your password. Please try again.",
          color: "red",
          icon: <IconX size={16} />,
        });
        return;
      }

      form.reset();
      notifications.show({
        title: "Password updated",
        message: "Your password has been changed.",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      notifications.show({
        title: "Error",
        message:
          err instanceof Error ? err.message : "An unexpected error occurred",
        color: "red",
        icon: <IconX size={16} />,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="md">
        <Title order={3} size="h4">
          Change password
        </Title>
        <Text size="sm" c="dimmed">
          Other devices where you are signed in will be signed out after the
          password is changed.
        </Text>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <Stack gap="md">
            <PasswordInput
              label="Current password"
              placeholder="Enter your current password"
              {...form.getInputProps("currentPassword")}
            />
            <PasswordInput
              label="New password"
              placeholder="At least 8 characters"
              {...form.getInputProps("newPassword")}
            />
            <PasswordInput
              label="Confirm new password"
              placeholder="Repeat your new password"
              {...form.getInputProps("confirmPassword")}
            />

            <Button type="submit" loading={isSubmitting} w="fit-content">
              Change password
            </Button>
          </Stack>
        </form>
      </Stack>
    </Card>
  );
}
