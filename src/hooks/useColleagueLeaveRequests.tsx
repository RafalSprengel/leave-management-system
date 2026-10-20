"use client";

import { notifications } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { getColleagueApprovedLeaveRequests } from "@/actions/employee/leave/getColleagueApprovedLeaveRequests";
import type { TeamLeaveRequestItem } from "@/types/leaveRequest";

export function useColleagueLeaveRequests() {
  const [requests, setRequests] = useState<TeamLeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRequests() {
      setLoading(true);
      const res = await getColleagueApprovedLeaveRequests();
      if (res.success && res.data) {
        setRequests(res.data);
      } else {
        notifications.show({
          title: "Error",
          message: res.error || "Failed to load leave requests",
          color: "red",
          icon: <IconX size={16} />,
        });
      }
      setLoading(false);
    }

    fetchRequests();
  }, []);

  return { requests, loading };
}
