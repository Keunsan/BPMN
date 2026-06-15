"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateE2eProcess,
  useUpdateE2eProcess,
} from "@/lib/query/hooks/useE2eProcess";
import type { E2eProcessDto } from "@/types/e2e-process";

type E2eProcessFormProps = {
  mode: "create" | "edit";
  initialData?: E2eProcessDto;
  onCancel: () => void;
  onSuccess: (process: E2eProcessDto) => void;
};

/** E2E 프로세스 생성/수정 폼 */
export const E2eProcessForm = ({
  mode,
  initialData,
  onCancel,
  onSuccess,
}: E2eProcessFormProps) => {
  const t = useTranslations("e2eProcess");
  const tc = useTranslations("common");
  const createMutation = useCreateE2eProcess();
  const updateMutation = useUpdateE2eProcess(initialData?.e2eProcessId ?? 0);

  const [code, setCode] = useState(initialData?.code ?? "");
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [tagsText, setTagsText] = useState(initialData?.tags?.join(", ") ?? "");

  const saving = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const payload = {
      code: code.trim(),
      name: name.trim(),
      description: description.trim() || null,
      tags: tags.length ? tags : null,
    };

    if (mode === "create") {
      const created = await createMutation.mutateAsync(payload);
      onSuccess(created);
      return;
    }

    if (initialData) {
      const updated = await updateMutation.mutateAsync(payload);
      onSuccess(updated);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-6">
      <div className="space-y-2">
        <Label htmlFor="e2e-code">{t("code")}</Label>
        <Input
          id="e2e-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          disabled={mode === "edit"}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="e2e-name">{t("name")}</Label>
        <Input
          id="e2e-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="e2e-desc">{t("description")}</Label>
        <Textarea
          id="e2e-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="e2e-tags">{t("tags")}</Label>
        <Input
          id="e2e-tags"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder={t("tagsPlaceholder")}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {tc("save")}
        </Button>
      </div>
    </form>
  );
};
