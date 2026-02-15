import { useState } from "react";
import { Button, Card, Input, Badge } from "react-daisyui";
import { Plus, Pencil, Trash2, Save, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useBucketContext } from "../context";
import { useCorsConfig, useUpdateCors, useDeleteCors } from "./hooks";
import { CorsRule } from "./types";

const HTTP_METHODS = ["GET", "PUT", "POST", "DELETE", "HEAD"] as const;

const defaultRule: CorsRule = {
  allowedOrigins: ["*"],
  allowedMethods: ["GET"],
  allowedHeaders: [],
  exposeHeaders: [],
  maxAgeSeconds: 3600,
};

const parseList = (value: string): string[] =>
  value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const formatList = (values: string[]): string => values.join(", ");

type RuleFormProps = {
  rule: CorsRule;
  onSave: (rule: CorsRule) => void;
  onCancel: () => void;
  saving?: boolean;
};

const RuleForm = ({ rule, onSave, onCancel, saving }: RuleFormProps) => {
  const [origins, setOrigins] = useState(formatList(rule.allowedOrigins));
  const [methods, setMethods] = useState<string[]>(rule.allowedMethods);
  const [headers, setHeaders] = useState(formatList(rule.allowedHeaders));
  const [exposeHeaders, setExposeHeaders] = useState(
    formatList(rule.exposeHeaders)
  );
  const [maxAge, setMaxAge] = useState(rule.maxAgeSeconds);

  const toggleMethod = (method: string) => {
    setMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedOrigins = parseList(origins);
    if (parsedOrigins.length === 0) {
      toast.error("At least one origin is required");
      return;
    }
    if (methods.length === 0) {
      toast.error("At least one HTTP method is required");
      return;
    }
    onSave({
      allowedOrigins: parsedOrigins,
      allowedMethods: methods,
      allowedHeaders: parseList(headers),
      exposeHeaders: parseList(exposeHeaders),
      maxAgeSeconds: maxAge,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">
          <span className="label-text font-medium">Allowed Origins</span>
        </label>
        <Input
          className="w-full"
          placeholder="https://example.com, https://app.example.com"
          value={origins}
          onChange={(e) => setOrigins(e.target.value)}
        />
        <label className="label">
          <span className="label-text-alt">
            Comma-separated list of origins. Use * for all origins.
          </span>
        </label>
      </div>

      <div>
        <label className="label">
          <span className="label-text font-medium">Allowed Methods</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {HTTP_METHODS.map((method) => (
            <Badge
              key={method}
              className={`cursor-pointer select-none px-3 py-2 ${
                methods.includes(method)
                  ? "badge-primary"
                  : "badge-ghost opacity-50"
              }`}
              onClick={() => toggleMethod(method)}
            >
              {method}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <label className="label">
          <span className="label-text font-medium">Allowed Headers</span>
        </label>
        <Input
          className="w-full"
          placeholder="Content-Type, Authorization"
          value={headers}
          onChange={(e) => setHeaders(e.target.value)}
        />
        <label className="label">
          <span className="label-text-alt">
            Comma-separated list of headers allowed in requests.
          </span>
        </label>
      </div>

      <div>
        <label className="label">
          <span className="label-text font-medium">Expose Headers</span>
        </label>
        <Input
          className="w-full"
          placeholder="ETag, x-amz-request-id"
          value={exposeHeaders}
          onChange={(e) => setExposeHeaders(e.target.value)}
        />
        <label className="label">
          <span className="label-text-alt">
            Comma-separated list of headers exposed to the browser.
          </span>
        </label>
      </div>

      <div>
        <label className="label">
          <span className="label-text font-medium">Max Age (seconds)</span>
        </label>
        <Input
          type="number"
          className="w-full"
          min={0}
          value={maxAge}
          onChange={(e) => setMaxAge(Number(e.target.value))}
        />
        <label className="label">
          <span className="label-text-alt">
            How long the browser should cache the preflight response.
          </span>
        </label>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" size="sm" color="ghost" onClick={onCancel}>
          <X size={16} />
          Cancel
        </Button>
        <Button type="submit" size="sm" color="primary" disabled={saving}>
          <Save size={16} />
          Save
        </Button>
      </div>
    </form>
  );
};

type RuleCardProps = {
  rule: CorsRule;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
};

const RuleCard = ({ rule, index, onEdit, onDelete }: RuleCardProps) => {
  return (
    <Card className="card-body gap-3">
      <div className="flex items-center justify-between">
        <Card.Title className="text-base">Rule {index + 1}</Card.Title>
        <div className="flex gap-1">
          <Button size="sm" color="ghost" onClick={onEdit}>
            <Pencil size={16} />
          </Button>
          <Button
            size="sm"
            color="ghost"
            className="text-error"
            onClick={onDelete}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="font-medium text-base-content/60">Origins</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {rule.allowedOrigins.map((origin, i) => (
              <Badge key={i} color="ghost" size="sm">
                {origin}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <p className="font-medium text-base-content/60">Methods</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {rule.allowedMethods.map((method, i) => (
              <Badge key={i} color="primary" size="sm">
                {method}
              </Badge>
            ))}
          </div>
        </div>

        {rule.allowedHeaders.length > 0 && (
          <div>
            <p className="font-medium text-base-content/60">Allowed Headers</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {rule.allowedHeaders.map((header, i) => (
                <Badge key={i} color="ghost" size="sm">
                  {header}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {rule.exposeHeaders.length > 0 && (
          <div>
            <p className="font-medium text-base-content/60">Expose Headers</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {rule.exposeHeaders.map((header, i) => (
                <Badge key={i} color="ghost" size="sm">
                  {header}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="font-medium text-base-content/60">Max Age</p>
          <p className="mt-1">{rule.maxAgeSeconds}s</p>
        </div>
      </div>
    </Card>
  );
};

const CorsTab = () => {
  const { bucket } = useBucketContext();
  const { data: rules, isLoading } = useCorsConfig(bucket?.id);
  const updateCors = useUpdateCors(bucket?.id);
  const deleteCors = useDeleteCors(bucket?.id);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const currentRules = rules || [];

  const handleSaveRule = (rule: CorsRule, index?: number) => {
    const updated = [...currentRules];
    if (index !== undefined) {
      updated[index] = rule;
    } else {
      updated.push(rule);
    }
    updateCors.mutate(updated, {
      onSuccess: () => {
        toast.success(
          index !== undefined ? "CORS rule updated" : "CORS rule added"
        );
        setEditingIndex(null);
        setAdding(false);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleDeleteRule = (index: number) => {
    const updated = currentRules.filter((_, i) => i !== index);
    if (updated.length === 0) {
      deleteCors.mutate(undefined, {
        onSuccess: () => toast.success("CORS configuration deleted"),
        onError: (err) => toast.error(err.message),
      });
    } else {
      updateCors.mutate(updated, {
        onSuccess: () => toast.success("CORS rule deleted"),
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const handleDeleteAll = () => {
    deleteCors.mutate(undefined, {
      onSuccess: () => toast.success("All CORS rules deleted"),
      onError: (err) => toast.error(err.message),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">CORS Configuration</h3>
          <p className="text-sm text-base-content/60">
            Configure Cross-Origin Resource Sharing rules for this bucket.
          </p>
        </div>
        <div className="flex gap-2">
          {currentRules.length > 0 && (
            <Button
              size="sm"
              color="error"
              variant="outline"
              onClick={handleDeleteAll}
              disabled={deleteCors.isPending}
            >
              <Trash2 size={16} />
              Delete All
            </Button>
          )}
          <Button
            size="sm"
            color="primary"
            onClick={() => {
              setAdding(true);
              setEditingIndex(null);
            }}
            disabled={adding}
          >
            <Plus size={16} />
            Add Rule
          </Button>
        </div>
      </div>

      {currentRules.length === 0 && !adding && (
        <Card className="card-body items-center text-center py-12">
          <AlertTriangle size={32} className="text-base-content/30" />
          <p className="text-base-content/60 mt-2">
            No CORS rules configured for this bucket.
          </p>
          <Button
            size="sm"
            color="primary"
            className="mt-4"
            onClick={() => setAdding(true)}
          >
            <Plus size={16} />
            Add Rule
          </Button>
        </Card>
      )}

      {currentRules.map((rule, index) =>
        editingIndex === index ? (
          <Card key={index} className="card-body">
            <Card.Title className="text-base">
              Edit Rule {index + 1}
            </Card.Title>
            <RuleForm
              rule={rule}
              onSave={(r) => handleSaveRule(r, index)}
              onCancel={() => setEditingIndex(null)}
              saving={updateCors.isPending}
            />
          </Card>
        ) : (
          <RuleCard
            key={index}
            rule={rule}
            index={index}
            onEdit={() => {
              setEditingIndex(index);
              setAdding(false);
            }}
            onDelete={() => handleDeleteRule(index)}
          />
        )
      )}

      {adding && (
        <Card className="card-body">
          <Card.Title className="text-base">New Rule</Card.Title>
          <RuleForm
            rule={defaultRule}
            onSave={(r) => handleSaveRule(r)}
            onCancel={() => setAdding(false)}
            saving={updateCors.isPending}
          />
        </Card>
      )}
    </div>
  );
};

export default CorsTab;
