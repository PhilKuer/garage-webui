import api from "@/lib/api";
import { useMutation, useQuery } from "@tanstack/react-query";

export const useBlockErrors = () => {
  return useQuery({
    queryKey: ["block-errors"],
    queryFn: () => api.get("/v2/ListBlockErrors"),
  });
};

export const usePurgeBlocks = () => {
  return useMutation({
    mutationFn: (hashes: string[]) => api.post("/v2/PurgeBlocks", { body: hashes }),
  });
};
