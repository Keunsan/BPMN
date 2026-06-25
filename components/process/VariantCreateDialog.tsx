"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateProcessVariant } from "@/lib/query/hooks/useProcess";
import { useCommonCodeLookup } from "@/lib/query/hooks/useCommonCode";
import type { ProcessNodeDto, ProcessNodeTree } from "@/types/process";

type VariantCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  standardNode: ProcessNodeTree | ProcessNodeDto | null;
  onSuccess?: (variant: ProcessNodeDto) => void;
};

/** 표준 L3/L4에서 법인·사업부 변형을 생성한다 */
export const VariantCreateDialog = ({
  open,
  onOpenChange,
  standardNode,
  onSuccess,
}: VariantCreateDialogProps) => {
  const t = useTranslations("process");
  const [companyCode, setCompanyCode] = useState("");
  const [businessUnitCode, setBusinessUnitCode] = useState("");
  const [copyBpmn, setCopyBpmn] = useState(true);
  const [copyMetadata, setCopyMetadata] = useState(false);
  const { data: companyOptions = [] } = useCommonCodeLookup("COMPANY_CD");
  const { data: businessUnitOptions = [] } = useCommonCodeLookup("BU_CD");

  const companySelectItems = useMemo(
    () =>
      companyOptions.map((item) => ({
        value: item.code,
        label: item.displayName,
      })),
    [companyOptions],
  );

  const businessUnitSelectItems = useMemo(
    () =>
      businessUnitOptions.map((item) => ({
        value: item.code,
        label: item.displayName,
      })),
    [businessUnitOptions],
  );

  const createVariant = useCreateProcessVariant(standardNode?.nodeId ?? 0);
  const isL3 = standardNode?.level === "L3";

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setCopyBpmn(standardNode?.level === "L3");
      setCopyMetadata(false);
    } else {
      setCompanyCode("");
      setBusinessUnitCode("");
    }
    onOpenChange(next);
  };

  const handleSubmit = () => {
    if (!standardNode || !companyCode || !businessUnitCode) {
      return;
    }

    createVariant.mutate(
      {
        companyCode,
        businessUnitCode,
        copyBpmn: copyBpmn || undefined,
        copyMetadata: copyMetadata || undefined,
      },
      {
        onSuccess: (variant) => {
          handleOpenChange(false);
          onSuccess?.(variant);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("variant.createTitle")}</DialogTitle>
          <DialogDescription>
            {t("variant.createDesc", {
              code: standardNode?.code ?? "",
              name: standardNode?.name ?? "",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{t("scope.companyCode")}</p>
            <Select
              value={companyCode}
              onValueChange={(value) => setCompanyCode(value ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("scope.selectCompany")} />
              </SelectTrigger>
              <SelectContent items={companySelectItems}>
                {companySelectItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">{t("scope.businessUnitCode")}</p>
            <Select
              value={businessUnitCode}
              onValueChange={(value) => setBusinessUnitCode(value ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("scope.selectBusinessUnit")} />
              </SelectTrigger>
              <SelectContent items={businessUnitSelectItems}>
                {businessUnitSelectItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={copyBpmn}
                onChange={(event) => setCopyBpmn(event.target.checked)}
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">
                  {t("variant.copyBpmn")}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {isL3
                    ? t("variant.copyBpmnDescL3")
                    : t("variant.copyBpmnDescL4")}
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={copyMetadata}
                onChange={(event) => setCopyMetadata(event.target.checked)}
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">
                  {t("variant.copyMetadata")}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {isL3
                    ? t("variant.copyMetadataDescL3")
                    : t("variant.copyMetadataDescL4")}
                </span>
              </span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!companyCode || !businessUnitCode || createVariant.isPending}
          >
            {t("variant.createAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
