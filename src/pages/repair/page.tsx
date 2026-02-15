import Page from "@/context/page-context";
import { Card, Badge } from "react-daisyui";
import { useBlockErrors, useLaunchRepair } from "./hooks";
import { Wrench, AlertTriangle, RefreshCw, Play } from "lucide-react";
import Button from "@/components/ui/button";
import { toast } from "sonner";
import { handleError } from "@/lib/utils";
import { useState } from "react";

const repairTypes = [
  { value: "blocks", label: "Blocks", description: "Verify and repair data blocks" },
  { value: "versions", label: "Versions", description: "Repair object version tables" },
  { value: "multipartUploads", label: "Multipart Uploads", description: "Clean up incomplete multipart uploads" },
  { value: "blockRefs", label: "Block References", description: "Repair block reference counters" },
  { value: "blockRc", label: "Block RC", description: "Repair block reference counts" },
  { value: "rebalance", label: "Rebalance", description: "Rebalance data across nodes" },
  { value: "scrub", label: "Scrub", description: "Scrub all data blocks for integrity" },
];

const RepairPage = () => {
  const { data: errors, isLoading, refetch } = useBlockErrors();
  const launchRepair = useLaunchRepair();
  const [launching, setLaunching] = useState<string | null>(null);

  const handleRepair = async (type: string) => {
    setLaunching(type);
    try {
      await launchRepair.mutateAsync(type);
      toast.success(`Repair operation '${type}' launched successfully`);
    } catch (err) {
      handleError(err);
    } finally {
      setLaunching(null);
    }
  };

  return (
    <div className="container">
      <Page title="Repair Operations" />

      <Card>
        <Card.Body>
          <Card.Title className="flex items-center gap-2">
            <Wrench size={20} />
            Launch Repair
          </Card.Title>
          <p className="text-sm text-base-content/60 mt-1">
            Launch background repair operations on the Garage cluster.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {repairTypes.map((type) => (
              <div key={type.value} className="bg-base-200 rounded-box p-4">
                <h3 className="font-medium">{type.label}</h3>
                <p className="text-xs text-base-content/60 mt-1">{type.description}</p>
                <Button
                  icon={Play}
                  size="sm"
                  color="primary"
                  className="mt-3"
                  onClick={() => handleRepair(type.value)}
                  disabled={launching !== null}
                >
                  {launching === type.value ? "Launching..." : "Launch"}
                </Button>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>

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

          {isLoading && <p className="mt-4">Loading...</p>}

          {!isLoading && (!errors || errors.length === 0) && (
            <p className="text-sm text-base-content/60 mt-4">No block errors found.</p>
          )}

          {errors && errors.length > 0 && (
            <div className="overflow-x-auto mt-4">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Block Hash</th>
                    <th>Bucket</th>
                    <th>Key</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((err: any, idx: number) => (
                    <tr key={idx}>
                      <td>
                        <code className="text-xs">{err.blockHash?.substring(0, 24)}...</code>
                      </td>
                      <td>{err.refererObj?.bucket || "-"}</td>
                      <td>{err.refererObj?.key || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default RepairPage;
