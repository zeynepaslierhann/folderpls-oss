"use client";

import { BulkLabelDialog } from "@/components/dashboard/bulk-label-dialog";
import { CreateFolderDialog } from "@/components/dashboard/create-folder-dialog";
import { DeleteConfirmDialog } from "@/components/dashboard/delete-confirm-dialog";
import { EditLabelsDialog } from "@/components/dashboard/edit-labels-dialog";
import { FilePreview } from "@/components/dashboard/file-preview";
import { LabelDialog } from "@/components/dashboard/label-dialog";
import { RenameDialog } from "@/components/dashboard/rename-dialog";
import { UploadDialog } from "@/components/dashboard/upload-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UseDriveOperationsReturn } from "@/lib/hooks/use-drive-operations/types";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { LabelItem } from "@/lib/types";
import type { NamedDriveItem, WorkspaceUi } from "./drive-page-model";

type DialogOperations = Pick<
  UseDriveOperationsReturn,
  | "handleSaveLabels"
  | "handleRename"
  | "handleUpdateLabels"
  | "handleUploadWithLabels"
  | "handleBulkAddLabels"
  | "handleCreateFolder"
  | "handleDeleteConfirm"
>;

interface DriveFileDialogsProps {
  ui: WorkspaceUi;
  operations: DialogOperations;
  accessToken: string;
  currentFolderId: string | null;
  userLabels: LabelItem[];
  taggedItems: Record<string, string[]>;
  deletesPermanently: boolean;
  busy: boolean;
}

export function DriveFileDialogs({
  ui,
  operations,
  accessToken,
  currentFolderId,
  userLabels,
  taggedItems,
  deletesPermanently,
  busy,
}: DriveFileDialogsProps) {
  const { previewFile, labelDialogFile, renameFile } = ui;

  const closeUpload = () => {
    ui.setUploadDialogInitialEntries(null);
    ui.setUploadDialogOpen(false);
  };
  const closeDeleteConfirm = () => {
    ui.setDeleteConfirmItems(null);
    ui.setDeleteConfirmOpen(false);
  };
  const appliedLabelIds = (labelDialogFile && taggedItems[labelDialogFile.id]) || [];

  return (
    <>
      <FilePreview
        open={previewFile !== null}
        file={previewFile}
        accessToken={accessToken}
        onClose={() => ui.setPreviewFile(null)}
      />
      <LabelDialog
        open={labelDialogFile !== null}
        file={labelDialogFile}
        existingLabels={userLabels}
        fileLabels={appliedLabelIds}
        onSave={operations.handleSaveLabels}
        onClose={() => ui.setLabelDialogFile(null)}
      />
      <RenameDialog
        open={renameFile !== null}
        file={renameFile}
        isLoading={ui.isRenaming}
        onRename={operations.handleRename}
        onClose={() => ui.setRenameFile(null)}
      />
      <EditLabelsDialog
        open={ui.editLabelsOpen}
        labels={userLabels}
        onUpdate={operations.handleUpdateLabels}
        onClose={() => ui.setEditLabelsOpen(false)}
      />
      <UploadDialog
        open={ui.uploadDialogOpen}
        initialEntries={ui.uploadDialogInitialEntries}
        currentFolderId={currentFolderId}
        existingLabels={userLabels}
        onUpload={operations.handleUploadWithLabels}
        onClose={closeUpload}
      />
      <BulkLabelDialog
        open={ui.bulkLabelOpen}
        fileIds={[...ui.selectedIds]}
        existingLabels={userLabels}
        onSave={operations.handleBulkAddLabels}
        onClose={() => ui.setBulkLabelOpen(false)}
      />
      <CreateFolderDialog
        open={ui.createFolderDialogOpen}
        existingLabels={userLabels}
        onCreate={operations.handleCreateFolder}
        onClose={() => ui.setCreateFolderDialogOpen(false)}
      />
      <DeleteConfirmDialog
        open={ui.deleteConfirmOpen}
        itemCount={ui.deleteConfirmItems?.length ?? 0}
        isPermanent={deletesPermanently}
        isLoading={busy}
        onConfirm={operations.handleDeleteConfirm}
        onClose={closeDeleteConfirm}
      />
    </>
  );
}

interface FoundRootFolderDialogProps {
  folder: NamedDriveItem | null;
  busy: boolean;
  onDismiss: () => void;
  onChoose: (keepFoundFolder: boolean) => void;
}

/** Asked when Drive already holds a FolderPls folder and this browser has none on record. */
export function FoundRootFolderDialog({ folder, busy, onDismiss, onChoose }: FoundRootFolderDialogProps) {
  const { t } = useI18n();
  const folderName = folder?.name ?? "FolderPls";

  return (
    <Dialog
      open={folder !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onDismiss();
      }}
    >
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("dashboard.existingFolderTitle")}</DialogTitle>
          <DialogDescription>{t("dashboard.existingFolderDescription").replace("{name}", folderName)}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" disabled={busy} onClick={() => onChoose(false)}>
            {t("dashboard.existingFolderCreateNew")}
          </Button>
          <Button disabled={busy} onClick={() => onChoose(true)}>
            {t("dashboard.existingFolderUseExisting")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
