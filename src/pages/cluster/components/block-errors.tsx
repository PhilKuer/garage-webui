import { Card, Badge } from "react-daisyui";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import Button from "@/components/ui/button";
import { useBlockErrors, usePurgeBlocks } from "../hooks-blocks";
import { toast } from "sonner";
import { handleError } from "@/lib/utils";

const BlockErrors = () => {
  const { data: errors, isLoading, refetch } = useBlockErrors();
  const purgeBlocks = usePurgeBlocks();

  const handlePurge = async (hash: string) => {
    if (!window.confirm("Are you sure you want to purge this block? This cannot be undone.")) return;
    try {
      await purgeBlocks.mutateAsync([hash]);
      toast.success("Block purged successfully");
      refetch();
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <Card className="mt-4 md:mt-8">
      <Card.Body>
        <div className="flex items-center justify-between">
          <Card.Title className="flex items-center gap-2">
            <AlertTriangle size={20} />
            Block Errors
            {errors?.length ? (
              <Badge color="error" size="sm">{errors.length}</Badge>
            ) : null}
          </Card.Title>
          <Button icon={RefreshCw} color="ghost" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        {isLoading && <p className="mt-4 text-sm">Loading block errors...</p>}

        {!isLoading && (!errors || errors.length === 0) && (
          <p className="text-sm text-base-content/60 mt-4">No block errors found. Your cluster data is healthy.</p>
        )}

        {errors && errors.length > 0 && (
          <div className="overflow-x-auto mt-4">
            <table className="table table-zebra table-sm">
              <thead>
                <tr>
                  <th>Block Hash</th>
                  <th>Bucket</th>
                  <th>Key</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((err: any, idx: number) => (
                  <tr key={idx}>
                    <td>
                      <code className="text-xs">{err.blockHash?.substring(0, 24)}...</code>
                    </td>
                    <td className="text-sm">{err.refererObj?.bucket?.substring(0, 16) || "-"}</td>
                    <td className="text-sm truncate max-w-[200px]">{err.refererObj?.key || "-"}</td>
                    <td>
                      <Button
                        icon={Trash2}
                        size="xs"
                        color="error"
                        onClick={() => handlePurge(err.blockHash)}
                      >
                        Purge
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default BlockErrors;
