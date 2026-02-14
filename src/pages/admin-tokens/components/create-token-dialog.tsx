import Button from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Modal, Textarea } from "react-daisyui";
import { useForm } from "react-hook-form";
import { useDisclosure } from "@/hooks/useDisclosure";
import {
  createAdminTokenSchema,
  CreateAdminTokenSchema,
} from "../schema";
import { InputField } from "@/components/ui/input";
import FormControl from "@/components/ui/form-control";
import { useCreateAdminToken } from "../hooks";
import { useQueryClient } from "@tanstack/react-query";
import { handleError } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect } from "react";

const CreateTokenDialog = () => {
  const { dialogRef, isOpen, onOpen, onClose } = useDisclosure();
  const form = useForm<CreateAdminTokenSchema>({
    resolver: zodResolver(createAdminTokenSchema),
    defaultValues: { name: "", expiration: "", scope: "" },
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) form.setFocus("name");
  }, [isOpen]);

  const createToken = useCreateAdminToken({
    onSuccess: () => {
      onClose();
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["admin-tokens"] });
      toast.success("Admin token created!");
    },
    onError: handleError,
  });

  const onSubmit = form.handleSubmit((values) => {
    createToken.mutate(values);
  });

  return (
    <>
      <Button icon={Plus} color="primary" onClick={onOpen}>
        Create Token
      </Button>

      <Modal ref={dialogRef} backdrop open={isOpen}>
        <Modal.Header className="mb-1">Create Admin Token</Modal.Header>
        <Modal.Body>
          <p>Enter the details for the new admin token.</p>

          <form onSubmit={onSubmit}>
            <InputField form={form} name="name" title="Token Name" />
            <InputField
              form={form}
              name="expiration"
              title="Expiration Date (optional)"
              type="datetime-local"
            />
            <FormControl
              form={form}
              name="scope"
              title="Scope (optional, comma-separated endpoints)"
              render={(field) => (
                <Textarea
                  {...field}
                  placeholder="e.g. ListBuckets, GetBucketInfo"
                  className="textarea-bordered"
                  rows={3}
                />
              )}
            />
          </form>
        </Modal.Body>

        <Modal.Actions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            color="primary"
            disabled={createToken.isPending}
            onClick={onSubmit}
          >
            Submit
          </Button>
        </Modal.Actions>
      </Modal>
    </>
  );
};

export default CreateTokenDialog;
