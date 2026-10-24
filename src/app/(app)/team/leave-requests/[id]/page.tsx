"use client";

import {
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Flex,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconBriefcase,
  IconCalendarEvent,
  IconCancel,
  IconCheck,
  IconClock,
  IconMail,
  IconMessage,
  IconUser,
  IconUserCheck,
  IconUserPlus,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { cancelLeaveRequestAsAdmin } from "@/actions/admin/leave/cancelLeaveRequest";
import {
  approveLeaveRequestAsAdmin,
  rejectLeaveRequestAsAdmin,
} from "@/actions/admin/leave/reviewLeaveRequest";
import { useLeaveRequestDetails } from "@/hooks/useLeaveRequestDetails";
import { formatRequestDays } from "@/utils/leaveBalance";
import { LEAVE_REQUEST_TYPES, getLeaveTypeLabel } from "@/constants/leaveTypes";
import { LeaveResourcesMonthView } from "./_components/LeaveResourcesMonthView";

const typeLabels: Record<string, string> = Object.fromEntries(
  LEAVE_REQUEST_TYPES.map((t) => [t, getLeaveTypeLabel(t)]),
);

const statusLabels: Record<string, string> = {
  approved: "Approved",
  rejected: "Rejected",
  pending: "Pending",
  cancelled: "Cancelled",
};

const statusColors: Record<string, string> = {
  approved: "green",
  rejected: "red",
  pending: "yellow",
  cancelled: "gray",
};

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Group gap="sm" align="flex-start" wrap="nowrap">
      <Box mt={2} c="dimmed">
        {icon}
      </Box>
      <Box style={{ flex: 1 }}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={700} component="div">
          {label}
        </Text>
        <Text size="sm" fw={500} component="div">
          {value}
        </Text>
      </Box>
    </Group>
  );
}

