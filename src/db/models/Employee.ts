import mongoose, { type Document, type Model, Schema } from "mongoose";

export interface IEmployeeDocument extends Document {
    userId?: string; // Better Auth user id (1:1 link) - set once the invite is accepted
    organizationId: string; // Better Auth organization id
    firstName: string;
    lastName: string;
    email: string;
    role: "Manager" | "Employee";
    isOwner: boolean;
    department: mongoose.Types.ObjectId;
    holidayAllowance: number;
    employmentDate: Date;
    managerId?: mongoose.Types.ObjectId;
    status: "active" | "inactive" | "invited";
    createdAt: Date;
    updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployeeDocument>(
    {
        userId: {
            type: String,
        },
        organizationId: {
            type: String,
            required: true,
        },
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        role: {
            type: String,
            enum: ["Manager", "Employee"],
            default: "Employee",
        },
        isOwner: {
            type: Boolean,
            default: false,
        },
        department: {
            type: Schema.Types.ObjectId,
            ref: "Department",
        },

        holidayAllowance: { type: Number, default: 24, min: 0 },
        employmentDate: { type: Date, required: true },
        managerId: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
            default: null,
        },
        status: {
            type: String,
            enum: ["active", "inactive", "invited"],
            default: "invited",
        },
    },
    { timestamps: true }
);

EmployeeSchema.index({ userId: 1, organizationId: 1 }, { unique: true, sparse: true });
EmployeeSchema.index({ email: 1, organizationId: 1 }, { unique: true });
EmployeeSchema.index({ organizationId: 1, department: 1, status: 1 });

const Employee: Model<IEmployeeDocument> =
    (mongoose.models.Employee as Model<IEmployeeDocument>) ||
    mongoose.model<IEmployeeDocument>("Employee", EmployeeSchema);

export default Employee;