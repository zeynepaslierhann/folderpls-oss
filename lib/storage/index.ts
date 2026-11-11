/** Etiket deposu: veri bu tarayıcıda, IndexedDB'de, her Google hesabı için ayrı (`account-stores.ts`). */
import { deleteActiveLabelData, getActiveLabelStore } from "./account-stores";
import type { SyncableLabelStore } from "./label-store";

export type { LabelStore, SyncableLabelStore, TagItemInput, SaveCollectionInput } from "./label-store";
export {
  accountStoreKey,
  activateAccountStore,
  claimLegacyLabels,
  getAccountStore,
  getActiveStoreKey,
  hasUnclaimedLegacyLabels,
  LEGACY_DATABASE_NAME,
  subscribeActiveStore,
} from "./account-stores";

/** Açık hesabın deposu. Nesne sabittir; hesap değişince çağrılar yeni hesabın deposuna gider. */
export function getLabelStore(): SyncableLabelStore {
  return getActiveLabelStore();
}

/** Yalnız açık hesabın bu tarayıcıdaki etiket verisini siler. Geri alınamaz. */
export async function deleteLocalLabelData(): Promise<void> {
  await deleteActiveLabelData();
}
