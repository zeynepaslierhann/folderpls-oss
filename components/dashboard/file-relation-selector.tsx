"use client";

import { useState, useCallback } from "react";
import { SearchIcon, LinkIcon, FolderIcon, FileIcon, CloseIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { DriveFile } from "@/lib/google-drive/google-drive";
import type { FileRelation } from "@/lib/types";
import { logger } from "@/lib/logger";
import { useI18n } from "@/lib/i18n/i18n-context";

interface FileRelationSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentFileId: string;
    availableFiles: DriveFile[];
    onAddRelation: (relation: Omit<FileRelation, "createdAt">) => Promise<void>;
}

export function FileRelationSelector({
    open,
    onOpenChange,
    currentFileId,
    availableFiles,
    onAddRelation,
}: FileRelationSelectorProps) {
    const { t } = useI18n();
    const [failed, setFailed] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFileId, setSelectedFileId] = useState<string>("");
    const [relationType, setRelationType] = useState<FileRelation["relationType"]>("related");
    const [note, setNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter files: exclude current file and search by name
    const filteredFiles = availableFiles.filter((file) => {
        if (file.id === currentFileId) return false;
        if (!searchQuery) return true;
        return file.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const handleSubmit = useCallback(async () => {
        if (!selectedFileId) return;

        setIsSubmitting(true);
        setFailed(false);
        try {
            await onAddRelation({
                targetFileId: selectedFileId,
                relationType,
                note: note.trim() || undefined,
            });

            // Reset form
            setSelectedFileId("");
            setRelationType("related");
            setNote("");
            setSearchQuery("");
            onOpenChange(false);
        } catch (error) {
            logger.error("Failed to add relation:", error);
            // Security: Never expose raw error messages to UI
            setFailed(true);
        } finally {
            setIsSubmitting(false);
        }
    }, [selectedFileId, relationType, note, onAddRelation, onOpenChange]);

    const selectedFile = availableFiles.find((f) => f.id === selectedFileId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        {t("dialogs.fileRelation.title")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("dialogs.fileRelation.description")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Search & File Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="file-search">{t("dialogs.fileRelation.searchLabel")}</Label>
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3" />
                            <Input
                                id="file-search"
                                placeholder={t("dialogs.fileRelation.searchPlaceholder")}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* File List */}
                    {searchQuery && (
                        <div className="border rounded-lg max-h-48 overflow-y-auto">
                            {filteredFiles.length === 0 ? (
                                <div className="p-4 text-sm text-muted-foreground text-center">
                                    {t("dialogs.fileRelation.noResults")}
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {filteredFiles.slice(0, 10).map((file) => (
                                        <button
                                            key={file.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedFileId(file.id);
                                                setSearchQuery("");
                                            }}
                                            className="w-full px-4 py-2 text-left hover:bg-muted/50 transition-colors flex items-center gap-2"
                                        >
                                            {file.mimeType === "application/vnd.google-apps.folder" ? (
                                                <FolderIcon className="h-4 w-4 shrink-0 text-fg-2" aria-hidden="true" />
                                            ) : (
                                                <FileIcon className="h-4 w-4 shrink-0 text-fg-2" aria-hidden="true" />
                                            )}
                                            <span className="text-sm truncate">{file.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Selected File Display */}
                    {selectedFile && (
                        <div className="p-3 bg-muted/30 rounded-lg border flex items-center gap-2">
                            {selectedFile.mimeType === "application/vnd.google-apps.folder" ? (
                                <FolderIcon className="h-4 w-4 shrink-0 text-fg-2" aria-hidden="true" />
                            ) : (
                                <FileIcon className="h-4 w-4 shrink-0 text-fg-2" aria-hidden="true" />
                            )}
                            <span className="text-sm font-medium flex-1 truncate">{selectedFile.name}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedFileId("")}
                                className="h-6 w-6 p-0"
                                aria-label={t("dialogs.fileRelation.clearSelection")}
                            >
                                <CloseIcon className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                        </div>
                    )}

                    {/* Relation Type */}
                    <div className="space-y-2">
                        <Label htmlFor="relation-type">{t("dialogs.fileRelation.typeLabel")}</Label>
                        <Select value={relationType || "related"} onValueChange={(v) => setRelationType(v as FileRelation["relationType"])}>
                            <SelectTrigger id="relation-type">
                                <SelectValue placeholder={t("dialogs.fileRelation.typePlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="reference">{t("dialogs.fileRelation.typeReference")}</SelectItem>
                                <SelectItem value="dependency">{t("dialogs.fileRelation.typeDependency")}</SelectItem>
                                <SelectItem value="related">{t("dialogs.fileRelation.typeRelated")}</SelectItem>
                                <SelectItem value="parent-child">{t("dialogs.fileRelation.typeParentChild")}</SelectItem>
                                <SelectItem value="version">{t("dialogs.fileRelation.typeVersion")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Note */}
                    <div className="space-y-2">
                        <Label htmlFor="relation-note">{t("dialogs.fileRelation.noteLabel")}</Label>
                        <Textarea
                            id="relation-note"
                            placeholder={t("dialogs.fileRelation.notePlaceholder")}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            className="resize-none"
                        />
                    </div>
                </div>

                {failed && (
                    <p role="alert" className="text-sm text-[color:var(--danger)]">
                        {t("dialogs.fileRelation.addFailed")}
                    </p>
                )}

                <DialogFooter>
                    <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={handleSubmit} disabled={!selectedFileId || isSubmitting}>
                        {isSubmitting ? t("dialogs.fileRelation.adding") : t("dialogs.fileRelation.add")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
