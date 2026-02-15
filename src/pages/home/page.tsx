import Page from "@/context/page-context";
import { useNodeStats, useNodesHealth } from "./hooks";
import StatsCard from "./components/stats-card";
import {
  Database,
  DatabaseZap,
  FileBox,
  FileCheck,
  FileClock,
  HardDrive,
  HardDriveUpload,
  Leaf,
  PieChart,
  Server,
} from "lucide-react";
import { cn, readableBytes, ucfirst } from "@/lib/utils";
import { useBuckets } from "../buckets/hooks";
import { useMemo } from "react";
import { NodeStatsResult } from "./types";

const HomePage = () => {
  const { data: health } = useNodesHealth();
  const { data: buckets } = useBuckets();
  const { data: nodeStats } = useNodeStats();

  const totalUsage = useMemo(() => {
    return buckets?.reduce((acc, bucket) => acc + bucket.bytes, 0);
  }, [buckets]);

  const storageOverview = useMemo(() => {
    if (!nodeStats || nodeStats.length === 0) return null;
    let totalCapacity = 0;
    let totalUsed = 0;
    for (const node of nodeStats) {
      if (node.dataPartition) {
        totalCapacity += node.dataPartition.total;
        totalUsed += node.dataPartition.total - node.dataPartition.available;
      }
    }
    return { totalCapacity, totalUsed };
  }, [nodeStats]);

  return (
    <div className="container">
      <Page title="Dashboard" />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <StatsCard
          title="Status"
          icon={Leaf}
          value={ucfirst(health?.status)}
          valueClassName={cn(
            "text-lg",
            health?.status === "healthy"
              ? "text-success"
              : health?.status === "degraded"
                ? "text-warning"
                : "text-error"
          )}
        />
        <StatsCard title="Nodes" icon={HardDrive} value={health?.knownNodes} />
        <StatsCard
          title="Connected Nodes"
          icon={HardDriveUpload}
          value={health?.connectedNodes}
        />
        <StatsCard
          title="Storage Nodes"
          icon={Database}
          value={health?.storageNodes}
        />
        <StatsCard
          title="Active Storage Nodes"
          icon={DatabaseZap}
          value={health?.storageNodesUp}
        />
        <StatsCard
          title="Partitions"
          icon={FileBox}
          value={health?.partitions}
        />
        <StatsCard
          title="Partitions Quorum"
          icon={FileClock}
          value={health?.partitionsQuorum}
        />
        <StatsCard
          title="Active Partitions"
          icon={FileCheck}
          value={health?.partitionsAllOk}
        />
        <StatsCard
          title="Total Usage"
          icon={PieChart}
          value={readableBytes(totalUsage)}
        />
      </section>

      {storageOverview && (
        <section className="mt-6 md:mt-8">
          <h2 className="text-lg font-semibold mb-4">Storage Overview</h2>
          <div className="bg-base-100 rounded-box p-4 md:p-6">
            <div className="flex flex-row items-center gap-4 mb-3">
              <Server size={24} />
              <div className="flex-1">
                <p className="text-sm text-base-content/70">
                  Total Disk Usage Across All Nodes
                </p>
                <p className="text-xl font-bold">
                  {readableBytes(storageOverview.totalUsed)} /{" "}
                  {readableBytes(storageOverview.totalCapacity)}
                </p>
              </div>
            </div>
            <progress
              className="progress progress-primary w-full"
              value={storageOverview.totalUsed}
              max={storageOverview.totalCapacity}
            />
          </div>
        </section>
      )}

      {nodeStats && nodeStats.length > 0 && (
        <section className="mt-6 md:mt-8">
          <h2 className="text-lg font-semibold mb-4">Node Details</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {nodeStats.map((node) => (
              <NodeCard key={node.id} node={node} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const NodeCard = ({ node }: { node: NodeStatsResult }) => {
  const diskUsed = node.dataPartition
    ? node.dataPartition.total - node.dataPartition.available
    : null;
  const diskTotal = node.dataPartition?.total ?? null;
  const diskPercent =
    diskUsed != null && diskTotal != null && diskTotal > 0
      ? ((diskUsed / diskTotal) * 100).toFixed(1)
      : null;

  return (
    <div className="bg-base-100 rounded-box p-4 md:p-6">
      <div className="flex flex-row items-center gap-3 mb-3">
        <HardDrive size={24} />
        <div className="flex-1 truncate">
          <p className="font-semibold truncate">
            {node.hostname || node.id.slice(0, 16)}
          </p>
          <p className="text-xs text-base-content/60 truncate">{node.addr}</p>
        </div>
        <span
          className={cn(
            "badge badge-sm",
            node.isUp ? "badge-success" : "badge-error"
          )}
        >
          {node.isUp ? "Online" : "Offline"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
        {node.role && (
          <>
            <div className="text-base-content/70">Zone</div>
            <div className="font-medium">{node.role.zone}</div>
            <div className="text-base-content/70">Capacity</div>
            <div className="font-medium">
              {readableBytes(node.role.capacity, 1000)}
            </div>
          </>
        )}
        {node.dataPartition && (
          <>
            <div className="text-base-content/70">Disk Used</div>
            <div className="font-medium">
              {readableBytes(diskUsed)} / {readableBytes(diskTotal)}
            </div>
            <div className="text-base-content/70">Disk Available</div>
            <div className="font-medium">
              {readableBytes(node.dataPartition.available)}
            </div>
          </>
        )}
        {node.metadataPartition && (
          <>
            <div className="text-base-content/70">Metadata</div>
            <div className="font-medium">
              {readableBytes(
                node.metadataPartition.total - node.metadataPartition.available
              )}{" "}
              / {readableBytes(node.metadataPartition.total)}
            </div>
          </>
        )}
      </div>

      {diskUsed != null && diskTotal != null && diskTotal > 0 && (
        <div>
          <div className="flex justify-between text-xs text-base-content/60 mb-1">
            <span>Disk Usage</span>
            <span>{diskPercent}%</span>
          </div>
          <progress
            className={cn(
              "progress w-full",
              Number(diskPercent) > 90
                ? "progress-error"
                : Number(diskPercent) > 70
                  ? "progress-warning"
                  : "progress-primary"
            )}
            value={diskUsed}
            max={diskTotal}
          />
        </div>
      )}
    </div>
  );
};

export default HomePage;
