import { Alert, Checkbox, Loading, Table } from "react-daisyui";
import { useBrowseObjects } from "./hooks";
import { dayjs, readableBytes } from "@/lib/utils";
import mime from "mime/lite";
import { Object } from "./types";
import { API_URL } from "@/lib/api";
import {
  CircleXIcon,
  FileArchive,
  FileIcon,
  FileType,
  Folder,
} from "lucide-react";
import { useBucketContext } from "../context";
import ObjectActions from "./object-actions";
import GotoTopButton from "@/components/ui/goto-top-btn";

type Props = {
  prefix?: string;
  onPrefixChange?: (prefix: string) => void;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
};

const ObjectList = ({
  prefix,
  onPrefixChange,
  selectedKeys,
  onSelectionChange,
}: Props) => {
  const { bucketName } = useBucketContext();
  const { data, error, isLoading } = useBrowseObjects(bucketName, {
    prefix,
    limit: 1000,
  });

  const onObjectClick = (object: Object) => {
    window.open(API_URL + object.url + "?view=1", "_blank");
  };

  const allItems = [
    ...(data?.prefixes?.map((p) => p) || []),
    ...(data?.objects?.map((o) => (data?.prefix || "") + o.objectKey) || []),
  ];

  const allSelected =
    allItems.length > 0 &&
    selectedKeys != null &&
    allItems.every((key) => selectedKeys.has(key));

  const someSelected =
    !allSelected &&
    selectedKeys != null &&
    allItems.some((key) => selectedKeys.has(key));

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allItems));
    }
  };

  const toggleSelect = (key: string) => {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onSelectionChange(next);
  };

  const selectable = !!onSelectionChange;

  return (
    <div className="overflow-x-auto min-h-[400px]">
      <Table>
        <Table.Head>
          {selectable && (
            <span className="w-8">
              <Checkbox
                size="sm"
                checked={allSelected}
                indeterminate={someSelected}
                onChange={toggleSelectAll}
                disabled={allItems.length === 0}
              />
            </span>
          )}
          <span>Name</span>
          <span>Size</span>
          <span>Last Modified</span>
        </Table.Head>

        <Table.Body>
          {isLoading ? (
            <tr>
              <td colSpan={selectable ? 4 : 3}>
                <div className="h-[320px] flex items-center justify-center">
                  <Loading />
                </div>
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={selectable ? 4 : 3}>
                <Alert status="error" icon={<CircleXIcon />}>
                  <span>{error.message}</span>
                </Alert>
              </td>
            </tr>
          ) : !data?.prefixes?.length && !data?.objects?.length ? (
            <tr>
              <td className="text-center py-16" colSpan={selectable ? 4 : 3}>
                No objects
              </td>
            </tr>
          ) : null}

          {data?.prefixes?.map((prefixItem) => {
            const isChecked = selectedKeys?.has(prefixItem) ?? false;
            return (
              <tr
                key={prefixItem}
                className="hover:bg-neutral/60 hover:text-neutral-content group"
              >
                {selectable && (
                  <td className="w-8">
                    <Checkbox
                      size="sm"
                      checked={isChecked}
                      onChange={() => toggleSelect(prefixItem)}
                    />
                  </td>
                )}
                <td
                  className="cursor-pointer"
                  role="button"
                  onClick={() => onPrefixChange?.(prefixItem)}
                >
                  <span className="flex items-center gap-2 font-normal">
                    <Folder size={20} className="text-primary" />
                    {prefixItem
                      .substring(0, prefixItem.lastIndexOf("/"))
                      .split("/")
                      .pop()}
                  </span>
                </td>
                <td colSpan={2} />
                <ObjectActions object={{ objectKey: prefixItem, url: "" }} />
              </tr>
            );
          })}

          {data?.objects?.map((object, idx) => {
            const fullKey = (data?.prefix || "") + object.objectKey;
            const isChecked = selectedKeys?.has(fullKey) ?? false;
            const extIdx = object.objectKey.lastIndexOf(".");
            const filename =
              extIdx >= 0
                ? object.objectKey.substring(0, extIdx)
                : object.objectKey;
            const ext = extIdx >= 0 ? object.objectKey.substring(extIdx) : null;

            return (
              <tr
                key={object.objectKey}
                className="hover:bg-neutral/60 hover:text-neutral-content group"
              >
                {selectable && (
                  <td className="w-8">
                    <Checkbox
                      size="sm"
                      checked={isChecked}
                      onChange={() => toggleSelect(fullKey)}
                    />
                  </td>
                )}
                <td
                  className="cursor-pointer"
                  role="button"
                  onClick={() => onObjectClick(object)}
                >
                  <span className="flex items-center font-normal w-full">
                    <FilePreview ext={ext?.substring(1)} object={object} />
                    <span className="truncate max-w-[40vw]">{filename}</span>
                    {ext && <span className="text-base-content/60">{ext}</span>}
                  </span>
                </td>
                <td className="whitespace-nowrap">
                  {readableBytes(object.size)}
                </td>
                <td className="whitespace-nowrap">
                  {dayjs(object.lastModified).fromNow()}
                </td>
                <ObjectActions
                  prefix={data.prefix}
                  object={object}
                  end={
                    idx >= data.objects.length - 2 && data.objects.length > 5
                  }
                />
              </tr>
            );
          })}
        </Table.Body>
      </Table>

      <GotoTopButton />
    </div>
  );
};

type FilePreviewProps = {
  ext?: string | null;
  object: Object;
};

const FilePreview = ({ ext, object }: FilePreviewProps) => {
  const type = mime.getType(ext || "")?.split("/")[0];
  let Icon = FileIcon;

  if (
    ["zip", "rar", "7z", "iso", "tar", "gz", "bz2", "xz"].includes(ext || "")
  ) {
    Icon = FileArchive;
  }

  if (type === "image") {
    const thumbnailSupport = ["jpg", "jpeg", "png", "gif"].includes(ext || "");
    return (
      <img
        src={API_URL + object.url + (thumbnailSupport ? "?thumb=1" : "?view=1")}
        alt={object.objectKey}
        className="size-5 object-cover overflow-hidden mr-2"
      />
    );
  }

  if (type === "text") {
    Icon = FileType;
  }

  return (
    <Icon
      size={20}
      className="text-base-content/60 group-hover:text-neutral-content/80 mr-2"
    />
  );
};

export default ObjectList;
