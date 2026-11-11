"use client";

import { useCallback, useState } from "react";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useStoredBoolean } from "@/lib/hooks/use-stored-boolean";

/** Detay panelinin DOCKED olduğu genişlik (spec §2.4); DetailsDock ile aynı eşik. */
export const DETAILS_DOCK_QUERY = "(min-width: 1280px)";

type Update = boolean | ((prev: boolean) => boolean);

/**
 * Detay paneli açık mı (spec §2.4). Tercih YALNIZ docked modda (≥1280px)
 * saklanır ve geri yüklenir. Daha dar ekranda panel modal bir sheet'tir;
 * orada durum oturumluktur — bir kez açmak, sonraki her yüklemede ekranı
 * kapatan bir sheet'in kendiliğinden açılmasına yol açmaz.
 */
export function useDetailsPanelOpen(): [boolean, (next: Update) => void] {
  const docked = useMediaQuery(DETAILS_DOCK_QUERY);
  const [stored, setStored] = useStoredBoolean("fp.detailsPanel", false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const set = useCallback(
    (next: Update) => {
      if (docked) setStored(next);
      else setSheetOpen(next);
    },
    [docked, setStored]
  );

  return [docked ? stored : sheetOpen, set];
}
