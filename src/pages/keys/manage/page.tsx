import { useParams, Link } from "react-router-dom";
import { useKey, useUpdateKey } from "./hooks";
import Page from "@/context/page-context";
import { Card, Input, Loading, Table, Alert, Badge } from "react-daisyui";
import { CircleXIcon, Copy, Eye, EyeOff, Check, Pencil } from "lucide-react";
import Button from "@/components/ui/button";
import { copyToClipboard, handleError } from "@/lib/utils";
import { useState, useCallback } from "react";
import { toast } from "sonner";

const ManageKeyPage = () => {
  const { id } = useParams();
  const { data, error, isLoading, refetch } = useKey(id);
  const [showSecret, setShowSecret] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");

  const updateKey = useUpdateKey({
    onSuccess: () => {
      refetch();
      setIsEditing(false);
      toast.success("Key name updated!");
    },
    onError: handleError,
  });

  const startEditing = useCallback(() => {
    if (data) {
      setEditName(data.name);
      setIsEditing(true);
    }
  }, [data]);

  const saveName = useCallback(() => {
    if (id && editName.trim()) {
      updateKey.mutate({ id, name: editName.trim() });
    }
  }, [id, editName, updateKey]);

  return (
    <>
      <Page title={data?.name || "Key Details"} prev="/keys" />

      {isLoading && (
        <div className="h-full flex items-center justify-center">
          <Loading size="lg" />
        </div>
      )}

      {error != null && (
        <Alert status="error" icon={<CircleXIcon />}>
          <span>{error.message}</span>
        </Alert>
      )}

      {data && (
        <div className="container">
          <Card className="card-body p-4">
            <h2 className="card-title text-lg">Key Information</h2>

            <div className="grid gap-4 mt-2">
              {/* Name */}
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium opacity-60">Name</span>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Input
                        size="sm"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveName()}
                      />
                      <Button
                        size="sm"
                        color="success"
                        icon={Check}
                        onClick={saveName}
                        loading={updateKey.isPending}
                      />
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{data.name}</span>
                      <Button
                        size="sm"
                        color="ghost"
                        icon={Pencil}
                        onClick={startEditing}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Access Key ID */}
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium opacity-60">
                  Access Key ID
                </span>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm">{data.accessKeyId}</code>
                  <Button
                    size="sm"
                    color="ghost"
                    icon={Copy}
                    onClick={() => copyToClipboard(data.accessKeyId)}
                  />
                </div>
              </div>

              {/* Secret Key */}
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium opacity-60">
                  Secret Access Key
                </span>
                <div className="flex items-center gap-2">
                  {showSecret ? (
                    <code className="font-mono text-sm">
                      {data.secretAccessKey}
                    </code>
                  ) : (
                    <span className="font-mono text-sm">{"*".repeat(24)}</span>
                  )}
                  <Button
                    size="sm"
                    color="ghost"
                    icon={showSecret ? EyeOff : Eye}
                    onClick={() => setShowSecret((prev) => !prev)}
                  />
                  <Button
                    size="sm"
                    color="ghost"
                    icon={Copy}
                    onClick={() => copyToClipboard(data.secretAccessKey)}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Bucket Associations */}
          <Card className="card-body mt-4 p-4">
            <h2 className="card-title text-lg">Bucket Access</h2>

            {data.buckets.length === 0 ? (
              <p className="opacity-60 mt-2">
                This key does not have access to any buckets.
              </p>
            ) : (
              <div className="w-full overflow-x-auto mt-2">
                <Table zebra>
                  <Table.Head>
                    <span>Bucket</span>
                    <span>Permissions</span>
                  </Table.Head>

                  <Table.Body>
                    {data.buckets.map((bucket) => {
                      const name =
                        bucket.globalAliases?.[0] ||
                        bucket.localAliases?.[0] ||
                        bucket.id;

                      return (
                        <Table.Row key={bucket.id}>
                          <span>
                            <Link
                              to={`/buckets/${bucket.id}`}
                              className="link link-primary"
                            >
                              {name}
                            </Link>
                          </span>
                          <div className="flex gap-1 flex-wrap">
                            {bucket.permissions.read && (
                              <Badge color="success" size="sm">
                                read
                              </Badge>
                            )}
                            {bucket.permissions.write && (
                              <Badge color="warning" size="sm">
                                write
                              </Badge>
                            )}
                            {bucket.permissions.owner && (
                              <Badge color="info" size="sm">
                                owner
                              </Badge>
                            )}
                          </div>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
};

export default ManageKeyPage;
