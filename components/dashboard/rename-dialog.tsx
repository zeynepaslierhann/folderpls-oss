"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/i18n-context";

type RenameTarget = { id: string; name: string };

type RenameDialogProps = {
  file: RenameTarget | null;
  open: boolean;
  onClose: () => void;
  onRename: (fileId: string, newName: string) => void;
  isLoading?: boolean;
};

export function RenameDialog({ file, open, onClose, onRename, isLoading = false }: RenameDialogProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");

  // Reseed the input whenever the dialog opens or points at another file.
  const activeTarget = open ? file : null;
  const [seededTarget, setSeededTarget] = useState<RenameTarget | null>(null);
  if (activeTarget !== seededTarget) {
    setSeededTarget(activeTarget);
    if (activeTarget) setDraft(activeTarget.name);
  }

  if (!file) return null;

  const cleanedName = draft.trim();
  const canRename = cleanedName !== "" && draft !== file.name;
  const saveText = isLoading ? t("dialogs.rename.saving") : t("common.save");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("dialogs.rename.title")}</DialogTitle>
          <DialogDescription className="sr-only">{t("dialogs.rename.description")}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canRename) onRename(file.id, cleanedName);
          }}
        >
          <div className="py-4">
            <Label htmlFor="new-name" className="text-sm font-medium">{t("dialogs.rename.newName")}</Label>
            <Input
              id="new-name"
              className="mt-2"
              autoFocus
              disabled={isLoading}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" disabled={isLoading} onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={isLoading || !canRename}>{saveText}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
