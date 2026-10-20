"use client";

import {
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCoins } from "@tabler/icons-react";
import { useState, useTransition } from "react";

import { updateOrgSettings } from "@/actions/admin/settings/updateOrgSettings";
import type { LeaveAllowanceType } from "@/constants/leaveAllowanceTypes";

export interface DefaultAllowanceRow {
  type: LeaveAllowanceType;
  label: string;
  description: string;
  days: number;
}

interface DefaultAllowancesTableProps {
  rows: DefaultAllowanceRow[];
}

export default function DefaultAllowancesTable({
  rows,
}: DefaultAllowancesTableProps) {
  const [values, setValues] = useState<DefaultAllowanceRow[]>(rows);
  const [active, setActive] = useState<DefaultAllowanceRow | null>(null);
  const [inputValue, setInputValue] = useState<number | string>(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openModal = (row: DefaultAllowanceRow) => {
    setActive(row);
    setInputValue(row.days ?? 0);
    setError(null);
  };

  const closeModal = () => {
    setActive(null);
    setError(null);
  };

  const handleSave = () => {
    if (!active) return;

    if (inputValue === "" || inputValue === null) {
      setError("Please enter a number of days.");
      return;
    }

    const days =
      typeof inputValue === "number" ? inputValue : Number(inputValue);

    if (!Number.isFinite(days) || days < 0 || days > 365) {
      setError("Must be between 0 and 365");
      return;
    }

    const row = active;

    startTransition(async () => {
      const nextValues = values.map((r) =>
        r.type === row.type ? { ...r, days } : r,
      );
      const defaultAllowances = Object.fromEntries(
        nextValues.map((r) => [r.type, r.days]),
      );
      const annualDays = nextValues.find((r) => r.type === "annual")?.days ?? 0;

      const res = await updateOrgSettings({
        defaultAllowances,
        defaultAnnualLeaveDays: annualDays,
      });

      if (!res.success) {
        notifications.show({
          color: "red",
          title: "Failed to save",
          message: res.error,
        });
        return;
      }

      setValues(nextValues);
      notifications.show({
        color: "green",
        title: "Saved",
        message: `${row.label} set to ${days} day(s).`,
      });
      setActive(null);
    });
  };

  return (
    <>
      <Stack gap="md">
        <div>
          <Group gap="xs" mb={4}>
            <IconCoins size={16} />
            <Text fw={600} size="sm">
              Default Allowances
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            Default days per leave type, pre-filled when adding a new employee.
          </Text>
        </div>

        <Paper withBorder radius="md">
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Allowance Type</Table.Th>
                <Table.Th>Current value</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {values.map((row) => (
                <Table.Tr key={row.type}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {row.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {row.description}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {row.days} {row.days === 1 ? "day" : "days"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group justify="flex-end">
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => openModal(row)}
                      >
                        Set
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>

      <Modal
        opened={active !== null}
        onClose={closeModal}
        title={active ? `Set ${active.label}` : ""}
        centered
      >
        <Stack gap="md">
          <NumberInput
            label="Number of days"
            description={active?.description}
            min={0}
            max={365}
            decimalScale={2}
            allowNegative={false}
            value={inputValue}
            error={error}
            onChange={(value) => {
              setInputValue(value);
              setError(null);
            }}
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={isPending}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
