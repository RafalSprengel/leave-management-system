import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { organization, admin } from "better-auth/plugins";
import mongoose from "mongoose";
import dbConnect from "@/db/connection";
import { sendEmail } from "@/lib/sendEmail";
import { Db } from "mongodb";
import dayjs from "dayjs";
import Employee from "@/db/models/Employee";
import Department from "@/db/models/Department";
import { getAppBaseUrl, getNextRequestHeaders } from "@/utils/getBaseUrl";

function createAuth(db: Db) {
    return betterAuth({
        database: mongodbAdapter(db),

        // Cache session data for 5 minutes to avoid hitting MongoDB on every
        // protected route transition. Server actions that need the absolute
        // freshest data (e.g. right after setActive()) should accept the
        // userId from the client instead of relying on the cached session.
        session: {
            cookieCache: {
                enabled: true,
                maxAge: 60 * 5, // 5 minutes
            },
        },

        emailAndPassword: {
            enabled: true,
            minPasswordLength: 8,
            requireEmailVerification: true,
            sendResetPassword: async ({ url, user }) => {
                await sendEmail({
                    to: user.email,
                    subject: "Reset your password - Off Work",
                    html: `
                        <p>Hi,</p>
                        <p>Click the link below to reset your password:</p>
                        <p><a href="${url}">${url}</a></p>
                        <p>If you didn't request this, you can ignore this email.</p>
                    `,
                });
            },
        },

        emailVerification: {
            sendOnSignUp: true,
            sendOnSignIn: false,
            autoSignInAfterVerification: true,
            sendVerificationEmail: async ({ user, url }, request) => {
                try {
                    // Employees who register through an invitation link have already
                    // proven ownership of their e-mail address: the invitation was
                    // delivered to it and the accept-invitation flow marks the address
                    // as verified right after sign-up (see verifyInvitedUserEmail.ts).
                    // The standalone "confirm your email" message would therefore be
                    // redundant, so it is skipped when the sign-up request carries the
                    // invitation id header set by the accept-invitation page — but
                    // only if a matching pending invitation really exists, so that a
                    // hand-crafted header cannot silently disable verification.
                    const invitationId = request?.headers?.get("x-invitation-id");
                    if (invitationId) {
                        const pendingInvitation = await db
                            .collection("invitation")
                            .findOne({ email: user.email.toLowerCase(), status: "pending" });

                        if (pendingInvitation) {
                            console.log(
                                `[auth] Skipping verification email for invited user ${user.email} (invitation=${invitationId})`
                            );
                            return;
                        }
                    }

                    await sendEmail({
                        to: user.email,
                        subject: "Confirm your email - Off Work",
                        html: `
                            <p>Hi,</p>
                            <p>Please confirm your email address:</p>
                            <p><a href="${url}">${url}</a></p>
                        `,
                    });
                } catch (err) {
                    console.error("[auth] sendVerificationEmail: send error:", err);
                }
            },
            afterEmailVerification: async (verifiedUser) => {
                // After email verification and auto-sign-in, Better Auth
                // redirects to /verify-email/callback, which in turn sends
                // the user to /onboarding to create their organization.
                console.log(
                    `[auth:afterEmailVerification] Email verified for user ${verifiedUser.id} (${verifiedUser.email})`
                );
            },
        },

        user: {
            changeEmail: {
                enabled: true,
            },
        },

        plugins: [
            // --- Tenancy: source of truth for organizations/members/invitations ---
            organization({
                creatorRole: "owner",
                invitationExpiresIn: 3600 * 24 * 7, // 7 days invitation expire time
                sendInvitationEmail: async (data, request) => {
                    // Prefer the host the admin is actually using (e.g. localhost:3001 in
                    // dev or the production domain) over BETTER_AUTH_URL, which is a
                    // single static value and may point to another port/environment.
                    const baseUrl = getAppBaseUrl(await getNextRequestHeaders(), request?.headers);
                    const inviteUrl = `${baseUrl}/accept-invitation/${data.id}`;
                    const expiresAt = dayjs().add(7, "day").format("MMMM D, YYYY");

                    // Greet the invitee by name. The "invited" Employee record is created
                    // before the invitation is sent (see createEmployee.ts), so the first
                    // name can be looked up by email; otherwise fall back to a generic greeting.
                    let firstName: string | undefined;
                    try {
                        await dbConnect();
                        const employee = await Employee.findOne({
                            email: data.email.toLowerCase(),
                            organizationId: data.organization.id,
                        })
                            .select("firstName")
                            .lean();
                        firstName = employee?.firstName;
                    } catch (employeeError) {
                        console.error("[auth:sendInvitationEmail] Failed to look up the invitee:", employeeError instanceof Error ? employeeError.message : employeeError);
                    }

                    const greeting = firstName ? `Hi ${firstName},` : "Hi,";

                    try {
                        await sendEmail({
                            to: data.email,
                            subject: `You've been invited to join ${data.organization.name} on Off Work`,
                            html: `
                                <!DOCTYPE html>
                                <html>
                                <head><meta charset="utf-8"></head>
                                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0;">
                                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
                                        <tr>
                                            <td align="center">
                                                <table width="480" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                                                    <tr>
                                                        <td style="padding: 40px 48px 32px;">
                                                            <h1 style="font-size: 24px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px;">You have been invited! 🎉</h1>
                                                            <p style="font-size: 16px; color: #64748b; line-height: 1.5; margin: 0 0 8px;">${greeting}</p>
                                                            <p style="font-size: 16px; color: #64748b; line-height: 1.5; margin: 0 0 24px;"><strong>${data.organization.name}</strong> has invited you to create your employee account on <strong>Off Work</strong> (leave management system).</p>
                                                            <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0 0 24px;">This invitation is valid until <strong>${expiresAt}</strong>.</p>
                                                            <table cellpadding="0" cellspacing="0">
                                                                <tr>
                                                                    <td align="center" style="background-color: #228be6; border-radius: 6px; padding: 12px 32px;">
                                                                        <a href="${inviteUrl}" style="color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; display: inline-block;">Accept invitation</a>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <p style="font-size: 14px; color: #94a3b8; line-height: 1.5; margin: 24px 0 0;">If you didn't expect this invitation, you can safely ignore this email.</p>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 24px 48px; border-top: 1px solid #e2e8f0;">
                                                            <p style="font-size: 12px; color: #94a3b8; margin: 0;">Off Work — Leave management made simple</p>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                </body>
                                </html>
                            `,
                        });
                    } catch (emailError) {
                        console.error("[auth:sendInvitationEmail] Failed to send invitation email:", emailError instanceof Error ? emailError.message : emailError);
                    }
                },

                // Automatically create the matching HR "Employee" profile the
                // moment someone becomes a member of an organization (covers
                // both the org creator and anyone accepting an invite).
                organizationHooks: {
                    afterAddMember: async ({ member, user, organization: org }) => {
                        try {
                            await dbConnect();

                            // If an admin already created an "invited" Employee row
                            // for this email (via createEmployee.ts), just link it
                            // to the newly-created Better Auth account.
                            const employee = await Employee.findOneAndUpdate(
                                {
                                    email: user.email.toLowerCase(),
                                    organizationId: org.id,
                                    status: "invited",
                                },
                                {
                                    $set: {
                                        userId: member.userId,
                                        status: "active",
                                    },
                                },
                                { new: true }
                            );

                            if (employee) {
                                console.log(`[auth:afterAddMember] Activated invited employee ${employee.email} (userId=${member.userId})`);
                                return;
                            }

                            // No pre-created record (e.g. this user created/owns the
                            // organization itself) - create a fresh HR profile.
                            const alreadyLinked = await Employee.findOne({ userId: member.userId, organizationId: org.id });
                            if (alreadyLinked) return;

                            // For the org creator, ensure the default "Administration"
                            // department exists and assign the owner to it.
                            let departmentId: mongoose.Types.ObjectId | undefined;

                            if (member.role === "owner") {
                                const adminDepartment = await Department.findOneAndUpdate(
                                    { name: "Administration", organization: org.id },
                                    { $setOnInsert: { name: "Administration", organization: org.id, managers: [] } },
                                    { new: true, upsert: true }
                                );
                                departmentId = adminDepartment._id;
                                console.log(`[auth:afterAddMember] Ensured "Administration" department for org ${org.id}`);
                            }

                            const [firstName, ...rest] = (user.name || user.email.split("@")[0]).split(" ");

                            await Employee.create({
                                userId: member.userId,
                                organizationId: org.id,
                                firstName: firstName || "New",
                                lastName: rest.join(" ") || "Employee",
                                email: user.email,
                                role: (member.role === "admin" || member.role === "owner") ? "Manager" : "Employee",
                                isOwner: member.role === "owner",
                                department: departmentId,
                                employmentDate: new Date(),
                                status: "active",
                            });
                        } catch (error) {
                            console.error("[auth:afterAddMember] Error:", error);
                        }
                    },
                },
            }),

            // --- Platform-level administration (Rafal / SaaS operator) ---
            // Separate axis from organization roles above: ban/unban users,
            // impersonate for support, list all users across every org.
            admin({
                defaultRole: "user",
                adminRoles: ["admin"],
            }),
        ],

        secret: process.env.BETTER_AUTH_SECRET,
        trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3002",
            "https://off-work.rafalsprengel.com",
            "off-work-three.vercel.app"
        ]
    });
}

type AppAuth = ReturnType<typeof createAuth>;
let _auth: AppAuth | undefined;

export async function getAuth(): Promise<AppAuth> {
    if (_auth) return _auth;

    await dbConnect();

    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection.db is not available after dbConnect()");

    _auth = createAuth(db);

    return _auth;
}