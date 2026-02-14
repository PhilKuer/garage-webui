import Button from "@/components/ui/button";
import Page from "@/context/page-context";
import { Copy, Trash } from "lucide-react";
import { Card, Input, Table } from "react-daisyui";
import { useAdminTokens, useDeleteAdminToken } from "./hooks";
import CreateTokenDialog from "./components/create-token-dialog";
import { toast } from "sonner";
import { copyToClipboard, dayjs, handleError } from "@/lib/utils";
import { useMemo, useState } from "react";

const AdminTokensPage = () => {
  const { data, refetch } = useAdminTokens();
  const [search, setSearch] = useState("");

  const deleteToken = useDeleteAdminToken({
    onSuccess: () => {
      refetch();
      toast.success("Token deleted!");
    },
    onError: handleError,
  });

  const onDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this admin token?")) {
      deleteToken.mutate(id);
    }
  };

  const items = useMemo(() => {
    if (!search?.length) {
      return data;
    }

    const q = search.toLowerCase();
    return data?.filter(
      (item) =>
        item.id.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q)
    );
  }, [data, search]);

  const formatDate = (date: string | null) => {
    if (!date) return "Never";
    return dayjs(date).format("YYYY-MM-DD HH:mm");
  };

  const formatScope = (scope: string[] | null) => {
    if (!scope || scope.length === 0) return "Full access";
    return scope.join(", ");
  };

  return (
    <div className="container">
      <Page title="Admin Tokens" />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex-1" />
        <CreateTokenDialog />
      </div>

      <Card className="card-body mt-4 md:mt-8 p-4">
        <div className="w-full overflow-x-auto">
          <Table zebra>
            <Table.Head>
              <span>#</span>
              <span>Name</span>
              <span>Token ID</span>
              <span>Created</span>
              <span>Expiration</span>
              <span>Scope</span>
              <span />
            </Table.Head>

            <Table.Body>
              {items?.map((token, idx) => (
                <Table.Row key={token.id}>
                  <span>{idx + 1}</span>
                  <span>{token.name}</span>
                  <div className="flex flex-row items-center">
                    <p className="truncate max-w-20" title={token.id}>
                      {token.id}
                    </p>
                    <Button
                      size="sm"
                      icon={Copy}
                      onClick={() => copyToClipboard(token.id)}
                    />
                  </div>
                  <span>{formatDate(token.createdAt)}</span>
                  <span>{formatDate(token.expiration)}</span>
                  <span
                    className="truncate max-w-32"
                    title={formatScope(token.scope)}
                  >
                    {formatScope(token.scope)}
                  </span>
                  <span>
                    <Button
                      color="ghost"
                      icon={Trash}
                      onClick={() => onDelete(token.id)}
                    />
                  </span>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default AdminTokensPage;
