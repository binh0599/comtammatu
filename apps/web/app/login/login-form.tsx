"use client";

import { useActionState, useEffect, useRef } from "react";
import { login } from "./actions";
import type { ActionErrorCode } from "@comtammatu/shared";
import { ChefHat } from "lucide-react";
import { getDeviceFingerprint, getDeviceName } from "@/lib/device-fingerprint";
import { DevicePendingApproval } from "./device-pending";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@comtammatu/ui";

type LoginState =
  | { error: string; code: ActionErrorCode }
  | {
      pendingApproval: boolean;
      approvalCode: string;
      deviceId: number;
      role: string;
    }
  | null;

interface LoginFormProps {
  /** Pre-populated pending device info from server (page refresh scenario) */
  pendingDevice?: {
    approvalCode: string;
    deviceId: number;
    role: string;
  } | null;
}

function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  return login(formData) as Promise<LoginState>;
}

export function LoginForm({ pendingDevice }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  // Inject device fingerprint into the form before submission
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    let fpInput = form.querySelector<HTMLInputElement>(
      'input[name="device_fingerprint"]',
    );
    if (!fpInput) {
      fpInput = document.createElement("input");
      fpInput.type = "hidden";
      fpInput.name = "device_fingerprint";
      form.appendChild(fpInput);
    }
    fpInput.value = getDeviceFingerprint();

    let dnInput = form.querySelector<HTMLInputElement>(
      'input[name="device_name"]',
    );
    if (!dnInput) {
      dnInput = document.createElement("input");
      dnInput.type = "hidden";
      dnInput.name = "device_name";
      form.appendChild(dnInput);
    }
    dnInput.value = getDeviceName();
  }, []);

  // Show pending approval screen — either from server action result OR from
  // server-side props (page refresh while device is still pending)
  const pendingInfo =
    state && "pendingApproval" in state && state.pendingApproval
      ? state
      : pendingDevice
        ? { ...pendingDevice, pendingApproval: true as const }
        : null;

  if (pendingInfo) {
    return (
      <DevicePendingApproval
        approvalCode={pendingInfo.approvalCode}
        deviceId={pendingInfo.deviceId}
        role={pendingInfo.role}
      />
    );
  }

  const errorState = state && "error" in state ? state : null;

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ChefHat className="size-6" />
        </div>
        <CardTitle className="text-xl font-bold">Cơm tấm Má Tư</CardTitle>
        <CardDescription>Đăng nhập vào hệ thống quản lý</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          {errorState?.error && (
            <div
              id="login-error"
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {errorState.error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="email@comtammatu.vn"
              required
              autoComplete="email"
              disabled={isPending}
              aria-describedby={errorState?.error ? "login-error" : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Nhập mật khẩu"
              required
              autoComplete="current-password"
              disabled={isPending}
              aria-describedby={errorState?.error ? "login-error" : undefined}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
