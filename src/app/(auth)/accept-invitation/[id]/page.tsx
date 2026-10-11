"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Alert, Button, Center, Loader, Stack, TextInput, PasswordInput, Text, Group, Anchor } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconCheck, IconX } from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { getCurrentEmployeeRole } from "@/actions/shared/getCurrentEmployeeRole";
import { getInvitationData } from "@/actions/public/invitation/getInvitationData";
import { activateEmployeeAfterInvite } from "@/actions/public/invitation/acceptInvitation";
import { verifyInvitedUserEmail } from "@/actions/public/invitation/verifyInvitedUserEmail";
import AuthCard from "../../_components/AuthCard/AuthCard";

type Status = "checking" | "form" | "accepting" | "error" | "success";

export default function AcceptInvitationPage() {
    const params = useParams<{ id: string }>();
    const invitationId = params.id;

    const [status, setStatus] = useState<Status>("checking");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [organizationName, setOrganizationName] = useState<string>("Off-Work");

    const form = useForm({
        initialValues: {
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
        validate: {
            firstName: (value) => (value.trim() ? null : "First name is required"),
            lastName: (value) => (value.trim() ? null : "Last name is required"),
            password: (value) =>
                value.length >= 8 ? null : "Password must be at least 8 characters",
            confirmPassword: (value, values) =>
                value === values.password ? null : "Passwords do not match",
        },
    });

    // Prevent double execution in React 18 Strict Mode (dev mode)
    const executedRef = useRef(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        // On unmount, mark as not mounted
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (executedRef.current) return;
        executedRef.current = true;

        async function run() {
            try {
                const session = await authClient.getSession();

                if (!isMountedRef.current) return;

                if (session.data?.user) {
                    // User is already logged in — accept the invitation directly
                    setStatus("accepting");

                    const { data, error } = await authClient.organization.acceptInvitation({
                        invitationId,
                    });

                    if (!isMountedRef.current) return;

                    if (error || !data) {
                        setErrorMessage(
                            error?.message ||
                            "This invitation is no longer valid. It may have expired, already been used, or been sent to a different email address."
                        );
                        setStatus("error");
                        return;
                    }

                    const organizationId =
                        (data as any)?.invitation?.organizationId ??
                        (data as any)?.member?.organizationId;

                    if (organizationId) {
                        await authClient.organization.setActive({ organizationId });
                    }

                    // Activate the Employee record in our DB (safety net on top of the hook)
                    if (organizationId && session.data?.user?.email) {
                        await activateEmployeeAfterInvite({
                            email: session.data.user.email,
                            organizationId,
                        });
                    }

                    const { success, role } = await getCurrentEmployeeRole({ freshSession: true });

                    if (!isMountedRef.current) return;

                    setStatus("success");

                    // If role resolution failed, try a few more times — the
                    // afterAddMember hook may still be linking the Employee record.
                    if (!success || !role) {
                        for (let attempt = 0; attempt < 5; attempt++) {
                            const retry = await getCurrentEmployeeRole({ freshSession: true });
                            if (retry.success && retry.role) {
                                window.location.href = retry.role === "Employee" ? "/me" : "/team";
                                return;
                            }
                            if (attempt < 4) await new Promise((r) => setTimeout(r, 500));
                        }
                    }

                    window.location.href = success && role === "Employee" ? "/me" : "/team";
                    return;
                }

                // User is signed out — fetch invitation data and show the registration form
                const result = await getInvitationData(invitationId);

                if (!isMountedRef.current) return;

                if (!result.success || !result.data) {
                    setErrorMessage(result.error || "Could not load invitation details.");
                    setStatus("error");
                    return;
                }

                form.setValues({
                    firstName: result.data.firstName,
                    lastName: result.data.lastName,
                    email: result.data.email,
                    password: "",
                    confirmPassword: "",
                });

                setOrganizationName(result.data.organizationName);
                setStatus("form");
            } catch (err) {
                if (!isMountedRef.current) return;
                console.error("Invitation check error:", err);
                setErrorMessage("An unexpected error occurred. Please try again or contact support.");
                setStatus("error");
            }
        }

        run();
    }, [invitationId]);

    async function handleCreateAccount() {
        const { hasErrors } = form.validate();
        if (hasErrors) return;

        try {
            const fullName = `${form.values.firstName.trim()} ${form.values.lastName.trim()}`;
            const { error: signUpError } = await authClient.signUp.email({
                name: fullName,
                email: form.values.email,
                password: form.values.password,
                // Flag this sign-up as coming from an invitation link so the server
                // can skip the redundant "confirm your email" message: clicking the
                // invitation already proved ownership of this address (the flow
                // verifies the e-mail itself via verifyInvitedUserEmail). See
                // sendVerificationEmail in src/lib/auth.ts.
                fetchOptions: {
                    headers: {
                        "x-invitation-id": invitationId,
                    },
                },
            });

            if (signUpError) {
                if (
                    signUpError.code === "USER_ALREADY_EXISTS" ||
                    signUpError.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
                ) {
                    notifications.show({
                        title: "Account exists",
                        message: "An account with this email already exists. Please log in instead.",
                        color: "orange",
                        icon: <IconX size={16} />,
                    });
                } else {
                    notifications.show({
                        title: "Sign up failed",
                        message: signUpError.message || "Could not create your account.",
                        color: "red",
                        icon: <IconX size={16} />,
                    });
                }
                return;
            }

            // The user clicked a link sent to their email address, so they have
            // already proven ownership of that address. Mark the email as verified
            // immediately so that requireEmailVerification does not block sign-in.
            await verifyInvitedUserEmail({
                email: form.values.email,
                invitationId,
            });

            // Sign the user in automatically now that the email is verified.
            const { error: signInError } = await authClient.signIn.email({
                email: form.values.email,
                password: form.values.password,
            });

            if (signInError) {
                // Fallback: send them to the sign-in page manually
                notifications.show({
                    title: "Account created",
                    message: "Your account is ready. Please log in to continue.",
                    color: "blue",
                    icon: <IconCheck size={16} />,
                });
                window.location.href = `/sign-in?callbackURL=${encodeURIComponent(`/accept-invitation/${invitationId}`)}`;
                return;
            }

            // Signed in — let the invitation page handle the rest (accept + redirect)
            window.location.href = `/accept-invitation/${invitationId}`;
        } catch (err) {
            console.error("Account creation error:", err);
            setErrorMessage("An unexpected error occurred. Please try again or contact support.");
            setStatus("error");
        }
    }

    if (status === "checking" || status === "accepting") {
        return (
            <AuthCard
                title={status === "accepting" ? "Activating your account" : "Checking your invitation"}
                subtitle="One moment please..."
            >
                <Center py="lg">
                    <Loader />
                </Center>
            </AuthCard>
        );
    }
// Status: registration form (user is signed out, we have invitation data)
    if (status === "form") {
        return (
            <AuthCard
                title={`You've been invited to ${organizationName}`}
                subtitle="Set a password to activate your account and join your team."
            >
                <form onSubmit={(e) => { e.preventDefault(); handleCreateAccount(); }}>
                    <Stack gap="md">
                        {/* Email — read-only */}
                        <TextInput
                            label="Work email"
                            value={form.values.email}
                            readOnly
                            variant="filled"
                            styles={{ input: { fontWeight: 500 } }}
                        />

                        {/* First name / Last name — pre-filled from admin data, editable */}
                        <Group grow gap="sm">
                            <TextInput
                                label="First name"
                                placeholder="e.g. John"
                                {...form.getInputProps("firstName")}
                            />
                            <TextInput
                                label="Last name"
                                placeholder="e.g. Smith"
                                {...form.getInputProps("lastName")}
                            />
                        </Group>

                        <PasswordInput
                            label="Password"
                            placeholder="At least 8 characters"
                            {...form.getInputProps("password")}
                        />
                        <PasswordInput
                            label="Confirm password"
                            placeholder="Repeat your password"
                            {...form.getInputProps("confirmPassword")}
                        />

                        <Button type="submit" fullWidth mt="sm">
                            Activate account
                        </Button>
                    </Stack>
                </form>

                <Text size="sm" ta="center" mt="md">
                    Already have an account?{" "}
                    <Anchor
                        component={Link}
                        href={`/sign-in?callbackURL=${encodeURIComponent(`/accept-invitation/${invitationId}`)}`}
                        fw={600}
                    >
                        Log in
                    </Anchor>
                </Text>
            </AuthCard>
        );
    }

    if (status === "success") {
        return (
            <AuthCard title="You're in!" subtitle="Redirecting you to your dashboard...">
                <Center py="lg">
                    <IconCheck size={32} color="var(--mantine-color-green-6)" />
                </Center>
            </AuthCard>
        );
    }

    return (
        <AuthCard title="Invitation problem" subtitle="We couldn't add you to the team.">
            <Alert icon={<IconAlertCircle size={18} />} color="red" variant="light" mb="md">
                {errorMessage}
            </Alert>
            <Button component={Link} href="/sign-in" variant="default" fullWidth>
                Go to login
            </Button>
        </AuthCard>
    );
}