import Page from "@/context/page-context";
import { Card, Badge } from "react-daisyui";
import { useWorkerList } from "./hooks";
import { Activity, RefreshCw } from "lucide-react";
import Button from "@/components/ui/button";

const WorkersPage = () => {
  const { data, isLoading, refetch } = useWorkerList();

  return (
    <div className="container">
      <Page
        title="Workers"
        actions={
          <Button icon={RefreshCw} color="ghost" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        }
      />

      {isLoading && <p>Loading...</p>}

      {data && (
        <div className="space-y-4">
          {Object.entries(data.freeform || {}).length > 0 ? (
            <Card>
              <Card.Body>
                <Card.Title className="flex items-center gap-2">
                  <Activity size={20} />
                  Node Statistics
                </Card.Title>
                <div className="overflow-x-auto mt-4">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.freeform).map(([key, value]) => (
                        <tr key={key}>
                          <td className="font-medium">{key}</td>
                          <td><code>{String(value)}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </Card>
          ) : (
            <Card>
              <Card.Body>
                <Card.Title className="flex items-center gap-2">
                  <Activity size={20} />
                  Node Information
                </Card.Title>
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Garage Version</span>
                    <span className="font-medium">{data.garageVersion || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Rust Version</span>
                    <span className="font-medium">{data.rustVersion || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">DB Engine</span>
                    <span className="font-medium">{data.dbEngine || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Features</span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {(data.garageFeatures || []).map((f: string) => (
                        <Badge key={f} size="sm">{f}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}

          {data.nodes && (
            <Card>
              <Card.Body>
                <Card.Title>Connected Nodes</Card.Title>
                <div className="overflow-x-auto mt-4">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Hostname</th>
                        <th>Address</th>
                        <th>Status</th>
                        <th>Last Seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.nodes.map((node: any) => (
                        <tr key={node.id}>
                          <td className="font-medium">{node.hostname}</td>
                          <td><code className="text-sm">{node.addr}</code></td>
                          <td>
                            <Badge color={node.isUp ? "success" : "error"}>
                              {node.isUp ? "Online" : "Offline"}
                            </Badge>
                          </td>
                          <td>
                            {node.lastSeenSecsAgo != null
                              ? `${node.lastSeenSecsAgo}s ago`
                              : node.isUp ? "Now" : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkersPage;
