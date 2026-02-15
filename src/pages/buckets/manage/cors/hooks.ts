import api from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CorsRule } from "./types";

export const useCorsConfig = (bucketId?: string) => {
  return useQuery({
    queryKey: ["bucket-cors", bucketId],
    queryFn: () =>
      api.get<CorsRule[]>("/v2/GetBucketCorsConfiguration", {
        params: { id: bucketId },
      }),
    enabled: !!bucketId,
  });
};

export const useUpdateCors = (bucketId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rules: CorsRule[]) =>
      api.put("/v2/PutBucketCorsConfiguration", {
        params: { id: bucketId },
        body: rules,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["bucket-cors", bucketId] }),
  });
};

export const useDeleteCors = (bucketId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.delete("/v2/DeleteBucketCorsConfiguration", {
        params: { id: bucketId },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["bucket-cors", bucketId] }),
  });
};
