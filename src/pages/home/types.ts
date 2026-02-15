//

export type GetHealthResult = {
  status: string;
  knownNodes: number;
  connectedNodes: number;
  storageNodes: number;
  storageNodesUp: number;
  partitions: number;
  partitionsQuorum: number;
  partitionsAllOk: number;
};

export type PartitionInfo = {
  available: number;
  total: number;
};

export type NodeRole = {
  id: string;
  zone: string;
  capacity: number;
  tags: string[];
};

export type NodeStatsResult = {
  id: string;
  addr: string;
  hostname: string;
  isUp: boolean;
  lastSeenSecsAgo: number | null;
  draining: boolean;
  role: NodeRole | null;
  dataPartition: PartitionInfo | null;
  metadataPartition: PartitionInfo | null;
  stats: Record<string, unknown> | null;
};
