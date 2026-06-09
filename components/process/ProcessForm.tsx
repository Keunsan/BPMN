"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { MultiLangInput, type MultiLangValue } from "@/components/common/MultiLangInput";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateProcess,
  useUpdateProcess,
} from "@/lib/query/hooks/useProcess";
import { useRouter } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import type { ProcessNodeDto, ProcessStatus } from "@/types/process";

const statusOptions: ProcessStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "OBSOLETE",
];

type ProcessFormProps = {
  initialData?: ProcessNodeDto;
  mode: "create" | "edit";
  parentId?: number | null;
  layout?: "page" | "panel";
  onCancel?: () => void;
  onSuccess?: (node: ProcessNodeDto) => void;
};

/** 프로세스 등록/수정 폼 */
export const ProcessForm = ({
  initialData,
  mode,
  parentId: parentIdProp = null,
  layout = "page",
  onCancel,
  onSuccess,
}: ProcessFormProps) => {
  const t = useTranslations("process");
  const router = useRouter();

  const [i18n, setI18n] = useState<MultiLangValue>(
    initialData?.i18n ?? {
      ko: {
        name: initialData?.name ?? "",
        description: initialData?.description ?? "",
      },
    },
  );

  const schema = useMemo(
    () =>
      z.object({
        code: z.string().optional(),
        autoCode: z.boolean(),
        status: z.enum([
          "DRAFT",
          "IN_REVIEW",
          "APPROVED",
          "PUBLISHED",
          "OBSOLETE",
        ]),
        version: z.string().optional(),
        isStandard: z.boolean(),
      }),
    [],
  );

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: initialData?.code ?? "",
      autoCode: mode === "create",
      status: initialData?.status ?? "DRAFT",
      version: initialData?.version ?? "1.0.0",
      isStandard: initialData?.isStandard ?? true,
    },
  });

  const createMutation = useCreateProcess();
  const updateMutation = useUpdateProcess(initialData?.nodeId ?? 0);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!i18n.ko?.name?.trim()) {
      form.setError("root", { message: t("koRequired") });
      return;
    }

    const payload = {
      parentNodeId: parentIdProp ?? initialData?.parentNodeId ?? null,
      code: values.autoCode ? undefined : values.code,
      autoCode: values.autoCode,
      name: i18n.ko.name,
      description: i18n.ko.description ?? null,
      status: values.status,
      version: values.version,
      isStandard: values.isStandard,
      i18n,
    };

    if (mode === "create") {
      const result = await createMutation.mutateAsync(payload);
      if (result) {
        if (onSuccess) {
          onSuccess(result);
        } else {
          router.push(`/process/${result.nodeId}`);
        }
      }
    } else if (initialData) {
      const result = await updateMutation.mutateAsync({ ...payload, i18n });
      if (onSuccess && result) {
        onSuccess(result);
      } else {
        router.push(`/process/${initialData.nodeId}`);
      }
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const autoCode = useWatch({ control: form.control, name: "autoCode" });

  return (
    <Form {...form}>
      <form
        onSubmit={onSubmit}
        className={cn(
          "space-y-6 p-6",
          layout === "page" && "mx-auto max-w-2xl",
        )}
      >
        <h1 className="text-2xl font-semibold">
          {mode === "create" ? t("newProcess") : t("editProcess")}
        </h1>

        <MultiLangInput
          label={t("name")}
          value={i18n}
          onChange={setI18n}
          required
          multiline
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="autoCode"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    disabled={mode === "edit"}
                    className="size-4"
                  />
                </FormControl>
                <FormLabel>{t("autoCode")}</FormLabel>
              </FormItem>
            )}
          />

          {!autoCode && (
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("code")}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={mode === "edit"} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("status")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="version"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("version")}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isStandard"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="size-4"
                  />
                </FormControl>
                <FormLabel>{t("isStandard")}</FormLabel>
              </FormItem>
            )}
          />
        </div>

        {form.formState.errors.root && (
          <p className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {t("save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => (onCancel ? onCancel() : router.back())}
          >
            {t("cancel")}
          </Button>
        </div>
      </form>
    </Form>
  );
};
