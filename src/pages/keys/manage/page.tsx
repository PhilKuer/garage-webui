import { useParams, Link } from "react-router-dom";
import { useKeyInfo, useUpdateKey } from "./hooks";
import Page from "@/context/page-context";
import { Alert, Badge, Card, Loading, Table, Toggle } from "react-daisyui";
import {
  CircleXIcon,
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Save,
  X,
} from "lucide-react";
import Button from "@/components/ui/button";
import { useCallback, useState } from "react";
import { copyToClipboard, handleError } from "@/lib/utils";
import { toast } from "sonner";

const ManageKeyPage = () => {
  const { id } = useParams();
  const { data, error, isLoading, refetch } = useKeyInfo(id);

  const [showSecret, setShowSecret] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");

  const updateKey = useUpdateKey({
    onSuccess: () => {
      refetch();
      setEditingName(false);
      toast.success("Key updated!");
    },
    onError: handleError,
  });

  const handleEditName = useCallback(() => {
    if (data) {
      setName(data.name);
      setEditingName(true);
    }
  }, [data]);

  const handleSaveName = useCallback(() => {
    updateKey.mutate({ id, name });
  }, [id, name, updateKey]);

  const handleTogglePermission = useCallback(
    (permission: string, value: boolean) => {
      updateKey.mutate({
        id,
        allow: value ? { [permission]: true } : {},
        deny: value ? {} : { [permission]: true },
      });
    },
    [id, updateKey]
  );

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
        <div className="container flex flex-col gap-4">
          {/* Key Info Card */}
          <Card className="card-body p-4">
            <h2 className="card-title text-lg">Key Information</h2>

            <div className="flex flex-col gap-3 mt-2">
              {/* Name */}
              <div className="flex flex-row items-center gap-2">
                <span className="font-semibold w-36 shrink-0">Name</span>
                {editingName ? (
                  <div className="flex flex-row items-center gap-2">
                    <input
                      type="text"
                      className="input input-bordered input-sm"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <Button
                      size="sm"
                      color="success"
                      icon={Save}
                      onClick={handleSaveName}
                      loading={updateKey.isPending}
                    />
                    <Button
                      size="sm"
                      color="ghost"
                      icon={X}
                      onClick={() => setEditingName(false)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-row items-center gap-2">
                    <span>{data.name || "Unnamed key"}</span>
                    <Button
                      size="sm"
                      color="ghost"
                      icon={Pencil}
                      onClick={handleEditName}
                    />
                  </div>
                )}
              </div>

              {/* Access Key ID */}
              <div className="flex flex-row items-center gap-2">
                <span className="font-semibold w-36 shrink-0">
                  Access Key ID
                </span>
                <code className="font-mono text-sm">{data.accessKeyId}</code>
                <Button
                  size="sm"
                  color="ghost"
                  icon={Copy}
                  onClick={() => copyToClipboard(data.accessKeyId)}
                />
              </div>

              {/* Secret Access Key */}
              <div className="flex flex-row items-center gap-2">
                <span className="font-semibold w-36 shrink-0">
                  Secret Key
                </span>
                {showSecret ? (
                  <>
                    <code className="font-mono text-sm">
                      {data.secretAccessKey}
                    </code>
                    <Button
                      size="sm"
                      color="ghost"
                      icon={Copy}
                      onClick={() => copyToClipboard(data.secretAccessKey)}
                    />
                    <Button
                      size="sm"
                      color="ghost"
                      icon={EyeOff}
                      onClick={() => setShowSecret(false)}
                    />
                  </>
                ) : (
                  <Button
                    size="sm"
                    icon={Eye}
                    onClick={() => setShowSecret(true)}
                  >
                    Reveal
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Permissions Card */}
          <Card className="card-body p-4">
            <h2 className="card-title text-lg">Permissions</h2>

            <div className="flex flex-col gap-3 mt-2">
              <div className="flex flex-row items-center gap-3">
                <Toggle
                  checked={data.permissions.createBucket}
                  onChange={(e) =>
                    handleTogglePermission("createBucket", e.target.checked)
                  }
                  color="primary"
                />
                <div>
                  <span className="font-semibold">Create Bucket</span>
                  <p className="text-sm opacity-60">
                    Allow this key to create new buckets.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Associated Buckets Card */}
          <Card className="card-body p-4">
            <h2 className="card-title text-lg">Bucket Access</h2>

            {data.buckets.length === 0 ? (
              <p className="text-sm opacity-60 mt-2">
                This key is not associated with any buckets.
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
                      const bucketName =
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
                              {bucketName}
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