export default function LeaveRequestDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { request, loading, error } = useLeaveRequestDetails(params.id);
  const [cancelling, setCancelling] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const rejectReasonRef = useRef("");

  if (loading) {
    return (
      <Flex justify="center" py="xl">
        <Loader />
      </Flex>
    );
  }

  if (error || !request) {
    return (
      <Container size="sm" py="lg">
        <Stack gap="md" align="center">
          <Text c="dimmed">{error || "Leave request not found"}</Text>
          <Button
            onClick={() => router.back()}
            leftSection={<IconArrowLeft size={16} />}
            variant="light"
          >
            Back
          </Button>
        </Stack>
      </Container>
    );
  }

  const hasEnded = dayjs(request.endDate).isBefore(dayjs(), "day");
  const canCancel = request.status === "approved" && !hasEnded;

  const handleApprove = () => {
    modals.openConfirmModal({
      title: "Approve Leave Request",
      children: (
        <Text size="sm">
          Are you sure you want to approve this holiday request&nbsp;for{" "}
          {request.employeeName || "this employee"}?
        </Text>
      ),
      labels: { confirm: "Approve", cancel: "Cancel" },
      confirmProps: { color: "green" },
      onConfirm: async () => {
        setReviewing(true);
        const result = await approveLeaveRequestAsAdmin(request._id);
        setReviewing(false);

        if (result.success) {
          notifications.show({
            title: "Approved",
            message: `Leave request for ${request.employeeName || "employee"} has been approved.`,
            color: "green",
            icon: <IconCheck size={16} />,
          });
          router.back();
        } else {
          notifications.show({
            title: "Error",
            message: result.error || "Failed to approve leave request",
            color: "red",
            icon: <IconX size={16} />,
          });
        }
      },
    });
  };

  const handleReject = () => {
    rejectReasonRef.current = "";
    modals.openConfirmModal({
      title: "Reject Leave Request",
      children: (
        <>
          <Text size="sm">
            Are you sure you want to reject this holiday request&nbsp;for{" "}
            {request.employeeName || "this employee"}? This action cannot be
            undone.
          </Text>
          <TextInput
            label="Rejection Reason"
            description="Optional reason shown to the employee"
            placeholder="Why are you rejecting this request?"
            onChange={(e) => {
              rejectReasonRef.current = e.currentTarget.value;
            }}
            mt="sm"
          />
        </>
      ),
      labels: { confirm: "Reject", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        setReviewing(true);
        const result = await rejectLeaveRequestAsAdmin(
          request._id,
          rejectReasonRef.current,
        );
        setReviewing(false);

        if (result.success) {
          notifications.show({
            title: "Rejected",
            message: `Leave request for ${request.employeeName || "employee"} has been rejected.`,
            color: "red",
            icon: <IconX size={16} />,
          });
          router.back();
        } else {
          notifications.show({
            title: "Error",
            message: result.error || "Failed to reject leave request",
            color: "red",
            icon: <IconX size={16} />,
          });
        }
      },
    });
  };

  const handleCancel = () => {
    modals.openConfirmModal({
      title: "Cancel Leave Request",
      children: (
        <Text size="sm">
          Are you sure you want to cancel this leave request? This action cannot
          be undone.
        </Text>
      ),
      labels: { confirm: "Cancel Request", cancel: "Go Back" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        setCancelling(true);
        const result = await cancelLeaveRequestAsAdmin(request._id);
        setCancelling(false);

        if (result.success) {
          notifications.show({
            title: "Cancelled",
            message: "Leave request has been cancelled.",
            color: "green",
          });
          router.refresh();
        } else {
          notifications.show({
            title: "Error",
            message: result.error || "Failed to cancel request",
            color: "red",
          });
        }
      },
    });
  };

  return (
    <Container size="sm" py="lg" px={{ base: "xs", sm: "md" }}>
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>Leave Request Details</Title>
          <Button
            onClick={() => router.back()}
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
          >
            Back
          </Button>
        </Group>
        <Paper p={{ base: "md", sm: "xl" }} radius="md" withBorder>
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start">
              <Group gap="sm">
                <Avatar
                  name={request.employeeName}
                  radius="xl"
                  size="lg"
                  color="initials"
                />
                <Box>
                  <Text size="lg" fw={600}>
                    {request.employeeName}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {request.departmentName}
                  </Text>
                </Box>
              </Group>
              <Badge
                variant="dot"
                color={statusColors[request.status]}
                size="lg"
              >
                {statusLabels[request.status] ?? request.status}
              </Badge>
            </Group>
            <Divider />
            <Stack gap="md">
              <InfoRow
                icon={<IconMail size={18} />}
                label="Email"
                value={request.employeeEmail}
              />
              <InfoRow
                icon={<IconBriefcase size={18} />}
                label="Leave Type"
                value={
                  <Badge variant="light" color="blue" size="sm">
                    {typeLabels[request.type] ?? request.type}
                  </Badge>
                }
              />
              <InfoRow
                icon={<IconCalendarEvent size={18} />}
                label="Leave Period"
                value={`${dayjs(request.startDate).format("D MMM YYYY")} → ${dayjs(
                  request.endDate,
                ).format("D MMM YYYY")}`}
              />
              <InfoRow
                icon={<IconCalendarEvent size={18} />}
                label="Working Days"
                value={formatRequestDays(
                  request,
                  request.daysRequested === 1 ? " day" : " days",
                )}
              />
              <InfoRow
                icon={<IconUserCheck size={18} />}
                label="Manager"
                value={request.managerName || "No manager assigned"}
              />
              <InfoRow
                icon={<IconMessage size={18} />}
                label="Employee Comment"
                value={request.comment || "No comment provided"}
              />

              {/* === REJECTION REASON === */}
              {request.status === "rejected" && request.rejectionReason && (
                <InfoRow
                  icon={<IconCancel size={18} />}
                  label="Rejection Reason"
                  value={
                    <Text c="red" fw={500}>
                      {request.rejectionReason}
                    </Text>
                  }
                />
              )}

              <Divider my="xs" />

              {/* === AUDIT: CREATED BY === */}
              <InfoRow
                icon={<IconUserPlus size={18} />}
                label="Created By"
                value={
                  <Badge variant="light" color="blue" size="sm">
                    Self — {request.employeeName}
                  </Badge>
                }
              />

              {/* === AUDIT: APPROVED BY === */}
              {(request.status === "approved" ||
                request.status === "rejected") && (
                  <InfoRow
                    icon={<IconCheck size={18} />}
                    label={
                      request.status === "approved"
                        ? "Approved By"
                        : "Reviewed By"
                    }
                    value={
                      <Group gap="xs" wrap="nowrap">
                        <Text fw={500}>
                          {request.reviewedByName || "(Account has been deleted)"}
                        </Text>
                        {request.reviewedAt && (
                          <Badge variant="light" color="gray" size="xs">
                            <Group gap={4} wrap="nowrap">
                              <IconClock size={12} />
                              {dayjs(request.reviewedAt).format(
                                "D MMM YYYY, HH:mm",
                              )}
                            </Group>
                          </Badge>
                        )}
                      </Group>
                    }
                  />
                )}

              {/* === AUDIT: CANCELLED === */}
              {request.status === "cancelled" && request.cancelledAt && (
                <InfoRow
                  icon={<IconCancel size={18} />}
                  label="Cancelled On"
                  value={dayjs(request.cancelledAt).format("D MMM YYYY, HH:mm")}
                />
              )}

              <InfoRow
                icon={<IconUser size={18} />}
                label="Submitted On"
                value={dayjs(request.createdAt).format("D MMM YYYY, HH:mm")}
              />
            </Stack>

            {/* === APPROVE / REJECT === */}
            {request.status === "pending" && (
              <>
                <Divider my="xs" />
                <Flex gap="sm" justify="flex-end" wrap="wrap">
                  <Button
                    color="green"
                    leftSection={<IconCheck size={16} />}
                    onClick={handleApprove}
                    loading={reviewing}
                  >
                    Accept
                  </Button>
                  <Button
                    color="red"
                    variant="light"
                    leftSection={<IconX size={16} />}
                    onClick={handleReject}
                    loading={reviewing}
                  >
                    Reject
                  </Button>
                </Flex>
              </>
            )}

            {/* === CANCEL BUTTON === */}
            {canCancel && (
              <>
                <Divider my="xs" />
                <Flex justify="flex-end">
                  <Button
                    color="red"
                    variant="light"
                    leftSection={<IconCancel size={16} />}
                    onClick={handleCancel}
                    loading={cancelling}
                  >
                    Cancel Request
                  </Button>
                </Flex>
              </>
            )}
          </Stack>
        </Paper>

        <LeaveResourcesMonthView request={request} />
      </Stack>
    </Container>
  );
}
