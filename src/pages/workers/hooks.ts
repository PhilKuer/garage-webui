import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export const useWorkerList = () => {
  return useQuery({
    queryKey: ["workers"],
    queryFn: async () => {
      const status = await api.get("/v2/GetClusterStatus");
      return {
        ...status,
        nodes: status.knownNodes || status.nodes || [],
      };
    },
    refetchInterval: 10000,
  });
};
