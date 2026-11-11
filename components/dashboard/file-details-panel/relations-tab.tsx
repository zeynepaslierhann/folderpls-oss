"use client";

import { useState } from "react";
import { LinkIcon, AddIcon, DeleteIcon, DocumentIcon, ExternalLinkIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/i18n-context";
import { FileRelationSelector } from "../file-relation-selector";
import type { DriveFile, FileRelation } from "@/lib/types";

interface RelationsTabProps {
  fileId: string;
  itemRelations: FileRelation[];
  availableFiles: DriveFile[];
  onAddRelation: (relation: Omit<FileRelation, "createdAt">) => Promise<void>;
  onRemoveRelation: (targetFileId: string) => void;
}

export function RelationsTab({
  fileId,
  itemRelations,
  availableFiles,
  onAddRelation,
  onRemoveRelation,
}: RelationsTabProps) {
  const { t } = useI18n();
  const [relationSelectorOpen, setRelationSelectorOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-xs font-medium text-fg-3">
          <LinkIcon className="w-3 h-3" />
          {t("dashboard.fileRelations")}
        </Label>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 gap-1 text-xs"
          onClick={() => setRelationSelectorOpen(true)}
        >
          <AddIcon className="w-3 h-3" /> {t("dashboard.add")}
        </Button>
      </div>

      {/* Relations List */}
      <div className="space-y-3">
        {itemRelations.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-line py-10 text-sm text-fg-2">
            <LinkIcon className="w-8 h-8 mb-2 text-fg-3" />
            <p className="text-xs italic text-center px-4">
              {t("dashboard.noRelations")}
            </p>
          </div>
        )}

        {itemRelations.map((rel) => {
          const targetFile = availableFiles.find(
            (f) => f.id === rel.targetFileId
          );
          return (
            <div
              key={rel.targetFileId}
              className="group relative rounded-md border border-line bg-raised p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <Badge
                  variant="secondary"
                  className="h-5 rounded-sm px-1.5 text-xs font-medium"
                >
                  {rel.relationType || t("dashboard.related")}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onRemoveRelation(rel.targetFileId)}
                >
                  <DeleteIcon className="h-3 w-3 text-danger" aria-hidden="true" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <DocumentIcon className="w-4 h-4 text-fg-3 shrink-0" />
                <span className="text-sm font-medium truncate flex-1">
                  {targetFile?.name || t("dashboard.unknownFile")}
                </span>
                <ExternalLinkIcon className="h-3.5 w-3.5 cursor-pointer text-fg-3 hover:text-fg" aria-hidden="true" />
              </div>
              {rel.note && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2 italic">
                  &quot;{rel.note}&quot;
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Relation Selector Dialog */}
      <FileRelationSelector
        open={relationSelectorOpen}
        onOpenChange={setRelationSelectorOpen}
        currentFileId={fileId}
        availableFiles={availableFiles}
        onAddRelation={onAddRelation}
      />
    </div>
  );
}
