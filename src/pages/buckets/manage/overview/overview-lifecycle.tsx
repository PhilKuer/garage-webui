import { useEffect, useState } from "react";
import { useBucketContext } from "../context";
import {
  LifecycleRule,
  useLifecycle,
  useUpdateLifecycle,
} from "../hooks";
import Button from "@/components/ui/button";
import { Plus, Save, Trash } from "lucide-react";
import { toast } from "sonner";
import { handleError } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import Input from "@/components/ui/input";
import { ToggleField } from "@/components/ui/toggle";
import { useForm } from "react-hook-form";

const emptyRule = (): LifecycleRule => ({
  id: "",
  enabled: true,
  prefix: "",
  expirationDays: 30,
  abortIncompleteMultipartDays: 7,
});

const LifecycleSection = () => {
  const { bucketName } = useBucketContext();
  const { data, isLoading } = useLifecycle(bucketName);
  const queryClient = useQueryClient();
  const [rules, setRules] = useState<LifecycleRule[]>([]);
  const [dirty, setDirty] = useState(false);

  const updateLifecycle = useUpdateLifecycle(bucketName, {
    onSuccess: () => {
      toast.success("Lifecycle rules saved!");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["lifecycle", bucketName] });
    },
    onError: handleError,
  });

  useEffect(() => {
    if (data) {
      setRules(data.rules);
      setDirty(false);
    }
  }, [data]);

  const addRule = () => {
    setRules([...rules, emptyRule()]);
    setDirty(true);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
    setDirty(true);
  };

  const updateRule = (index: number, partial: Partial<LifecycleRule>) => {
    setRules(
      rules.map((rule, i) => (i === index ? { ...rule, ...partial } : rule))
    );
    setDirty(true);
  };

  const onSave = () => {
    updateLifecycle.mutate({ rules });
  };

  if (isLoading) return null;

  return (
    <div className="mt-8">
      <div className="flex flex-row items-center gap-2">
        <p className="label label-text py-0 grow">Lifecycle / Expiration</p>
      </div>

      <p className="text-xs text-base-content/60 mt-1">
        Automatically delete objects after a set number of days.
      </p>

      {rules.map((rule, index) => (
        <LifecycleRuleRow
          key={index}
          rule={rule}
          index={index}
          onChange={(partial) => updateRule(index, partial)}
          onRemove={() => removeRule(index)}
        />
      ))}

      <div className="flex flex-row gap-2 mt-3">
        <Button size="sm" onClick={addRule} icon={Plus}>
          Add Rule
        </Button>
        {dirty && (
          <Button
            size="sm"
            color="primary"
            onClick={onSave}
            icon={Save}
            loading={updateLifecycle.isPending}
          >
            Save
          </Button>
        )}
      </div>
    </div>
  );
};

type RuleRowProps = {
  rule: LifecycleRule;
  index: number;
  onChange: (partial: Partial<LifecycleRule>) => void;
  onRemove: () => void;
};

const LifecycleRuleRow = ({ rule, index, onChange, onRemove }: RuleRowProps) => {
  const form = useForm({ defaultValues: { enabled: rule.enabled } });

  useEffect(() => {
    form.reset({ enabled: rule.enabled });
  }, [rule.enabled]);

  useEffect(() => {
    const { unsubscribe } = form.watch((values) => {
      if (values.enabled !== undefined) {
        onChange({ enabled: values.enabled });
      }
    });
    return unsubscribe;
  }, []);

  return (
    <div className="border border-base-300 rounded-lg p-3 mt-3">
      <div className="flex flex-row items-center gap-2 mb-2">
        <span className="text-sm font-medium flex-1">
          Rule {index + 1}
          {rule.id ? `: ${rule.id}` : ""}
        </span>
        <ToggleField form={form} name="enabled" label="Enabled" />
        <Button
          size="sm"
          color="ghost"
          onClick={onRemove}
          className="text-error"
        >
          <Trash size={14} />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="label label-text text-xs py-0">
            Prefix Filter
          </label>
          <Input
            size="sm"
            value={rule.prefix}
            onChange={(e) => onChange({ prefix: e.target.value })}
            placeholder="e.g. logs/ (empty = all)"
          />
        </div>

        <div>
          <label className="label label-text text-xs py-0">
            Expire After (days)
          </label>
          <Input
            size="sm"
            type="number"
            min={1}
            value={rule.expirationDays ?? ""}
            onChange={(e) =>
              onChange({
                expirationDays: e.target.value
                  ? parseInt(e.target.value)
                  : null,
              })
            }
            placeholder="e.g. 30"
          />
        </div>

        <div>
          <label className="label label-text text-xs py-0">
            Abort Incomplete Uploads (days)
          </label>
          <Input
            size="sm"
            type="number"
            min={1}
            value={rule.abortIncompleteMultipartDays ?? ""}
            onChange={(e) =>
              onChange({
                abortIncompleteMultipartDays: e.target.value
                  ? parseInt(e.target.value)
                  : null,
              })
            }
            placeholder="e.g. 7"
          />
        </div>
      </div>
    </div>
  );
};

export default LifecycleSection;
