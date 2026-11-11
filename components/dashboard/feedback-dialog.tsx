"use client";

import { useState } from "react";
import { SendIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CONTACT_EMAIL, PROJECT_ISSUES_URL } from "@/lib/constants/site";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: (key: string) => string;
}

export function feedbackMailto(message: string): string {
  if (!CONTACT_EMAIL) {
    return `${PROJECT_ISSUES_URL}/new?title=${encodeURIComponent("FolderPls feedback")}&body=${encodeURIComponent(message)}`;
  }
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("FolderPls feedback")}&body=${encodeURIComponent(message)}`;
}

/** Sunucu yok: geri bildirim kullanıcının e-posta istemcisinde ya da GitHub'da açılır. */
export function FeedbackDialog({ open, onOpenChange, t }: FeedbackDialogProps) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    const href = feedbackMailto(text);
    if (CONTACT_EMAIL) window.location.href = href;
    else window.open(href, "_blank", "noopener,noreferrer");
    setText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("dashboard.feedbackButton")}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("dashboard.feedbackPlaceholder")}
          aria-label={t("dashboard.feedbackButton")}
          className="min-h-28 resize-none"
        />
        <p className="text-sm text-fg-2">{t("dashboard.feedbackViaEmail")}</p>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button className="gap-2" onClick={handleSend} disabled={!text.trim()}>
            <SendIcon className="h-4 w-4" aria-hidden="true" />
            {t("dashboard.feedbackSend")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
