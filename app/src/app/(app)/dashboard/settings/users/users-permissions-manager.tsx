"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, ShieldCheck } from "lucide-react";
import { api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast } from "@/components/ui";

type Role = { id: string; name: string };
type User = {
  id: string; firstName: string; lastName: string; email: string; phone: string | null;
  userType: string; status: string; lastLoginAt: string | null; roles: Role[];
};
type Actions = { canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean };
type RoleRow = { id: string; name: string; isSystem: boolean; userCount: number; permissions: Record<string, Actions> };
type ModuleGroup = { groupKey: string; groupName: string; modules: { id: string; key: string; label: string }[] };
type Branch = { id: string; name: string; address: string | null };

type Perms = {
  usersCreate: boolean; usersUpdate: boolean;
  rolesRead: boolean; rolesCreate: boolean; rolesUpdate: boolean; rolesDelete: boolean;
  branchesCreate: boolean; branchesDelete: boolean;
};

const TABS = ["Users", "Roles & Permissions", "Companies"] as const;

export function UsersPermissionsManager({
  currentUserId, users, roles, groups, branches, perms,
}: {
  currentUserId: string; users: User[]; roles: RoleRow[]; groups: ModuleGroup[]; branches: Branch[]; perms: Perms;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Users");

  return (
    <>
      <PageHeader crumbs={["Settings", "User & Permissions"]} title="User & Permissions" />
      <div className="mb-4 flex gap-1 rounded-xl border border-border bg-surface p-1">
        {TABS.filter((t) => t !== "Roles & Permissions" || perms.rolesRead).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm ${tab === t ? "bg-accent-tint font-semibold text-accent" : "text-muted hover:text-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Users" && <UsersTab currentUserId={currentUserId} users={users} roles={roles.map((r) => ({ id: r.id, name: r.name }))} perms={perms} />}
      {tab === "Roles & Permissions" && perms.rolesRead && <RolesTab roles={roles} groups={groups} perms={perms} />}
      {tab === "Companies" && <BranchesTab branches={branches} perms={perms} />}
    </>
  );
}

/* ────────────────────────────────  Users  ─────────────────────────────────── */

function UsersTab({
  currentUserId, users, roles, perms,
}: { currentUserId: string; users: User[]; roles: Role[]; perms: Perms }) {
  const router = useRouter();
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);

  async function toggleStatus(u: User) {
    const nextStatus = u.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    const res = await api(`/api/settings/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
    if (!res.ok) return toast(res.error.message, "err");
    toast(nextStatus === "ACTIVE" ? "User enabled" : "User disabled");
    router.refresh();
  }

  return (
    <>
      {perms.usersCreate && (
        <div className="mb-3 flex justify-end">
          <Button onClick={() => setCreating(true)}><Plus size={15} /> Add user</Button>
        </div>
      )}

      {users.length === 0 ? (
        <EmptyState title="No users yet" hint="Add your team and assign them roles." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Roles</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2.5 font-medium">
                    {u.firstName} {u.lastName}
                    {u.id === currentUserId && <span className="ml-1.5 text-xs text-muted">(you)</span>}
                  </td>
                  <td className="px-4 py-2.5">{u.email}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{u.userType}</td>
                  <td className="px-4 py-2.5">
                    {u.roles.length === 0 ? <span className="text-muted">—</span> : u.roles.map((r) => r.name).join(", ")}
                  </td>
                  <td className="px-4 py-2.5">
                    {u.status === "ACTIVE" ? <span className="text-success">Active</span> : <span className="text-danger">Disabled</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {perms.usersUpdate && <Button variant="ghost" onClick={() => setEditing(u)}><Pencil size={14} /></Button>}
                      {perms.usersUpdate && u.id !== currentUserId && (
                        <Button variant="ghost" onClick={() => toggleStatus(u)}>
                          {u.status === "ACTIVE" ? <Trash2 size={14} className="text-danger" /> : <ShieldCheck size={14} className="text-success" />}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {(creating || editing) && (
        <UserForm
          user={editing}
          roles={roles}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
        />
      )}
    </>
  );
}

function UserForm({ user, roles, onClose, onSaved }: { user: User | null; roles: Role[]; onClose: () => void; onSaved: () => void }) {
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState(user?.userType ?? "STAFF");
  const [roleIds, setRoleIds] = useState<string[]>(user?.roles.map((r) => r.id) ?? []);
  const [saving, setSaving] = useState(false);

  function toggleRole(id: string) {
    setRoleIds((rs) => (rs.includes(id) ? rs.filter((r) => r !== id) : [...rs, id]));
  }

  async function save() {
    if (!user && (!firstName.trim() || !lastName.trim() || !email.trim() || password.length < 8))
      return toast("Name, email and an 8+ character password are required", "err");
    setSaving(true);
    const res = user
      ? await api(`/api/settings/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ firstName, lastName, phone, roleIds }) })
      : await api("/api/settings/users", { method: "POST", body: JSON.stringify({ firstName, lastName, email, phone, password, userType, roleIds }) });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(user ? "User updated" : "User added");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={user ? "Update user" : "Add user"} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name" required>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <Field label="Last name" required>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </Field>
        <Field label="Email" required>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!user} />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        {!user && (
          <>
            <Field label="Password" required hint="At least 8 characters">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Field label="User type">
              <select value={userType} onChange={(e) => setUserType(e.target.value)} className={inputClass}>
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
            </Field>
          </>
        )}
      </div>

      <div className="mt-3">
        <label className="mb-1.5 block text-sm font-medium">Roles</label>
        {roles.length === 0 ? (
          <p className="text-xs text-muted">No roles defined yet — create one under Roles & Permissions.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <label key={r.id} className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs ring-1 ${roleIds.includes(r.id) ? "bg-accent-tint text-accent ring-accent" : "text-muted ring-border"}`}>
                <input type="checkbox" className="hidden" checked={roleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
                {r.name}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={saving} onClick={save}>Save</Button>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────  Roles & Permissions  ────────────────────── */

function emptyMatrix(groups: ModuleGroup[]): Record<string, Actions> {
  const out: Record<string, Actions> = {};
  for (const g of groups) for (const m of g.modules) out[m.key] = { canCreate: false, canRead: false, canUpdate: false, canDelete: false };
  return out;
}

function RolesTab({ roles, groups, perms }: { roles: RoleRow[]; groups: ModuleGroup[]; perms: Perms }) {
  const router = useRouter();
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [creating, setCreating] = useState(false);

  async function remove(r: RoleRow) {
    if (!confirm(`Delete role "${r.name}"?`)) return;
    const res = await api(`/api/settings/roles/${r.id}`, { method: "DELETE" });
    if (!res.ok) return toast(res.error.message, "err");
    toast("Role deleted");
    router.refresh();
  }

  return (
    <>
      {perms.rolesCreate && (
        <div className="mb-3 flex justify-end">
          <Button onClick={() => setCreating(true)}><Plus size={15} /> Add role</Button>
        </div>
      )}

      {roles.length === 0 ? (
        <EmptyState title="No roles yet" hint="Create a role and grant it access per module." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Users</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roles.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2.5 font-medium">
                    {r.name}
                    {r.isSystem && <span className="ml-2 rounded bg-border px-1.5 py-0.5 text-xs text-muted">system</span>}
                  </td>
                  <td className="px-4 py-2.5">{r.userCount}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {perms.rolesUpdate && !r.isSystem && <Button variant="ghost" onClick={() => setEditing(r)}><Pencil size={14} /></Button>}
                      {perms.rolesDelete && !r.isSystem && <Button variant="ghost" onClick={() => remove(r)}><Trash2 size={14} className="text-danger" /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {(creating || editing) && (
        <RoleForm
          role={editing}
          groups={groups}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
        />
      )}
    </>
  );
}

function RoleForm({ role, groups, onClose, onSaved }: { role: RoleRow | null; groups: ModuleGroup[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(role?.name ?? "");
  const [matrix, setMatrix] = useState<Record<string, Actions>>(() => ({ ...emptyMatrix(groups), ...(role?.permissions ?? {}) }));
  const [saving, setSaving] = useState(false);

  function setCell(key: string, action: keyof Actions, value: boolean) {
    setMatrix((m) => ({ ...m, [key]: { ...m[key], [action]: value } }));
  }
  function toggleGroupAll(g: ModuleGroup, value: boolean) {
    setMatrix((m) => {
      const next = { ...m };
      for (const mod of g.modules) next[mod.key] = { canCreate: value, canRead: value, canUpdate: value, canDelete: value };
      return next;
    });
  }

  async function save() {
    if (!name.trim()) return toast("Role name is required", "err");
    setSaving(true);
    const res = await api(role ? `/api/settings/roles/${role.id}` : "/api/settings/roles", {
      method: role ? "PATCH" : "POST",
      body: JSON.stringify({ name, permissions: matrix }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(role ? "Role updated" : "Role added");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={role ? "Update role" : "Add role"} wide>
      <div className="mb-3">
        <Field label="Role name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cashier" />
        </Field>
      </div>

      <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
        {groups.map((g) => (
          <div key={g.groupKey}>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{g.groupName}</h3>
              <div className="flex gap-2 text-xs">
                <button type="button" className="text-accent hover:underline" onClick={() => toggleGroupAll(g, true)}>Grant all</button>
                <button type="button" className="text-muted hover:underline" onClick={() => toggleGroupAll(g, false)}>Clear</button>
              </div>
            </div>
            <table className="w-full text-xs">
              <thead className="text-muted">
                <tr>
                  <th className="w-1/3 pb-1 text-left font-medium">Module</th>
                  <th className="pb-1 text-center font-medium">Create</th>
                  <th className="pb-1 text-center font-medium">Read</th>
                  <th className="pb-1 text-center font-medium">Update</th>
                  <th className="pb-1 text-center font-medium">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {g.modules.map((m) => (
                  <tr key={m.key}>
                    <td className="py-1">{m.label}</td>
                    {(["canCreate", "canRead", "canUpdate", "canDelete"] as const).map((a) => (
                      <td key={a} className="py-1 text-center">
                        <input
                          type="checkbox"
                          checked={matrix[m.key]?.[a] ?? false}
                          onChange={(e) => setCell(m.key, a, e.target.checked)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={saving} onClick={save}>Save</Button>
      </div>
    </Modal>
  );
}

/* ────────────────────────────────  Companies  ─────────────────────────────── */

function BranchesTab({ branches, perms }: { branches: Branch[]; perms: Perms }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return toast("Branch name is required", "err");
    setSaving(true);
    const res = await api("/api/settings/branches", { method: "POST", body: JSON.stringify({ name, address }) });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast("Branch added");
    setCreating(false); setName(""); setAddress("");
    router.refresh();
  }

  async function remove(b: Branch) {
    if (!confirm(`Delete branch "${b.name}"?`)) return;
    const res = await api(`/api/settings/branches/${b.id}`, { method: "DELETE" });
    if (!res.ok) return toast(res.error.message, "err");
    toast("Branch deleted");
    router.refresh();
  }

  return (
    <>
      <p className="mb-3 text-sm text-muted">Branches under this company.</p>
      {perms.branchesCreate && (
        <div className="mb-3 flex justify-end">
          <Button onClick={() => setCreating(true)}><Plus size={15} /> Add branch</Button>
        </div>
      )}

      {branches.length === 0 ? (
        <EmptyState title="No branches yet" hint="Add a branch location for this company." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Address</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {branches.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-2.5 font-medium">{b.name}</td>
                  <td className="px-4 py-2.5 text-muted">{b.address ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    {perms.branchesDelete && <Button variant="ghost" onClick={() => remove(b)}><Trash2 size={14} className="text-danger" /></Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {creating && (
        <Modal open onClose={() => setCreating(false)} title="Add branch">
          <div className="space-y-3">
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pokhara Branch" />
            </Field>
            <Field label="Address">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
              <Button loading={saving} onClick={save}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
