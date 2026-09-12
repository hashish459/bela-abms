"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { api, Button, Card, Field, Input, PageHeader, toast } from "@/components/ui";

type Session = { id: string; ip: string; userAgent: string; createdAt: string; expiresAt: string };

export function SigninSecurityView({ sessions }: { sessions: Session[] }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function changePassword() {
    if (newPassword.length < 8) return toast("New password must be at least 8 characters", "err");
    if (newPassword !== confirmPassword) return toast("New password and confirmation do not match", "err");
    setSaving(true);
    const res = await api("/api/settings/signin-security/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast("Password changed");
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
  }

  async function revoke(id: string) {
    if (!confirm("Sign out this session?")) return;
    const res = await api(`/api/settings/signin-security/sessions/${id}`, { method: "DELETE" });
    if (!res.ok) return toast(res.error.message, "err");
    toast("Session signed out");
    router.refresh();
  }

  return (
    <>
      <PageHeader crumbs={["Settings", "Signin & Security"]} title="Signin & Security" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-5">
          <h2 className="text-sm font-semibold">Change password</h2>
          <Field label="Current password" required>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </Field>
          <Field label="New password" required hint="At least 8 characters">
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </Field>
          <Field label="Confirm new password" required>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </Field>
          <div className="flex justify-end pt-1">
            <Button loading={saving} onClick={changePassword}>Change password</Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Active sessions</h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted">No other active sessions.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium" title={s.userAgent}>{s.userAgent}</div>
                    <div className="text-xs text-muted">
                      {s.ip} · signed in {new Date(s.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => revoke(s.id)} title="Sign out this session">
                    <LogOut size={14} className="text-danger" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
