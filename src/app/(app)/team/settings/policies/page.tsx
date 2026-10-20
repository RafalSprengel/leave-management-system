"use client";

import {
  Alert,
  Button,
  Group,
  Loader,
  NumberInput,
  Paper,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconClock } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { getOrgSettings } from "@/actions/admin/settings/getOrgSettings";
import {
  DEFAULT_LEAVE_ALLOWANCE_DAYS,
  LEAVE_ALLOWANCE_TYPES,
  type LeaveAllowanceType,
} from "@/constants/leaveAllowanceTypes";
import type { IOrgSettings } from "@/types/orgSettings";
import DefaultAllowancesTable, {
  type DefaultAllowanceRow,
} from "./_components/DefaultAllowancesTable";

type PolicyOptions = {
  allowCarryOver: boolean;
  maxCarryOverDays: number;
  autoApproveSickLeave: boolean;
};

const DEFAULT_POLICY_OPTIONS: PolicyOptions = {
  allowCarryOver: true,
  maxCarryOverDays: 5,
  autoApproveSickLeave: false,
};

const ALLOWANCE_LABELS: Record<LeaveAllowanceType, string> = {
  annual: "Annual leave",
  unpaid: "Unpaid leave",
  sick: "Sick leave",
  bereavement: "Bereavement",
};

const ALLOWANCE_DESCRIPTIONS: Record<LeaveAllowanceType, string> = {
  annual: "Base allowance given to full-time employees annually",
  unpaid: "Default days pre-filled when adding a new employee",
  sick: "Default days pre-filled when adding a new employee",
  bereavement: "Default days pre-filled when adding a new employee",
};

/** Reads stored allowances, falling back to the effective defaults. */
function toAllowanceRows(settings: IOrgSettings): DefaultAllowanceRow[] {
  const stored = settings.defaultAllowances ?? {};
  return LEAVE_ALLOWANCE_TYPES.map((type) => ({
    type,
    label: ALLOWANCE_LABELS[type],
    description: ALLOWANCE_DESCRIPTIONS[type],
    days:
      stored[type] ??
      (type === "annual"
        ? settings.defaultAnnualLeaveDays
        : DEFAULT_LEAVE_ALLOWANCE_DAYS[type]),
  }));
}

export default function LeavePoliciesPage() {
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [allowanceRows, setAllowanceRows] = useState<DefaultAllowanceRow[]>([]);
  const [policyOptions, setPolicyOptions] = useState<PolicyOptions>(
    DEFAULT_POLICY_OPTIONS,
  );

  useEffect(() => {
    (async () => {
      const res = await getOrgSettings();
      if (res.success) {
        setAllowanceRows(toAllowanceRows(res.data));
        setPolicyOptions({
          allowCarryOver: res.data.allowCarryOver,
          maxCarryOverDays: res.data.maxCarryOverDays,
          autoApproveSickLeave: res.data.autoApproveSickLeave,
        });
      } else {
        notifications.show({
          color: "red",
          title: "Failed to load settings",
          message: res.error,
        });
      }
      setLoadingSettings(false);
    })();
  }, []);

  if (loadingSettings) {
    return (
      <Group justify="center" py="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  return (
    <Stack gap="lg">
      <DefaultAllowancesTable rows={allowanceRows} />

      <Paper withBorder radius="md" p="md">
        <Stack gap="md">
          <div>
            <Text fw={600} size="sm">
              Leave policy options
            </Text>
            <Text size="xs" c="dimmed">
              Controls how unused leave is carried over and how sick leave
              requests are approved.
            </Text>
          </div>

          <Alert
            icon={<IconClock size={16} />}
            color="gray"
            variant="light"
            radius="sm"
          >
            Features available soon
          </Alert>

          <Stack gap="md" style={{ opacity: 0.5 }}>
            <Switch
              disabled
              readOnly
              label="Allow Carrying Over Unused Days"
              description="Employees can transfer unused leave to the next year"
              checked={policyOptions.allowCarryOver}
            />

            {policyOptions.allowCarryOver && (
              <NumberInput
                disabled
                readOnly
                label="Maximum Carry-Over Days"
                description="Maximum number of days that can be carried over to the next year"
                min={0}
                max={365}
                pl="md"
                value={policyOptions.maxCarryOverDays}
                styles={{
                  root: { borderLeft: "2px solid var(--mantine-color-blue-4)" },
                }}
              />
            )}

            <Switch
              disabled
              readOnly
              label="Auto-Approve Sick Leave Requests"
              description="Requests marked as sick leave will bypass manager approval"
              checked={policyOptions.autoApproveSickLeave}
            />

            <Group justify="flex-end" mt="xs">
              <Button disabled>Save Changes</Button>
            </Group>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
