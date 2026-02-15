import { useSearchParams } from "react-router-dom";
import { Card } from "react-daisyui";

import ObjectList from "./object-list";
import { useCallback, useEffect, useState } from "react";
import ObjectListNavigator from "./object-list-navigator";
import Actions from "./actions";
import { useBucketContext } from "../context";
import ShareDialog from "./share-dialog";
import DropZone from "./drop-zone";
import { useDeleteObject, usePutObject } from "./hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleError } from "@/lib/utils";
import Button from "@/components/ui/button";
import { Trash, X } from "lucide-react";

const getInitialPrefixes = (searchParams: URLSearchParams) => {
  const prefix = searchParams.get("prefix");
  if (prefix) {
    const paths = prefix.split("/").filter((p) => p);
    return paths.map((_, i) => paths.slice(0, i + 1).join("/") + "/");
  }
  return [];
};

const BrowseTab = () => {
  const { bucket, bucketName } = useBucketContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [prefixHistory, setPrefixHistory] = useState<string[]>(
    getInitialPrefixes(searchParams)
  );
  const [curPrefix, setCurPrefix] = useState(prefixHistory.length - 1);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const queryClient = useQueryClient();

  const putObject = usePutObject(bucketName, {
    onSuccess: () => {
      toast.success("File uploaded!");
      queryClient.invalidateQueries({ queryKey: ["browse", bucketName] });
    },
    onError: handleError,
  });

  const deleteObject = useDeleteObject(bucketName, {
    onError: handleError,
  });

  useEffect(() => {
    const prefix = prefixHistory[curPrefix] || "";
    const newParams = new URLSearchParams(searchParams);
    newParams.set("prefix", prefix);
    setSearchParams(newParams);
  }, [curPrefix]);

  // Clear selection when navigating to a different prefix
  useEffect(() => {
    setSelectedKeys(new Set());
  }, [curPrefix]);

  const gotoPrefix = (prefix: string) => {
    const history = prefixHistory.slice(0, curPrefix + 1);
    setPrefixHistory([...history, prefix]);
    setCurPrefix(history.length);
  };

  const handleDrop = useCallback(
    (files: File[]) => {
      if (files.length > 20) {
        toast.error("You can only upload up to 20 files at a time");
        return;
      }

      const prefix = prefixHistory[curPrefix] || "";
      for (const file of files) {
        const key = prefix + file.name;
        putObject.mutate({ key, file });
      }
    },
    [prefixHistory, curPrefix, putObject]
  );

  const handleBatchDelete = async () => {
    if (selectedKeys.size === 0) return;

    const count = selectedKeys.size;
    const confirmed = window.confirm(
      `Are you sure you want to delete ${count} selected item${count > 1 ? "s" : ""}? Directories will be deleted recursively.`
    );
    if (!confirmed) return;

    setIsDeleting(true);

    let successCount = 0;
    let errorCount = 0;

    for (const key of selectedKeys) {
      const isDirectory = key.endsWith("/");
      try {
        await deleteObject.mutateAsync({
          key,
          recursive: isDirectory,
        });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setIsDeleting(false);
    setSelectedKeys(new Set());
    queryClient.invalidateQueries({ queryKey: ["browse", bucketName] });

    if (errorCount === 0) {
      toast.success(`Successfully deleted ${successCount} item${successCount > 1 ? "s" : ""}.`);
    } else {
      toast.error(
        `Deleted ${successCount} item${successCount > 1 ? "s" : ""}, but ${errorCount} failed.`
      );
    }
  };

  if (!bucket.keys.find((k) => k.permissions.read && k.permissions.write)) {
    return (
      <div className="p-4 min-h-[200px] flex flex-col items-center justify-center">
        <p className="text-center max-w-sm">
          You need to add a key with read & write access to your bucket to be
          able to browse it.
        </p>
      </div>
    );
  }

  return (
    <DropZone onDrop={handleDrop}>
      <Card className="pb-2">
        <ObjectListNavigator
          curPrefix={curPrefix}
          setCurPrefix={setCurPrefix}
          prefixHistory={prefixHistory}
          actions={<Actions prefix={prefixHistory[curPrefix] || ""} />}
        />

        <ObjectList
          prefix={prefixHistory[curPrefix] || ""}
          onPrefixChange={gotoPrefix}
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
        />

        {selectedKeys.size > 0 && (
          <div className="sticky bottom-4 mx-4 z-10">
            <div className="flex items-center justify-between gap-4 bg-neutral text-neutral-content rounded-lg px-4 py-3 shadow-lg">
              <span className="text-sm font-medium">
                {selectedKeys.size} item{selectedKeys.size > 1 ? "s" : ""}{" "}
                selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  color="ghost"
                  icon={X}
                  onClick={() => setSelectedKeys(new Set())}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  color="error"
                  icon={Trash}
                  onClick={handleBatchDelete}
                  loading={isDeleting}
                  disabled={isDeleting}
                >
                  Delete Selected
                </Button>
              </div>
            </div>
          </div>
        )}

        <ShareDialog />
      </Card>
    </DropZone>
  );
};

export default BrowseTab;
