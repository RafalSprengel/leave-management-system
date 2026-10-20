// src/app/(app)/components/NotificationsDropdown/NotificationsDropdown.tsx
"use client";

import {
    ActionIcon,
    Indicator,
    Popover,
    Stack,
    Text,
    Box,
    ScrollArea,
    Group,
    Avatar,
    Badge,
    Button,
    Divider,
    Loader,
    Flex,
    Drawer,
    useMantineTheme,
    Portal,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconBell } from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { getTeamLeaveRequests } from "@/actions/manager/leave/getTeamLeaveRequests";
import {
    getLeaveTypeLabel,
    type LeaveRequestType,
} from "@/constants/leaveTypes";

dayjs.extend(relativeTime);

interface SafeRequestItem {
    _id: string;
    employee?: string;
    employeeName?: string;
    startDate: string;
    endDate: string;
    daysRequested: number;
    status: "pending" | "approved" | "rejected" | "cancelled";
    type: LeaveRequestType;
    createdAt: string;
}

export function NotificationsDropdown({ role }: { role: "Manager" | "Employee" | null }) {
    const router = useRouter();
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
    const targetRef = useRef<HTMLDivElement>(null);

    const [opened, setOpened] = useState(false);
    const [pendingRequests, setPendingRequests] = useState<SafeRequestItem[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchPendingRequests = async () => {
        setLoading(true);
        try {
            const res = await getTeamLeaveRequests();
            if (res.success && res.data) {
                const pending = res.data.filter(
                    (req) => req.status === "pending",
                );
                setPendingRequests(pending);
            }
        } catch (error) {
            console.error("Error fetching pending requests:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (role === "Manager") {
            fetchPendingRequests();
        }
    }, [role]);

    useEffect(() => {
        if (opened && role === "Manager") {
            fetchPendingRequests();
        }
    }, [opened, role]);

    const handleRequestClick = (id: string) => {
        setOpened(false);
        router.push(`/team/leave-requests/${id}`);
    };

    const handleMarkAllRead = () => {
        setOpened(false);
    };

    const formatDateRange = (startDate: string, endDate: string) => {
        const start = dayjs(startDate);
        const end = dayjs(endDate);
        if (start.isSame(end, "day")) {
            return `${start.format("YYYY-MM-DD")}`;
        }
        return `${start.format("YYYY-MM-DD")} - ${end.format("YYYY-MM-DD")}`;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return (
                    <Badge size="xs" color="yellow" variant="light">
                        Pending
                    </Badge>
                );
            case "approved":
                return (
                    <Badge size="xs" color="green" variant="light">
                        Approved
                    </Badge>
                );
            case "rejected":
                return (
                    <Badge size="xs" color="red" variant="light">
                        Rejected
                    </Badge>
                );
            default:
                return <Badge size="xs">{status}</Badge>;
        }
    };

    const renderContent = () => (
        <>
            {/* Header */}
            <Group justify="space-between" p="sm" pb="xs">
                <Text fw={600} size="sm">
                    Notifications
                </Text>
                <Button
                    variant="subtle"
                    size="xs"
                    color="blue"
                    onClick={handleMarkAllRead}
                >
                    Mark all as read
                </Button>
            </Group>

            <Divider />

            {/* Content */}
            {loading ? (
                <Flex justify="center" align="center" py="xl">
                    <Loader size="sm" />
                </Flex>
            ) : pendingRequests.length === 0 ? (
                <Stack align="center" py="xl" gap="xs">
                    <Text size="sm" c="dimmed">
                        No new notifications
                    </Text>
                    <Text size="xs" c="dimmed">
                        All requests have been processed
                    </Text>
                </Stack>
            ) : (
                <ScrollArea.Autosize mah={isMobile ? "calc(100vh - 120px)" : 400} type="scroll">
                    <Stack gap={0}>
                        {pendingRequests.map((req) => {
                            const fullName = (req.employeeName || "").trim();

                            return (
                                <Box
                                    key={req._id}
                                    p="sm"
                                    style={{
                                        cursor: "pointer",
                                        borderBottom: "1px solid var(--mantine-color-gray-2)",
                                        transition: "background-color 0.15s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor =
                                            "var(--mantine-color-gray-0)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "transparent";
                                    }}
                                    onClick={() => handleRequestClick(req._id)}
                                >
                                    <Group gap="sm" align="flex-start" wrap="nowrap">
                                        <Avatar
                                            name={fullName || "?"}
                                            radius="xl"
                                            size="md"
                                            color="initials"
                                        />
                                        <Box style={{ flex: 1, minWidth: 0 }}>
                                            <Text size="sm" fw={500} lineClamp={2}>
                                                {fullName ? (
                                                    <>
                                                        <Text component="span" fw={700}>
                                                            {fullName}
                                                        </Text>
                                                        {" submitted a request for "}
                                                        <Text component="span" c="blue">
                                                            {getLeaveTypeLabel(req.type)}
                                                        </Text>
                                                    </>
                                                ) : (
                                                    <Text component="span" c="dimmed">
                                                        Unknown employee submitted a request
                                                    </Text>
                                                )}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                {formatDateRange(req.startDate, req.endDate)}
                                                {" • "}
                                                {req.daysRequested}{" "}
                                                {req.daysRequested === 1 ? "day" : "days"}
                                            </Text>
                                            <Group gap="xs" mt={4}>
                                                {getStatusBadge(req.status)}
                                                <Text size="xs" c="dimmed">
                                                    {dayjs(req.createdAt).fromNow()}
                                                </Text>
                                            </Group>
                                        </Box>
                                    </Group>
                                </Box>
                            );
                        })}
                    </Stack>
                </ScrollArea.Autosize>
            )}

            {/* Footer */}
            {pendingRequests.length > 0 && (
                <>
                    <Divider />
                    <Box p="xs" ta="center">
                        <Button
                            variant="subtle"
                            size="xs"
                            color="blue"
                            onClick={() => {
                                setOpened(false);
                                router.push("/team/leave-requests");
                            }}
                        >
                            View all ({pendingRequests.length})
                        </Button>
                    </Box>
                </>
            )}
        </>
    );

    if (role !== "Manager") {
        return null;
    }

    return (
        <>
            {/* Przycisk z dzwonkiem - opakowany w div z ref */}
            <div ref={targetRef}>
                <Indicator
                    inline
                    processing
                    size={12}
                    color={pendingRequests.length > 0 ? "red" : "blue"}
                    label={pendingRequests.length > 0 ? pendingRequests.length : undefined}
                    disabled={pendingRequests.length === 0}
                >
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        radius="xl"
                        size="lg"
                        aria-label="Notifications"
                        onClick={() => setOpened((o) => !o)}
                    >
                        <IconBell size={22} />
                    </ActionIcon>
                </Indicator>
            </div>

            {/* Desktop: Popover z Portal */}
            {!isMobile && (
                <Popover
                    opened={opened}
                    onChange={setOpened}
                    width={380}
                    position="bottom-end"
                    shadow="md"
                    radius="md"
                    withArrow
                    arrowSize={8}
                    offset={8}
                    trapFocus={false}
                    clickOutsideEvents={["click"]}
                >
                    <Popover.Target>
                        <div style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
                    </Popover.Target>
                    <Portal>
                        <Popover.Dropdown
                            p={0}
                            style={{
                                position: "fixed",
                                right: "20px",
                                top: "70px",
                                zIndex: 1000,
                                width: "380px",
                                maxWidth: "calc(100vw - 40px)",
                            }}
                        >
                            {renderContent()}
                        </Popover.Dropdown>
                    </Portal>
                </Popover>
            )}

            {/* Mobile: Drawer */}
            {isMobile && (
                <Drawer
                    opened={opened}
                    onClose={() => setOpened(false)}
                    position="bottom"
                    size="85%"
                    withCloseButton={false}
                    styles={{
                        content: {
                            borderTopLeftRadius: "12px",
                            borderTopRightRadius: "12px",
                        },
                    }}
                >
                    <Box pt="xs">{renderContent()}</Box>
                </Drawer>
            )}
        </>
    );
}