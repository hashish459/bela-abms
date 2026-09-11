import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getSystemInfo } from "@/server/system/service";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "System Info — Bela ABMS" };

function fmtBytes(mb: number) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb} MB`;
}
function fmtUptime(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${d ? `${d}d ` : ""}${h}h ${m}m`;
}

export default async function SystemInfoPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "system.system_info", "read")) redirect("/dashboard");
  const info = await getSystemInfo(s.companyId!);
  const heapMB = Math.round(info.process.memory.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(info.process.memory.heapTotal / 1024 / 1024);
  const rssMB = Math.round(info.process.memory.rss / 1024 / 1024);

  return (
    <>
      <PageHeader crumbs={["System", "System Info"]} title="System Info" />
      <p className="mb-4 text-sm text-muted">
        Live diagnostic snapshot of the application server, database, and per-module record
        counts — for troubleshooting, not for regular use.
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Application</h3>
          <dl className="space-y-1.5 text-sm">
            <Row k="Version" v={info.app.version} />
            <Row k="Next.js" v={info.app.nextVersion} />
            <Row k="React" v={info.app.reactVersion} />
            <Row k="Prisma Client" v={info.app.prismaVersion} />
            <Row k="Environment" v={info.app.nodeEnv} />
          </dl>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Process</h3>
          <dl className="space-y-1.5 text-sm">
            <Row k="Node.js" v={info.process.nodeVersion} />
            <Row k="Platform" v={`${info.process.platform} / ${info.process.arch}`} />
            <Row k="PID" v={String(info.process.pid)} />
            <Row k="Uptime" v={fmtUptime(info.process.uptimeSeconds)} />
            <Row k="Heap used" v={`${fmtBytes(heapMB)} / ${fmtBytes(heapTotalMB)}`} />
            <Row k="RSS" v={fmtBytes(rssMB)} />
          </dl>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Host</h3>
          <dl className="space-y-1.5 text-sm">
            <Row k="Hostname" v={info.host.hostname} />
            <Row k="CPU" v={`${info.host.cpuModel} (${info.host.cpuCount} cores)`} />
            <Row k="Memory" v={`${fmtBytes(info.host.freeMemMB)} free / ${fmtBytes(info.host.totalMemMB)}`} />
            <Row k="Host uptime" v={fmtUptime(info.host.uptimeSeconds)} />
          </dl>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Database</h3>
          <dl className="space-y-1.5 text-sm">
            <Row k="Server" v={info.database.serverVersion} />
            <Row k="Database size" v={info.database.size} />
            <Row
              k="Round-trip latency"
              v={`${info.database.avgLatencyMs} ms avg (${info.database.pingsMs.join(", ")} ms)`}
            />
          </dl>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Network</h3>
          <dl className="space-y-1.5 text-sm">
            <Row k="Port" v={info.network.port} />
            {info.network.addresses.length === 0 && <Row k="Interfaces" v="loopback only" />}
            {info.network.addresses.map((a, i) => (
              <Row key={i} k={`${a.name} (${a.family})`} v={a.address} />
            ))}
          </dl>
        </Card>
      </div>

      <h3 className="mb-3 mt-6 text-sm font-semibold">Module record counts</h3>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {info.modules.map((m) => (
              <tr key={m.name} className="hover:bg-accent-tint">
                <td className="px-4 py-2">{m.name}</td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">{m.count.toLocaleString("en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
