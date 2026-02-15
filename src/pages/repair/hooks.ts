import api from "@/lib/api";
import { useMutation, useQuery } from "@tanstack/react-query";

export const useBlockErrors = () => {
  return useQuery({
    queryKey: ["block-errors"],
    queryFn: () => api.get("/v2/ListBlockErrors"),
  });
};

export const useLaunchRepair = () => {
  return useMutation({
    mutationFn: (repair: string) => api.post("/v2/LaunchRepairOperation", { body: { repair } }),
  });
};
