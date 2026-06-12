"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

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
  const { data: companyOptions = [] } = useCommonCodeLookup("COMPANY_CD");
  const { data: businessUnitOptions = [] } = useCommonCodeLookup("BU_CD");
  const createVariant = useCreateProcessVariant(standardNode?.nodeId ?? 0);

  const handleSubmit = () => {
    if (!standardNode || !companyCode || !businessUnitCode) {
      return;
    }

    createVariant.mutate(
      { companyCode, businessUnitCode },
      {
        onSuccess: (variant) => {
          onOpenChange(false);
          setCompanyCode("");
          setBusinessUnitCode("");
          onSuccess?.(variant);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <SelectContent>
                {companyOptions.map((item) => (
                  <SelectItem key={item.code} value={item.code}>
                    {item.displayName}
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
              <SelectContent>
                {businessUnitOptions.map((item) => (
                  <SelectItem key={item.code} value={item.code}>
                    {item.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
