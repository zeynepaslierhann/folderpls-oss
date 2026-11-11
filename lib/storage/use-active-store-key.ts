"use client";

import { useSyncExternalStore } from "react";
import { getActiveStoreKey, subscribeActiveStore } from "./account-stores";

/** Açık etiket deposunun hesabı (`null`: hiç hesap bağlanmamış). Sunucuda `null`. */
export function useActiveStoreKey(): string | null {
  return useSyncExternalStore(subscribeActiveStore, getActiveStoreKey, () => null);
}
