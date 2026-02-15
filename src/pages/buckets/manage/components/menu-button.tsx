import Button from "@/components/ui/button";
import { EllipsisVertical, Trash, Trash2 } from "lucide-react";
import { Dropdown, Loading, Modal } from "react-daisyui";
import { useNavigate, useParams } from "react-router-dom";
import { useForceDeleteBucket, useRemoveBucket } from "../hooks";
import { toast } from "sonner";
import { handleError } from "@/lib/utils";
import { useBucketContext } from "../context";
import { useDisclosure } from "@/hooks/useDisclosure";

const MenuButton = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bucket } = useBucketContext();
  const forceDeleteDialog = useDisclosure();

  const onDeleteSuccess = () => {
    toast.success("Bucket removed!");
    navigate("/buckets", { replace: true });
  };

  const removeBucket = useRemoveBucket({
    onSuccess: onDeleteSuccess,
    onError: handleError,
  });

  const forceDeleteBucket = useForceDeleteBucket({
    onSuccess: onDeleteSuccess,
    onError: (err) => {
      forceDeleteDialog.onClose();
      handleError(err);
    },
  });

  const onRemove = () => {
    if (bucket.objects > 0) {
      forceDeleteDialog.onOpen();
    } else {
      if (window.confirm("Are you sure you want to remove this bucket?")) {
        removeBucket.mutate(id!);
      }
    }
  };

  const onForceDelete = () => {
    forceDeleteBucket.mutate(id!);
  };

  return (
    <>
      <Dropdown end>
        <Dropdown.Toggle button={false}>
          <Button icon={EllipsisVertical} color="ghost" />
        </Dropdown.Toggle>

        <Dropdown.Menu>
          <Dropdown.Item onClick={onRemove} className="bg-error/10 text-error">
            <Trash /> Remove
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>

      <Modal
        ref={forceDeleteDialog.dialogRef}
        open={forceDeleteDialog.isOpen}
        backdrop
      >
        <Modal.Header>Delete Bucket</Modal.Header>
        <Modal.Body>
          {forceDeleteBucket.isPending ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loading size="lg" />
              <p className="text-center">
                Deleting all objects and removing bucket...
                <br />
                <span className="text-sm text-base-content/60">
                  This may take a while for large buckets.
                </span>
              </p>
            </div>
          ) : (
            <>
              <p>
                This bucket contains{" "}
                <strong>{bucket.objects.toLocaleString()} object(s)</strong>. It
                must be emptied before it can be deleted.
              </p>
              <p className="mt-2 text-warning">
                This will permanently delete all objects in the bucket and then
                remove the bucket itself. This action cannot be undone.
              </p>
            </>
          )}
        </Modal.Body>

        {!forceDeleteBucket.isPending && (
          <Modal.Actions>
            <Button onClick={forceDeleteDialog.onClose}>Cancel</Button>
            <Button color="error" onClick={onForceDelete}>
              <Trash2 size={16} /> Delete All & Remove
            </Button>
          </Modal.Actions>
        )}
      </Modal>
    </>
  );
};

export default MenuButton;
