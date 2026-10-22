import mongoose, { type Document, type Model, Schema } from "mongoose";

import {
  LEAVE_REQUEST_TYPES,
  type LeaveRequestType,
} from "@/constants/leaveTypes";

export interface ILeaveRequest extends Document {
  employee: mongoose.Types.ObjectId | string;
  startDate: string;
  endDate: string;
  startHalfDay: boolean;
  endHalfDay: boolean;
  status: "pending" | "approved" | "rejected" | "cancelled";
  type: LeaveRequestType;
  comment?: string;
  rejectionReason?: string | null;
  coveringEmployee?: mongoose.Types.ObjectId | null;
  attachments?: string[];
  organizationId: string; // Better Auth organization id
  createdBy: mongoose.Types.ObjectId | string;
  reviewedBy?: mongoose.Types.ObjectId | string | null;
  reviewedAt?: Date | null;
  cancelledAt?: Date | null;
  employeeName?: string;
  employeeEmail?: string;
  departmentName?: string;
  managerName?: string;
  reviewedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    organizationId: {
      type: String,
      required: true,
    },
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    startDate: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD"],
    },
    endDate: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD"],
    },
    startHalfDay: { type: Boolean, default: false },
    endHalfDay: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    type: {
      type: String,
      enum: [...LEAVE_REQUEST_TYPES],
      default: "holiday",
    },
    comment: { type: String, trim: true, default: "" },
    rejectionReason: { type: String, trim: true, default: null },
    coveringEmployee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    attachments: { type: [String], default: [] },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    employeeName: { type: String },
    employeeEmail: { type: String },
    departmentName: { type: String },
    managerName: { type: String },
    reviewedByName: { type: String },
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ employee: 1, startDate: 1, endDate: 1 });
LeaveRequestSchema.index({ organizationId: 1, status: 1 });
LeaveRequestSchema.index({ createdBy: 1 });

const LeaveRequest: Model<ILeaveRequest> =
  (mongoose.models.LeaveRequest as Model<ILeaveRequest>) ||
  mongoose.model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);

export default LeaveRequest;