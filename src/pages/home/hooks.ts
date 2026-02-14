import api from "@/lib/api";
import { GetHealthResult, NodeStatsResult } from "./types";
import { useQuery } from "@tanstack/react-query";

export const useNodesHealth = () => {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => api.get<GetHealthResult>("/v2/GetClusterHealth"),
  });
};

export const useNodeStats = () => {
  return useQuery({
    queryKey: ["node-stats"],
    queryFn: () => api.get<NodeStatsResult[]>("/stats/nodes"),
  });
};
