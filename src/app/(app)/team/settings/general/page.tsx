"use client";

import {
  Alert,
  Button,
  Divider,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconBuilding, IconCalendar } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useEffect, useState, useTransition } from "react";

import { getOrgSettings } from "@/actions/admin/settings/getOrgSettings";
import { updateOrgSettings } from "@/actions/admin/settings/updateOrgSettings";
import type { IOrgSettings } from "@/types/orgSettings";

const MONTH_OPTIONS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function getDayOptions(month: string | number) {
  const m = String(month);
  const daysInMonth = dayjs(`2000-${m.padStart(2, "0")}-01`).daysInMonth();
  return Array.from({ length: daysInMonth }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));
}

type FormValues = {
  companyName: string;
  address: string;
  website: string;
  startMonth: string;
  startDay: string;
  endMonth: string;
  endDay: string;
};

function settingsToForm(s: IOrgSettings): FormValues {
  const [startM, startD] = s.holidayYearStart.split("-");
  const [endM, endD] = s.holidayYearEnd.split("-");
  return {
    companyName: s.companyName,
    address: s.address,
    website: s.website,
    startMonth: String(Number(startM)),
    startDay: String(Number(startD)),
    endMonth: String(Number(endM)),
    endDay: String(Number(endD)),
  };
}

export default function GeneralSettingsPage() {
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    initialValues: {
      companyName: "",
      address: "",
      website: "",
      startMonth: "1",
      startDay: "1",
      endMonth: "12",
      endDay: "31",
    },
    validate: {
      companyName: (v) => (!v.trim() ? "Company name is required" : null),
      startMonth: (v) => (!v ? "Required" : null),
      startDay: (v) => (!v ? "Required" : null),
      endMonth: (v) => (!v ? "Required" : null),
      endDay: (v) => (!v ? "Required" : null),
    },
  });

  useEffect(() => {
    (async () => {
      const res = await getOrgSettings();
      if (res.success) {
        form.setValues(settingsToForm(res.data));
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

  const startMonth = form.values.startMonth;
  const endMonth = form.values.endMonth;

  const startLabel = `${MONTH_OPTIONS[Number(startMonth) - 1]?.label ?? ""} ${form.values.startDay}`;
  const endLabel = `${MONTH_OPTIONS[Number(endMonth) - 1]?.label ?? ""} ${form.values.endDay}`;

  const handleSubmit = (values: FormValues) => {
    startTransition(async () => {
      const res = await updateOrgSettings({
        companyName: values.companyName,
        address: values.address,
        website: values.website,
        holidayYearStart: `${String(Number(values.startMonth)).padStart(2, "0")}-${String(Number(values.startDay)).padStart(2, "0")}`,
        holidayYearEnd: `${String(Number(values.endMonth)).padStart(2, "0")}-${String(Number(values.endDay)).padStart(2, "0")}`,
      });

      if (res.success) {
        notifications.show({
          color: "green",
          title: "Settings saved",
          message: "General settings updated successfully.",
        });
      } else {
        notifications.show({
          color: "red",
          title: "Save failed",
          message: res.error,
        });
      }
    });
  };

  if (loadingSettings) {
    return (
      <Group justify="center" py="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  return (
    <Stack gap="lg" style={{ maxWidth: 600 }}>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="lg">
          <div>
            <Group gap="xs" mb={4}>
              <IconBuilding size={16} />
              <Text fw={600} size="sm">
                Company Information
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mb="md">
              Basic details about your organization visible throughout the
              system.
            </Text>
            <Stack gap="sm">
              <TextInput
                label="Company Name"
                placeholder="e.g. Acme Ltd"
                {...form.getInputProps("companyName")}
              />
              <TextInput
                label="Address"
                placeholder="e.g. 123 Main St, London"
                {...form.getInputProps("address")}
              />
              <TextInput
                label="Website"
                placeholder="e.g. https://acme.com"
                {...form.getInputProps("website")}
              />
            </Stack>
          </div>

          <Divider />

          <div>
            <Group gap="xs" mb={4}>
              <IconCalendar size={16} />
              <Text fw={600} size="sm">
                Holiday Year Period
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mb="md">
              Define the start and end of the annual leave year for your
              organization. This affects how holiday allowances are calculated
              and carried over.
            </Text>

            <Alert
              icon={<IconCalendar size={14} />}
              color="blue"
              variant="light"
              mb="md"
              radius="sm"
            >
              Current period:{" "}
              <Text component="span" fw={600} size="sm">
                {startLabel} – {endLabel}
              </Text>
            </Alert>

            <Stack gap="sm">
              <div>
                <Text size="xs" fw={500} mb={6} c="dimmed">
                  START OF HOLIDAY YEAR
                </Text>
                <Group gap="sm">
                  <Select
                    label="Month"
                    data={MONTH_OPTIONS}
                    style={{ flex: 2 }}
                    {...form.getInputProps("startMonth")}
                    onChange={(v) => {
                      form.setFieldValue("startMonth", v ?? "1");
                      form.setFieldValue("startDay", "1");
                    }}
                  />
                  <Select
                    label="Day"
                    data={getDayOptions(startMonth)}
                    style={{ flex: 1 }}
                    {...form.getInputProps("startDay")}
                  />
                </Group>
              </div>

              <div>
                <Text size="xs" fw={500} mb={6} c="dimmed">
                  END OF HOLIDAY YEAR
                </Text>
                <Group gap="sm">
                  <Select
                    label="Month"
                    data={MONTH_OPTIONS}
                    style={{ flex: 2 }}
                    {...form.getInputProps("endMonth")}
                    onChange={(v) => {
                      form.setFieldValue("endMonth", v ?? "12");
                      const days = getDayOptions(v ?? "12");
                      form.setFieldValue("endDay", days[days.length - 1].value);
                    }}
                  />
                  <Select
                    label="Day"
                    data={getDayOptions(endMonth)}
                    style={{ flex: 1 }}
                    {...form.getInputProps("endDay")}
                  />
                </Group>
              </div>
            </Stack>
          </div>

          <Group justify="flex-end">
            <Button type="submit" loading={isPending}>
              Save Changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
