"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NextDynamic from "next/dynamic";
import { BookmarkIcon, FolderIcon, DriveIcon, ImportIcon, NoResultsIcon, TagIcon, DeleteIcon, UploadIcon, PasteIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/loading";
import { TagDot } from "@/components/ui/tag-chip";
import { useDriveSession } from "@/lib/google-drive/drive-session";
import {
  clearStoredRootFolderId,
  getStoredRootFolderId,
  isDriveAuthError,
  setStoredRootFolderId,
} from "@/lib/google-drive/drive-connection-state";
import { useI18n } from "@/lib/i18n/i18n-context";
import { logger } from "@/lib/logger";
import {
  DriveFile,
  listDriveFiles,
  listDriveFilesRecursive,
  listTrashedDriveFiles,
  getDriveFile,
  getDriveStorageQuota,
  isFolder,
} from "@/lib/google-drive/google-drive";
import { openFolderPicker, getPickerApiKey } from "@/lib/google-drive/drive-picker";
import { useGooglePicker } from "@/components/dashboard/google-picker";
import { findFolderPlsInRoot, createNewFolderPlsFolder } from "@/lib/google-drive/folderpls-ensure";
import { useDriveOperations } from "@/lib/hooks/use-drive-operations";
import { useLabeledItemsLoader } from "@/lib/hooks/use-labeled-items-loader";
import { useFileSearch } from "@/lib/hooks/use-file-search";
import { getLabelStore } from "@/lib/storage";
import { useSmartCollections } from "@/lib/hooks/use-smart-collections";
import { FileDetailsPanel } from "@/components/dashboard/file-details-panel";
import { DashboardShell, type SidebarViewMode, type FolderTreeItem } from "@/components/dashboard/dashboard-shell";
import { DashboardShellSkeleton } from "@/components/dashboard/dashboard-shell/shell-skeleton";
import {
  DetailsDock,
  DriveBreadcrumb,
  DriveTopBar,
  EmptyState,
  ErrorState,
  FileCollection,
  FilterTrigger,
  MobileSearchButton,
  NewMenu,
  Notice,
  PageTitle,
  Toast,
  ViewMenu,
  type FileGroup,
} from "@/components/dashboard/drive-view";
import { MarqueeSelection } from "@/components/dashboard/marquee-selection";
import type { GraphNodeType } from "@/components/dashboard/graph";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { OnboardingDialog } from "@/components/dashboard/onboarding-dialog";
import { applyFilters } from "@/lib/search/search-utils";
import { mergeFileSources } from "@/lib/search";
import { AddFilterMenu, FilterChipBar, SearchCommandDialog } from "@/components/dashboard/search";
import { useDetailsPanelOpen } from "@/lib/hooks/use-details-panel-open";
import type { SortState } from "@/lib/ui/sort-files";
import type { FilterCondition, LabelItem, SmartCollection } from "@/lib/types";
import {
  DEFAULT_PAGE_SIZE,
  LARGE_PAGE_SIZE,
  STATUS_OPTIONS,
  STATUS_PROPERTY_DEFINITION,
  STATUS_PROPERTY_ID,
  VIEW_MODES,
  type ViewMode,
} from "@/lib/constants";
import { DriveFileDialogs, FoundRootFolderDialog } from "./drive-page-dialogs";
import {
  DRIVE_DASHBOARD_PATH,
  INITIAL_BROWSING,
  INITIAL_SIDEBAR_DATA,
  INITIAL_WORKSPACE_UI,
  MY_DRIVE_CRUMB,
  decodeFolderTrail,
  driveFolderHref,
  isTypingInField,
  sidebarModeFor,
  taggedIdsOfKind,
  taggedKindForView,
  toTreeItems,
  type DriveItemKind,
  type FolderCrumb,
  type NamedDriveItem,
} from "./drive-page-model";
import { useFieldState } from "./use-field-state";
import { useFileDropZone } from "./use-file-drop-zone";

// The graph panel pulls in its own SVG rendering + layout code (no react-force-graph-2d
// anymore, see docs/graph-v2.md) — still code-split so it never lands in the main
// dashboard bundle for users who don't open the graph view.
const GraphPanel = NextDynamic(
  () => import("@/components/dashboard/graph").then((m) => m.GraphPanel),
  {
    ssr: false,
    // Grafik parçası yüklenirken alan boş kalır (sayfa ortasında gösterge yok).
    loading: () => null,
  }
);

function DriveWorkspace() {
  const {
    loading,
    status: driveStatus,
    accessToken,
    account: driveAccount,
    accountSwitch,
    dismissAccountSwitch,
    connectIssue,
    connectDrive: requestDriveConnection,
    getValidToken,
    markTokenExpired,
    disconnectDrive,
  } = useDriveSession();
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const labelStore = getLabelStore();

  const {
    driveFiles, setDriveFiles,
    isLoadingFiles, setIsLoadingFiles,
    isDriveConnected, setIsDriveConnected,
    isInitialized, setIsInitialized,
    error, setError,
    currentFolderId, setCurrentFolderId,
    folderPath, setFolderPath,
    rootFolder, setRootFolder,
    foundRootFolder, setFoundRootFolder,
  } = useFieldState(INITIAL_BROWSING);
  const folderPlsFolderId = rootFolder?.id ?? null;
  const folderPlsFolderName = rootFolder?.name ?? "FolderPls";
  const [isPickingFolder, setIsPickingFolder] = useState(false);
  // Seçilen klasörün dosyaları listelenemediyse (drive.file klasör seçimine çocuk erişimi vermez): açık mesaj + "Pick files instead".
  const [folderNotListedName, setFolderNotListedName] = useState<string | null>(null);

  const getSafeMessage = useCallback((_err: unknown, fallback: string) => {
    return fallback;
  }, []);

  const rootLookupStarted = useRef(false);
  const urlSyncInFlight = useRef(false);

  // Labeled items — labels, taggedItems, properties (extracted hook)
  const {
    userLabels,
    taggedItems,
    itemMetadata,
    taggedItemsTypes,
    propertyDefinitions,
    setUserLabels,
    setTaggedItems,
    setItemMetadata,
    setTaggedItemsTypes,
    reload: reloadLabeledItems,
  } = useLabeledItemsLoader();

  // Collections / onboarding
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [saveCollectionOpen, setSaveCollectionOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  // Koleksiyon kurucu kaynağı: "label:<id>" ya da "prop:<propId>:<optionId>". Boşsa aramayı kaydeder.
  const [collectionSource, setCollectionSource] = useState("");
  const [collectionFromSearch, setCollectionFromSearch] = useState(false);
  const [isSavingCollection, setIsSavingCollection] = useState(false);

  // Yerleşik Durum özelliği, kullanıcının özellikleriyle birlikte her zaman var.
  const propertyDefinitionsWithStatus = useMemo(
    () => [STATUS_PROPERTY_DEFINITION, ...propertyDefinitions.filter((p) => p.id !== STATUS_PROPERTY_ID)],
    [propertyDefinitions]
  );
  const getStatusOption = useCallback(
    (fileId: string): { name: string; color: string; textColor?: string } | undefined => {
      const value = itemMetadata[fileId]?.properties?.[STATUS_PROPERTY_ID];
      if (typeof value !== "string" || !value) return undefined;
      const option = STATUS_OPTIONS.find((o) => o.id === value);
      return option ? { name: option.name, color: option.color, textColor: option.textColor } : undefined;
    },
    [itemMetadata]
  );

  // dialogs & clipboard
  const workspaceUi = useFieldState(INITIAL_WORKSPACE_UI);
  const {
    selectedIds, setSelectedIds,
    detailsPanelFileId, setDetailsPanelFileId,
    clipboard, setClipboard,
    displayMode, setDisplayMode,
    editLabelsOpen, setEditLabelsOpen,
    deleteConfirmItems, setDeleteConfirmItems,
    setPreviewFile,
    setLabelDialogFile,
    setRenameFile,
    setIsRenaming,
    setBulkLabelOpen,
    setCreateFolderDialogOpen,
    setUploadDialogOpen,
    setUploadDialogInitialEntries,
    setDeleteConfirmOpen,
  } = workspaceUi;
  const clearSelection = useCallback(() => setSelectedIds(new Set()), [setSelectedIds]);
  // Detay paneli (spec §2.4): View ▾ ya da `i` ile açılır, açıkken seçimi izler;
  // açık/kapalı tercihi bu tarayıcıda saklanır.
  const [detailsOpen, setDetailsOpen] = useDetailsPanelOpen();
  const [sort, setSort] = useState<SortState>(null);

  // view/search/trash
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODES.NORMAL);
  const [, setIsUploading] = useState(false);
  const {
    folderChildrenData, setFolderChildrenData,
    rootTreeItems, setRootTreeItems,
    driveStorage, setDriveStorage,
  } = useFieldState(INITIAL_SIDEBAR_DATA);
  const folderChildren = useMemo(
    () => Object.fromEntries(Object.entries(folderChildrenData).map(([id, files]) => [id, toTreeItems(files)])),
    [folderChildrenData]
  );
  const { isDragOver, dropZoneProps } = useFileDropZone({
    connected: isDriveConnected,
    targetFolderId: currentFolderId,
    onFilesDropped: (entries) => {
      setUploadDialogInitialEntries(entries);
      setUploadDialogOpen(true);
    },
  });

  // Graph view: all files fetched recursively from root
  const [allGraphFiles, setAllGraphFiles] = useState<DriveFile[]>([]);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [graphLoadedCount, setGraphLoadedCount] = useState(0);

  // user labels / tagged items loaded by useLabeledItemsLoader hook above

  const beginFileLoad = useCallback(() => {
    setIsLoadingFiles(true);
    setError(null);
  }, [setIsLoadingFiles, setError]);

  const startTrailAt = useCallback(
    ({ id, name }: NamedDriveItem) => {
      setCurrentFolderId(id);
      setFolderPath([{ id, name }]);
    },
    [setCurrentFolderId, setFolderPath]
  );

  const adoptRootFolder = useCallback(
    (folder: NamedDriveItem) => {
      setRootFolder({ id: folder.id, name: folder.name });
      startTrailAt(folder);
    },
    [setRootFolder, startTrailAt]
  );

  const installNewRootFolder = useCallback(
    (created: DriveFile) => {
      setStoredRootFolderId(created.id);
      adoptRootFolder(created);
      setDriveFiles([]);
    },
    [adoptRootFolder, setDriveFiles]
  );

  /** Shows the folder this browser remembers. False means the caller still needs a root. */
  const reopenStoredRootFolder = async (token: string): Promise<boolean> => {
    const storedId = getStoredRootFolderId();
    if (!storedId) return false;
    try {
      const meta = await getDriveFile(token, storedId);
      if (!meta.trashed) {
        adoptRootFolder({ id: storedId, name: meta.name });
        const { files } = await listDriveFiles(token, { folderId: storedId, pageSize: DEFAULT_PAGE_SIZE });
        setDriveFiles(files);
        return true;
      }
    } catch (err) {
      // Süresi dolmuş jeton klasörün silindiği anlamına gelmez; kayıtlı kimlik kalır.
      if (isDriveAuthError(err)) throw err;
    }
    clearStoredRootFolderId();
    return false;
  };

  /** Resolves the root folder. False means the user first has to answer the found-folder dialog. */
  const attachRootFolder = async (token: string): Promise<boolean> => {
    if (await reopenStoredRootFolder(token)) return true;
    const found = await findFolderPlsInRoot(token);
    if (found) {
      setFoundRootFolder({ id: found.id, name: found.name });
      return false;
    }
    installNewRootFolder(await createNewFolderPlsFolder(token));
    return true;
  };

  /** One attempt at reaching the root folder. An expired token asks for a reconnect instead of showing an error. */
  const attemptRootSetup = (failure: { log: string; message: string }, work: () => Promise<void>) => {
    beginFileLoad();
    return work()
      .catch((err: unknown) => {
        logger.error(failure.log, err);
        // Raw error stays in the log; the user gets a translated message.
        if (isDriveAuthError(err)) markTokenExpired();
        else setError(failure.message);
      })
      .finally(() => setIsLoadingFiles(false));
  };

  // FolderPls kök klasörü: bu tarayıcıda kayıtlıysa onu aç, değilse bul ya da oluştur
  useEffect(() => {
    if (loading) return;
    if (!accessToken) setIsInitialized(true);
    else if (!rootLookupStarted.current) {
      rootLookupStarted.current = true;
      void attemptRootSetup({ log: "Could not open the root folder on load:", message: t("dashboard.folderPlsOpenFailed") }, async () => {
        if (await attachRootFolder(accessToken)) setIsDriveConnected(true);
      }).finally(() => setIsInitialized(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, accessToken]);

  useEffect(() => {
    const showingRoot =
      viewMode === VIEW_MODES.NORMAL && Boolean(folderPlsFolderId) && currentFolderId === folderPlsFolderId;
    if (showingRoot && driveFiles.length > 0) setRootTreeItems(toTreeItems(driveFiles));
  }, [driveFiles, currentFolderId, folderPlsFolderId, viewMode, setRootTreeItems]);

  const handleDisconnect = async () => {
    await disconnectDrive();
    window.location.assign("/dashboard/google-drive");
  };

  const pushFolderUrl = useCallback(
    (folderId: string | null, trail: FolderCrumb[]) => {
      router.push(driveFolderHref(folderId, trail), { scroll: false });
    },
    [router]
  );

  const executeDriveCall = useCallback(
    async <T,>(request: (token: string) => Promise<T>, explicitToken?: string | null): Promise<T> => {
      const activeToken = explicitToken ?? getValidToken();
      if (!activeToken) throw new Error("Drive is not connected");
      return request(activeToken).catch((err: unknown) => {
        if (isDriveAuthError(err)) markTokenExpired();
        throw err;
      });
    },
    [getValidToken, markTokenExpired]
  );

  const listFolder = useCallback(
    (folderId: string, paging?: { pageSize: number; pageToken?: string }) =>
      executeDriveCall((token) => listDriveFiles(token, { folderId, pageSize: DEFAULT_PAGE_SIZE, ...paging })),
    [executeDriveCall]
  );

  /** Runs one load of the main list: spinner on, stale error off, failures logged and shown. */
  const withFileLoading = useCallback(
    async (failure: { log: string; message: string }, work: () => Promise<void>) => {
      beginFileLoad();
      try {
        await work();
      } catch (err) {
        logger.error(failure.log, err);
        setError(getSafeMessage(err, failure.message));
      } finally {
        setIsLoadingFiles(false);
      }
    },
    [beginFileLoad, getSafeMessage, setError, setIsLoadingFiles]
  );

  const showListing = useCallback(
    (files: DriveFile[], folderId: string, trail: FolderCrumb[]) => {
      setDriveFiles(files);
      setCurrentFolderId(folderId);
      setFolderPath(trail);
    },
    [setDriveFiles, setCurrentFolderId, setFolderPath]
  );

  // Search v2 — pure in-memory engine (lib/search), no Drive API calls. Scope is
  // whatever is already loaded (see docs/arama-v2.md).
  const searchScopeFiles = useMemo(
    () => mergeFileSources(driveFiles, allGraphFiles, ...Object.values(folderChildrenData)),
    [driveFiles, allGraphFiles, folderChildrenData]
  );
  const {
    searchQuery,
    setSearchQuery,
    chips: searchChips,
    addChip: addSearchChip,
    removeChip: removeSearchChip,
    clearChips: clearSearchChips,
    searchResults,
    rankedResults: rankedSearchResults,
    isSearching,
    isSearchMode,
    suggestions: searchSuggestions,
    recentSearches,
    clearRecentSearches,
    commitSearch,
    toFilterGroup,
    isPaletteOpen,
    openPalette,
    closePalette,
  } = useFileSearch({
    files: searchScopeFiles,
    itemMetadata,
    userLabels,
    propertyDefinitions,
  });

  // Sync search mode into viewMode
  // Palet açıkken sayfa arka planda arama moduna GEÇMEZ (tek sonuç yüzeyi,
  // tek "eşleşme yok" mesajı); sorgu yalnız palet kapanınca ya da "Show all
  // results" ile listeye taşınır.
  const pageSearchMode = isSearchMode && !isPaletteOpen;
  useEffect(() => {
    setViewMode((prev) => {
      if (pageSearchMode && prev !== VIEW_MODES.SEARCH) return VIEW_MODES.SEARCH;
      if (!pageSearchMode && prev === VIEW_MODES.SEARCH) return VIEW_MODES.NORMAL;
      return prev;
    });
  }, [pageSearchMode]);

  // Fetch Drive storage quota when connected (for sidebar)
  useEffect(() => {
    let superseded = false;
    const publish = (quota: Parameters<typeof setDriveStorage>[0]) => {
      if (!superseded) setDriveStorage(quota);
    };
    if (folderPlsFolderId) executeDriveCall(getDriveStorageQuota).then(publish, () => publish(null));
    else publish(null);
    return () => {
      superseded = true;
    };
  }, [folderPlsFolderId, executeDriveCall, setDriveStorage]);

  // Recursive fetch all files from root for graph view
  const graphFetchAbort = useRef<boolean>(false);
  useEffect(() => {
    if (viewMode !== VIEW_MODES.GRAPH || !folderPlsFolderId || !accessToken) return;
    if (allGraphFiles.length > 0) return; // Already loaded

    graphFetchAbort.current = false;
    const MAX_DEPTH = 6;
    const MAX_FILES = 800;

    const fetchAll = async () => {
      setIsLoadingGraph(true);
      setGraphLoadedCount(0);
      try {
        const collected: DriveFile[] = [];
        const queue: { id: string; depth: number }[] = [{ id: folderPlsFolderId, depth: 0 }];
        const visited = new Set<string>();

        while (queue.length > 0 && collected.length < MAX_FILES) {
          if (graphFetchAbort.current) return;
          const { id: fId, depth } = queue.shift()!;
          if (visited.has(fId)) continue;
          visited.add(fId);

          let pageToken: string | undefined;
          do {
            if (graphFetchAbort.current) return;
            const response = await listFolder(fId, { pageSize: LARGE_PAGE_SIZE, pageToken });
            for (const file of response.files) {
              if (collected.length >= MAX_FILES) break;
              collected.push(file);
              if (isFolder(file) && depth < MAX_DEPTH) {
                queue.push({ id: file.id, depth: depth + 1 });
              }
            }
            pageToken = response.nextPageToken;
            if (!graphFetchAbort.current) setGraphLoadedCount(collected.length);
          } while (pageToken && collected.length < MAX_FILES);
        }

        if (!graphFetchAbort.current) {
          setAllGraphFiles(collected);
        }
      } catch (err) {
        logger.error("Error fetching all files for graph:", err);
        if (!graphFetchAbort.current) {
          setError(t("dashboard.graphLoadFailed"));
        }
      } finally {
        if (!graphFetchAbort.current) {
          setIsLoadingGraph(false);
        }
      }
    };

    fetchAll();
    return () => { graphFetchAbort.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, folderPlsFolderId, accessToken, executeDriveCall]);

  // Clear graph cache when files change (upload, delete, etc.)
  useEffect(() => {
    if (viewMode !== VIEW_MODES.GRAPH) {
      setAllGraphFiles([]);
    }
  }, [viewMode]);

  const settleFoundRootFolder = useCallback(
    async (keepFound: boolean) => {
      if (!foundRootFolder) return;
      await withFileLoading({ log: "Resolve FolderPls folder:", message: t("dashboard.operationFailed") }, async () => {
        if (keepFound) {
          setStoredRootFolderId(foundRootFolder.id);
          adoptRootFolder(foundRootFolder);
          const { files } = await listFolder(foundRootFolder.id);
          setDriveFiles(files);
        } else {
          installNewRootFolder(await executeDriveCall(createNewFolderPlsFolder));
        }
        setIsDriveConnected(true);
      });
      setFoundRootFolder(null);
    },
    [foundRootFolder, withFileLoading, adoptRootFolder, installNewRootFolder, listFolder, executeDriveCall, t, setDriveFiles, setIsDriveConnected, setFoundRootFolder]
  );

  const latestKeyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  latestKeyHandler.current = (e: KeyboardEvent) => {
    if (isTypingInField()) return;
    // Açık dialog/menü kendi Esc'ini işler; seçim yalnız sayfa düzeyinde temizlenir.
    const overlayOpen = !!document.querySelector('[role="dialog"], [role="menu"], [role="alertdialog"]');
    if (e.key === "Escape" && !overlayOpen && selectedIds.size > 0) {
      clearSelection();
      return;
    }
    if ((e.key === "i" || e.key === "I") && !e.ctrlKey && !e.metaKey && !e.altKey && !overlayOpen) {
      e.preventDefault();
      setDetailsOpen((v) => !v);
      return;
    }
    if (!e.ctrlKey && !e.metaKey) return;
    if (e.key === "v") {
      if (currentFolderId && clipboard?.items.length) {
        e.preventDefault();
        handlePaste();
      }
      return;
    }
    const clipboardAction = e.key === "c" ? "copy" : e.key === "x" ? "cut" : null;
    if (!clipboardAction) return;
    e.preventDefault();
    const picked = getSelectedFiles();
    if (picked.length > 0) setClipboard({ items: picked, action: clipboardAction });
  };
  useEffect(() => {
    const listeners = new AbortController();
    window.addEventListener("keydown", (e) => latestKeyHandler.current(e), { signal: listeners.signal });
    return () => listeners.abort();
  }, []);

  useEffect(() => {
    if (viewMode !== VIEW_MODES.NORMAL || !isDriveConnected || !folderPlsFolderId) return;
    if (rootTreeItems.length > 0 || currentFolderId === null || currentFolderId === folderPlsFolderId) return;
    listFolder(folderPlsFolderId)
      .then(({ files }) => setRootTreeItems(toTreeItems(files)))
      .catch((err) => logger.error(err));
  }, [viewMode, isDriveConnected, folderPlsFolderId, rootTreeItems.length, currentFolderId, listFolder, setRootTreeItems]);

  const connectDrive = () =>
    attemptRootSetup({ log: "Error connecting to Drive:", message: t("dashboard.driveConnectFailed") }, async () => {
      setViewMode(VIEW_MODES.NORMAL);
      const token = getValidToken() ?? (await requestDriveConnection());
      // Neden (engellenen pencere, vazgeçme) oturumda: boş durum ona göre çizilir.
      if (!token) return;
      if (!(await attachRootFolder(token))) return;
      setIsDriveConnected(true);
      router.push(DRIVE_DASHBOARD_PATH, { scroll: false });
    });

  const openFolder = useCallback(
    (folder: DriveFile) =>
      withFileLoading({ log: "Error opening folder:", message: t("dashboard.folderOpenError") }, async () => {
        setViewMode(VIEW_MODES.NORMAL);
        const { files } = await listFolder(folder.id);
        const trail = [...folderPath, { id: folder.id, name: folder.name }];
        showListing(files, folder.id, trail);
        pushFolderUrl(folder.id, trail);
      }),
    [withFileLoading, listFolder, showListing, folderPath, pushFolderUrl, t]
  );

  const goToFolder = useCallback(
    (index: number) =>
      withFileLoading({ log: "Error navigating:", message: t("dashboard.navigationFailed") }, async () => {
        setViewMode(VIEW_MODES.NORMAL);
        if (index > 0) {
          const crumb = folderPath[index];
          const destination = crumb.id || folderPlsFolderId || "root";
          const { files } = await listFolder(destination);
          const trail = folderPath.slice(0, index + 1);
          showListing(files, destination, trail);
          pushFolderUrl(crumb.id, trail);
          return;
        }
        if (!folderPlsFolderId) {
          setError(t("dashboard.folderPlsNotLoaded"));
          return;
        }
        const rootTrail = [{ id: folderPlsFolderId, name: folderPlsFolderName }];
        setFolderPath(rootTrail);
        pushFolderUrl(folderPlsFolderId, rootTrail);
        const { files } = await listFolder(folderPlsFolderId);
        setDriveFiles(files);
        setCurrentFolderId(folderPlsFolderId);
      }),
    [withFileLoading, listFolder, showListing, folderPath, folderPlsFolderId, folderPlsFolderName, pushFolderUrl, t, setError, setFolderPath, setDriveFiles, setCurrentFolderId]
  );

  const handleFolderExpand = useCallback(
    (folderId: string) => {
      if (folderChildrenData[folderId]) return;
      listFolder(folderId)
        .then(({ files }) => setFolderChildrenData((loaded) => ({ ...loaded, [folderId]: files })))
        .catch((err) => logger.error("Error loading folder contents:", err));
    },
    [listFolder, folderChildrenData, setFolderChildrenData]
  );

  const previewFileById = useCallback(
    async (fileId: string) => {
      const alreadyLoaded = [driveFiles, ...Object.values(folderChildrenData)].flat().find((f) => f.id === fileId);
      setPreviewFile(alreadyLoaded ?? (await executeDriveCall((token) => getDriveFile(token, fileId))));
    },
    [driveFiles, folderChildrenData, setPreviewFile, executeDriveCall]
  );

  const handleTreeItemClick = useCallback(
    (item: FolderTreeItem) => {
      if (!item.isFolder) {
        previewFileById(item.id).catch((err) => logger.error(err));
        return;
      }
      handleFolderExpand(item.id);
      void openFolder({ id: item.id, name: item.name, mimeType: "application/vnd.google-apps.folder" });
    },
    [handleFolderExpand, openFolder, previewFileById]
  );

  const navigateToFolderById = useCallback(
    async (folderId: string | null, trail?: FolderCrumb[]) => {
      if (!accessToken) return;
      await withFileLoading({ log: "Error navigating to folder:", message: t("dashboard.folderOpenFailed") }, async () => {
        const destination = folderId || "root";
        const { files } = await listDriveFiles(accessToken, { folderId: destination, pageSize: DEFAULT_PAGE_SIZE });
        setDriveFiles(files);
        setCurrentFolderId(destination);
        if (trail) setFolderPath(trail);
        setIsDriveConnected(true);
      });
    },
    [accessToken, withFileLoading, t, setDriveFiles, setCurrentFolderId, setFolderPath, setIsDriveConnected]
  );

  // URL changes (back/forward)
  useEffect(() => {
    if (!isDriveConnected || !accessToken || urlSyncInFlight.current) return;
    const folderParam = searchParams.get("folder");
    const destination = folderParam || folderPlsFolderId || "root";
    if (currentFolderId === destination) return;

    const defaultTrail: FolderCrumb[] =
      !folderParam && folderPlsFolderId
        ? [{ id: folderPlsFolderId, name: folderPlsFolderName }]
        : [MY_DRIVE_CRUMB];
    const trail = decodeFolderTrail(searchParams.get("path"), defaultTrail);

    urlSyncInFlight.current = true;
    void navigateToFolderById(destination, trail).finally(() => {
      urlSyncInFlight.current = false;
    });
  }, [searchParams, isDriveConnected, accessToken, currentFolderId, folderPlsFolderId, folderPlsFolderName, navigateToFolderById]);

  const refreshFiles = useCallback(
    () =>
      withFileLoading({ log: "Error refreshing:", message: t("dashboard.refreshFailed") }, async () => {
        if (!currentFolderId) return;
        const { files } = await listFolder(currentFolderId);
        setDriveFiles(files);
      }),
    [currentFolderId, withFileLoading, listFolder, t, setDriveFiles]
  );

  const { collections: smartCollections, saveCollection } = useSmartCollections();

  // First-time onboarding (only when not connected yet).
  useEffect(() => {
    if (isDriveConnected) return;
    if (typeof window === "undefined") return;
    const done = localStorage.getItem("onboarding_completed");
    if (!done) setOnboardingOpen(true);
  }, [isDriveConnected]);

  // Smart collection click
  const handleCollectionClick = useCallback(
    (collection: SmartCollection) => {
      setActiveCollectionId((prev) => (prev === collection.id ? null : collection.id));
    },
    []
  );

  const activeCollection = activeCollectionId
    ? smartCollections.find((c) => c.id === activeCollectionId) ?? null
    : null;

  // Koleksiyon iki yerden gelir: etkin arama (çipler ve metin) ya da etiket/özellik kaynağı.
  const handleSaveCollection = useCallback(async () => {
    const name = collectionName.trim();
    if (!name) return;
    if (collectionFromSearch ? !searchQuery.trim() && searchChips.length === 0 : !collectionSource) return;
    setIsSavingCollection(true);
    try {
      let filterGroup = toFilterGroup();
      if (!collectionFromSearch) {
        let condition: FilterCondition;
        if (collectionSource.startsWith("label:")) {
          condition = {
            id: `cond_${Date.now()}`,
            fieldType: "label",
            operator: "has_label",
            value: collectionSource.slice("label:".length),
          };
        } else {
          const rest = collectionSource.slice("prop:".length);
          const separator = rest.indexOf(":");
          condition = {
            id: `cond_${Date.now()}`,
            fieldType: "property",
            fieldId: rest.slice(0, separator),
            operator: "equals",
            value: rest.slice(separator + 1),
          };
        }
        filterGroup = { logic: "and", conditions: [condition] };
      }
      await saveCollection({ name, filterGroup });
      setSaveCollectionOpen(false);
      setCollectionName("");
      setCollectionSource("");
    } catch (err) {
      // Generic user-facing message only — full error is logged.
      logger.error("[Collections] Failed to save collection:", err);
      setError(t("dashboard.collectionSaveError"));
    } finally {
      setIsSavingCollection(false);
    }
  }, [collectionName, collectionFromSearch, collectionSource, searchQuery, searchChips, toFilterGroup, saveCollection, t, setError]);

  // Command palette result selection: open folders, preview files.
  const handlePaletteSelectFile = useCallback(
    (file: DriveFile) => {
      if (isFolder(file)) {
        void openFolder(file);
      } else {
        setPreviewFile(file);
      }
    },
    [openFolder, setPreviewFile]
  );

  const handlePickFolder = useCallback(async () => {
    if (!accessToken) return;
    const apiKey = getPickerApiKey();
    if (!apiKey) {
      logger.error("[Phase0] Google Picker API key not configured");
      setError(t("dashboard.pickerUnavailable"));
      return;
    }
    try {
      setIsPickingFolder(true);
      const appId = process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER;
      const docs = await openFolderPicker({
        accessToken,
        apiKey,
        ...(appId ? { appId } : {}),
        multiSelect: false,
      });
      if (docs.length === 0) return;
      const folder = docs[0];
      logger.debug("[Phase0] Folder picked:", { id: folder.id, name: folder.name });
      beginFileLoad();
      // Recursively fetch all files from the picked folder (proves drive.file + Picker access)
      let allFiles: DriveFile[];
      try {
        const filesWithPaths = await executeDriveCall((token) =>
          listDriveFilesRecursive(token, folder.id, folder.name)
        );
        allFiles = filesWithPaths.map(({ file }) => file);
        logger.debug(`[Phase0] Recursive fetch complete: ${allFiles.length} files found`);
      } catch (err) {
        // Log permission errors clearly per acceptance criteria
        logger.error("[Phase0] Permission/API error fetching folder contents:", err);
        setFolderNotListedName(folder.name);
        return;
      }
      // drive.file kapsamı Picker'da seçilen KLASÖRÜN çocuklarına erişim vermez: liste hatasız ama boş döner.
      // Sessizce eski listeye dönmek yerine açıkça söyle ve dosya seçimine yönlendir.
      if (!allFiles.some((f) => !isFolder(f))) {
        logger.warn("[picker] Picked folder returned no listable files; offering file picker");
        setFolderNotListedName(folder.name);
        return;
      }
      setFolderNotListedName(null);
      setDriveFiles(allFiles);
      startTrailAt({ id: folder.id, name: folder.name });
      setViewMode(VIEW_MODES.NORMAL);

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error("[Phase0] Picker error:", err);
      if (errMsg !== "Picker was cancelled") {
        // Generic user-facing message only — full error is logged above.
        setError(t("dashboard.pickerFailed"));
      }
    } finally {
      setIsPickingFolder(false);
      setIsLoadingFiles(false);
    }
  }, [accessToken, executeDriveCall, t, beginFileLoad, startTrailAt, setDriveFiles, setError, setIsLoadingFiles]);

  // Yedek akış: Picker'da dosyaları tek tek seç; listeye ekle, hepsini seçili yap, ilk kez ise ilk etiketi aç.
  const handlePickerSelect = useCallback(
    (files: DriveFile[]) => {
      if (!files || files.length === 0) return;
      setError(null);
      setFolderNotListedName(null);
      setViewMode(VIEW_MODES.NORMAL);
      setDriveFiles((prev) => {
        const existingIds = new Set(prev.map((f) => f.id));
        return [...files.filter((f) => !existingIds.has(f.id)), ...prev];
      });
      setSelectedIds(new Set(files.map((f) => f.id)));
      if (Object.keys(taggedItems).length === 0) {
        setLabelDialogFile({ id: files[0].id, name: files[0].name });
      }
    },
    [taggedItems, setDriveFiles, setError, setLabelDialogFile, setSelectedIds]
  );
  const filePicker = useGooglePicker(accessToken || "", handlePickerSelect);

  const getDisplayedFiles = (): DriveFile[] => {
    if (viewMode === VIEW_MODES.SEARCH) return searchResults.folders.concat(searchResults.files);
    if (!activeCollection) return driveFiles;
    try {
      const combined: Record<
        string,
        { labels: string[]; properties: Record<string, string | number | boolean | string[]> }
      > = {};
      for (const [id, labels] of Object.entries(taggedItems)) {
        combined[id] = {
          labels,
          properties: itemMetadata[id]?.properties ?? {},
        };
      }
      return applyFilters(driveFiles, activeCollection.filterGroup, combined);
    } catch {
      return driveFiles;
    }
  };

  const handleSelect = (file: DriveFile, additive?: boolean) => {
    setSelectedIds((current) => {
      if (!additive) {
        const isOnlySelection = current.size === 1 && current.has(file.id);
        return new Set(isOnlySelection ? [] : [file.id]);
      }
      const toggled = new Set(current);
      if (!toggled.delete(file.id)) toggled.add(file.id);
      return toggled;
    });
  };

  // Context menüdeki "Properties": paneli açar ve o öğeyi seçer.
  const openDetailsFor = useCallback(
    (file: DriveFile) => {
      setSelectedIds(new Set([file.id]));
      setDetailsPanelFileId(file.id);
      setDetailsOpen(true);
    },
    [setDetailsOpen, setDetailsPanelFileId, setSelectedIds]
  );

  // Panel açıkken seçimi izler: en son seçilen öğe gösterilir.
  useEffect(() => {
    if (!detailsOpen || selectedIds.size === 0) return;
    const last = Array.from(selectedIds).pop() ?? null;
    setDetailsPanelFileId(last);
  }, [detailsOpen, selectedIds, setDetailsPanelFileId]);

  const mergeMarqueeIntoSelection = useCallback(
    (ids: string[], additive: boolean) => {
      setSelectedIds((current) => new Set(additive ? [...current, ...ids] : ids));
    },
    [setSelectedIds]
  );



  const getSelectedFiles = (): DriveFile[] => getDisplayedFiles().filter(({ id }) => selectedIds.has(id));

  const {
    handleCreateFolder,
    handleUploadWithLabels,
    handleUpdateLabels,
    handleSaveLabels,
    handleRename,
    handleDeleteRequest,
    handleDeleteConfirm,
    handleDownload,
    handlePaste,
    handleMoveToFolder,
    handleBulkAddLabels
  } = useDriveOperations({
    labelStore,
    accessToken,
    executeDriveCall,
    refreshFiles,
    currentFolderId,
    viewMode,
    taggedItems,
    setTaggedItems,
    itemMetadata,
    setItemMetadata,
    taggedItemsTypes,
    setTaggedItemsTypes,
    userLabels,
    setUserLabels,
    setIsLoadingFiles,
    setError,
    getSafeMessage,
    t,
    selectedIds,
    setSelectedIds,
    getSelectedFiles,
    getDisplayedFiles,
    setDeleteConfirmOpen,
    setDeleteConfirmItems,
    deleteConfirmItems,
    setIsRenaming,
    setRenameFile,
    setIsUploading,
    setClipboard,
    clipboard
  });

  const askToDelete = (items: DriveFile[]) => {
    setDeleteConfirmItems(items);
    setDeleteConfirmOpen(true);
  };

  // file ops
  const putOnClipboard = (action: "copy" | "cut") => (file: DriveFile) => {
    const partOfSelection = selectedIds.size > 1 && selectedIds.has(file.id);
    setClipboard({ items: partOfSelection ? getSelectedFiles() : [file], action });
  };
  const handleCopy = putOnClipboard("copy");
  const handleCut = putOnClipboard("cut");
  const canPaste = Boolean(currentFolderId && clipboard?.items.length);







  // Graph model wants a flat TaggedItem[] (itemMetadata already carries labels/properties/
  // relations per item — no need to also thread the separate taggedItems Record through).
  const graphTaggedItems = useMemo(() => Object.values(itemMetadata), [itemMetadata]);
  // Graph node single click → open details panel
  const handleGraphNodeClick = useCallback(
    (nodeId: string, nodeType: GraphNodeType) => {
      if (nodeType === "root" || nodeType === "folder" || nodeType === "file") {
        setDetailsPanelFileId(nodeId);
        setDetailsOpen(true);
      }
    },
    [setDetailsOpen, setDetailsPanelFileId]
  );

  // Graph node double click → navigate into folder / preview file
  const handleGraphNodeDoubleClick = useCallback(
    (nodeId: string, nodeType: GraphNodeType) => {
      if (nodeType === "root") {
        goToFolder(0);
        setViewMode(VIEW_MODES.NORMAL);
      } else if (nodeType === "folder") {
        const file = allGraphFiles.find((f) => f.id === nodeId);
        if (file) {
          openFolder(file);
          setViewMode(VIEW_MODES.NORMAL);
        }
      } else if (nodeType === "file") {
        const file = allGraphFiles.find((f) => f.id === nodeId);
        if (file) {
          setPreviewFile(file);
        }
      }
    },
    [allGraphFiles, openFolder, goToFolder, setPreviewFile]
  );

  // labels helpers

  const getFileLabels = useCallback(
    (fileId: string): LabelItem[] => {
      const assigned = new Set(taggedItems[fileId] ?? []);
      return userLabels.filter(({ id }) => assigned.has(id));
    },
    [taggedItems, userLabels]
  );

  const loadTaggedItems = useCallback(
    async (kind: DriveItemKind): Promise<DriveFile[]> => {
      if (!accessToken) return [];
      setIsLoadingFiles(true);
      const collect = async () => {
        const wantFolders = kind === "folder";
        const items: DriveFile[] = [];
        for (const itemId of taggedIdsOfKind(taggedItems, taggedItemsTypes, kind)) {
          const item = await executeDriveCall((token) => getDriveFile(token, itemId)).catch((err) => {
            logger.warn(`Could not fetch ${kind} ${itemId}:`, err);
            return null;
          });
          if (item && isFolder(item) === wantFolders) items.push(item);
        }
        const firstLabelName = (item: DriveFile) => getFileLabels(item.id)[0]?.name || "";
        return items.sort((a, b) => firstLabelName(a).localeCompare(firstLabelName(b), "tr"));
      };
      return collect()
        .catch((err): DriveFile[] => {
          logger.error(`Error loading tagged ${kind}s:`, err);
          return [];
        })
        .finally(() => setIsLoadingFiles(false));
    },
    [accessToken, taggedItems, taggedItemsTypes, executeDriveCall, getFileLabels, setIsLoadingFiles]
  );



  useEffect(clearSelection, [viewMode, currentFolderId, clearSelection]);

  useEffect(() => {
    const kind = taggedKindForView(viewMode);
    if (kind && isDriveConnected && accessToken) void loadTaggedItems(kind).then(setDriveFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, isDriveConnected, accessToken]);

  // arama + debounce yukarıdaki useFileSearch kancasında

  const taggedFilesCount = taggedIdsOfKind(taggedItems, taggedItemsTypes, "file").length;
  const taggedFoldersCount = taggedIdsOfKind(taggedItems, taggedItemsTypes, "folder").length;

  const handleSidebarViewChange = useCallback(
    async (mode: SidebarViewMode) => {
      if (mode === "editLabels") {
        setEditLabelsOpen(true);
        return;
      }
      if (mode === "sharedWithMe" || mode === "sharedDrives" || mode === "sharedDriveFolder") return;
      setViewMode(mode);

      const taggedKind = taggedKindForView(mode);
      if (taggedKind) {
        if (isDriveConnected && accessToken) setDriveFiles(await loadTaggedItems(taggedKind));
      } else if (mode === "normal") {
        await withFileLoading({ log: "Error loading My Drive:", message: t("dashboard.filesLoadError") }, async () => {
          const destination = folderPlsFolderId || currentFolderId || "root";
          const { files } = await listFolder(destination);
          const homeTrail = folderPath[0] ? folderPath : [MY_DRIVE_CRUMB];
          showListing(
            files,
            destination,
            folderPlsFolderId ? [{ id: folderPlsFolderId, name: folderPlsFolderName }] : homeTrail
          );
        });
      } else if (mode === "trash") {
        await withFileLoading({ log: "Error loading trash:", message: t("dashboard.trashLoadError") }, async () => {
          const { files } = await executeDriveCall((token) =>
            listTrashedDriveFiles(token, { pageSize: DEFAULT_PAGE_SIZE })
          );
          setDriveFiles(files);
        });
      }
    },
    [
      folderPlsFolderId,
      folderPlsFolderName,
      currentFolderId,
      folderPath,
      isDriveConnected,
      accessToken,
      withFileLoading,
      listFolder,
      showListing,
      executeDriveCall,
      loadTaggedItems,
      setEditLabelsOpen,
      setDriveFiles,
      t,
    ]
  );

  if (loading || (accessToken && !isInitialized)) {
    return <DashboardShellSkeleton />;
  }

  const displayedFiles = getDisplayedFiles();
  const connectIssueBody =
    connectIssue === "popup_blocked"
      ? t("dashboard.drivePopupBlockedBody")
      : connectIssue === "failed"
        ? t("dashboard.driveConnectFailed")
        : null;
  const collectionPropertySources = propertyDefinitionsWithStatus.filter(
    (p) => (p.type === "select" || p.type === "status") && (p.options?.length ?? 0) > 0
  );
  const canSaveCollection = !!collectionName.trim() && (collectionFromSearch || !!collectionSource);
  const hasSearch = viewMode === VIEW_MODES.SEARCH;
  const regionLoading = hasSearch ? isSearching : isLoadingFiles;
  const regionError = !!error && !regionLoading && displayedFiles.length === 0;

  const itemProps = (file: DriveFile) => ({
    accessToken: accessToken || "",
    onOpenFolder: openFolder,
    onPreview: setPreviewFile,
    onCopy: handleCopy,
    onCut: handleCut,
    onDelete: handleDeleteRequest,
    onRename: setRenameFile,
    onAddLabel: setLabelDialogFile,
    onDownload: (f?: DriveFile) => handleDownload(f),
    onOpenDetails: openDetailsFor,
    selected: selectedIds.has(file.id),
    onSelect: handleSelect,
    labels: getFileLabels(file.id),
    statusOption: getStatusOption(file.id),
    dragFileIds: selectedIds.has(file.id) && selectedIds.size > 0 ? getSelectedFiles().map((f) => f.id) : [file.id],
    onMoveToFolder: handleMoveToFolder,
    getDisplayedFiles,
  });

  // Arama sonuçları tek liste (önce klasörler): sütun başlığının altına ayrı
  // "Folders (n) / Files (n)" grup satırı eklenmez.
  const fileGroups: FileGroup[] = hasSearch
    ? [{ key: "results", files: [...searchResults.folders, ...searchResults.files] }]
    : [{ key: "all", files: displayedFiles }];

  const labelMatches =
    hasSearch && displayMode === "list" && searchResults.labels.length > 0 ? (
      <>
        <div role="row" className="px-2 pb-1 pt-3 text-xs font-medium text-fg-3">
          <span role="cell">{`${t("dashboard.panel.labelsGroup")} (${searchResults.labels.length})`}</span>
        </div>
        {searchResults.labels.map(({ label, fileIds }) => (
          <div role="row" key={label.id} className="flex h-10 items-center gap-3 rounded-md px-2">
            <span role="cell" className="w-6 shrink-0" />
            <span role="cell" className="flex min-w-0 flex-1 items-center gap-2.5">
              <TagDot color={label.color} className="mx-1" />
              <span className="truncate text-base">{label.name}</span>
              <span className="text-sm text-fg-3 tabular-nums">
                {fileIds.length} {t("dashboard.filesAndFolders")}
              </span>
            </span>
          </div>
        ))}
      </>
    ) : null;

  const clearAllSearch = () => {
    setSearchQuery("");
    clearSearchChips();
  };

  const emptyState = hasSearch || activeCollection ? (
    <EmptyState
      icon={NoResultsIcon}
      title={t("dashboard.panel.noMatchesTitle")}
      body={t("dashboard.panel.noMatchesBody")}
      action={
        <Button variant="secondary" size="md" onClick={clearAllSearch}>
          {t("dashboard.panel.clearFilters")}
        </Button>
      }
    />
  ) : viewMode === VIEW_MODES.TAGGED_FILES || viewMode === VIEW_MODES.TAGGED_FOLDERS ? (
    <EmptyState
      icon={TagIcon}
      title={t("dashboard.panel.emptyTaggedTitle")}
      body={t("dashboard.panel.emptyTaggedBody")}
      action={
        <Button variant="secondary" size="md" onClick={() => setEditLabelsOpen(true)}>
          {t("dashboard.panel.manageLabels")}
        </Button>
      }
    />
  ) : viewMode === VIEW_MODES.TRASH ? (
    <EmptyState icon={DeleteIcon} title={t("dashboard.panel.emptyTrashTitle")} body={t("dashboard.panel.emptyTrashBody")} />
  ) : driveFiles.length === 0 && folderPath.length <= 1 ? (
    <EmptyState
      icon={ImportIcon}
      title={t("dashboard.panel.emptyPickTitle")}
      body={t("dashboard.panel.emptyPickBody")}
      action={
        <Button size="md" className="gap-2" onClick={() => void filePicker.open()} loading={filePicker.isLoading}>
          <ImportIcon className="h-4 w-4" aria-hidden="true" />
          {t("dashboard.panel.pickFilesToOrganize")}
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={FolderIcon}
      title={t("dashboard.panel.emptyFolderTitle")}
      body={t("dashboard.panel.emptyFolderBody")}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          {canPaste && (
            <Button size="md" className="gap-2" onClick={() => void handlePaste()}>
              <PasteIcon className="h-4 w-4" aria-hidden="true" />
              {t("dashboard.panel.pasteHere")}
            </Button>
          )}
          <Button variant="secondary" size="md" className="gap-2" onClick={() => setUploadDialogOpen(true)}>
            <UploadIcon className="h-4 w-4" aria-hidden="true" />
            {t("dashboard.panel.uploadFiles")}
          </Button>
        </div>
      }
    />
  );

  const retryRegion = () => {
    setError(null);
    if (!isDriveConnected) void connectDrive();
    else if (viewMode === VIEW_MODES.NORMAL || viewMode === VIEW_MODES.SEARCH) void refreshFiles();
    else void handleSidebarViewChange(viewMode as SidebarViewMode);
  };

  const errorState = (
    <ErrorState
      title={t("dashboard.panel.errorFolderTitle")}
      body={t("dashboard.panel.errorDriveBody")}
      details={error}
      onRetry={retryRegion}
      retryLabel={t("dashboard.panel.tryAgain")}
      detailsLabel={t("dashboard.panel.details")}
    />
  );

  // Arama/filtre bir görünüm değil, içinde bulunulan klasörün daraltılmış hali:
  // başlık breadcrumb olarak kalır ("Search results"a dönmez).
  const pageTitle =
    viewMode === VIEW_MODES.NORMAL || hasSearch ? (
      <DriveBreadcrumb
        segments={folderPath.map((folder, index) => ({
          key: folder.id || "root",
          label: index === 0 ? t("dashboard.panel.drive") : folder.name,
          onClick: () => goToFolder(index),
        }))}
      />
    ) : (
      <PageTitle>
        {(viewMode === VIEW_MODES.TAGGED_FILES || viewMode === VIEW_MODES.TAGGED_FOLDERS) && t("dashboard.panel.tagged")}
        {viewMode === VIEW_MODES.TRASH && t("dashboard.panel.trash")}
        {viewMode === VIEW_MODES.GRAPH && t("dashboard.panel.graph")}
      </PageTitle>
    );

  const showFilter = viewMode !== VIEW_MODES.GRAPH && viewMode !== VIEW_MODES.TRASH;
  const topBarActions =
    viewMode === VIEW_MODES.GRAPH ? (
      <MobileSearchButton onClick={openPalette} />
    ) : (
      <>
        <MobileSearchButton onClick={openPalette} />
        {showFilter && (
          <AddFilterMenu
            userLabels={userLabels}
            propertyDefinitions={propertyDefinitions}
            files={searchScopeFiles}
            onAdd={addSearchChip}
            trigger={<FilterTrigger count={searchChips.length} />}
          />
        )}
        <ViewMenu
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          sort={sort}
          onSortChange={setSort}
          detailsOpen={detailsOpen}
          onDetailsOpenChange={setDetailsOpen}
        />
        {viewMode !== VIEW_MODES.TRASH && (
          <Button
            size="md"
            className="gap-2 max-sm:size-10 max-sm:px-0"
            onClick={() => void filePicker.open()}
            loading={filePicker.isLoading}
            aria-label={t("dashboard.panel.pickFilesToOrganize")}
          >
            <ImportIcon className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t("dashboard.panel.pickFilesToOrganize")}</span>
          </Button>
        )}
        {viewMode !== VIEW_MODES.TRASH && (
          <NewMenu
            onUpload={() => setUploadDialogOpen(true)}
            onNewFolder={() => setCreateFolderDialogOpen(true)}
            onPaste={canPaste ? () => void handlePaste() : undefined}
            extraItems={
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    setCollectionFromSearch(false);
                    setCollectionName("");
                    setCollectionSource("");
                    setSaveCollectionOpen(true);
                  }}
                >
                  <BookmarkIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
                  {t("dashboard.createCollection")}
                </DropdownMenuItem>
              </>
            }
          />
        )}
      </>
    );

  const detailsFile =
    detailsPanelFileId == null
      ? null
      : driveFiles.find((f) => f.id === detailsPanelFileId) ||
        allGraphFiles.find((f) => f.id === detailsPanelFileId) ||
        searchScopeFiles.find((f) => f.id === detailsPanelFileId) ||
        (detailsPanelFileId === folderPlsFolderId
          ? ({ id: folderPlsFolderId, name: folderPlsFolderName || "FolderPls", mimeType: "application/vnd.google-apps.folder" } as DriveFile)
          : null);

  const mainContent = (
    <div
      className="relative flex h-full min-h-0 overflow-hidden"
      {...dropZoneProps}
    >
      {isDragOver && (
        <div className="pointer-events-none absolute inset-2 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-control bg-canvas/90">
          <p className="text-lg font-semibold text-fg">{t("dashboard.dropToUpload")}</p>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {isDriveConnected ? (
          <>
            <DriveTopBar
              title={pageTitle}
              actions={topBarActions}
              selection={
                selectedIds.size > 0
                  ? {
                      count: selectedIds.size,
                      onClear: () => setSelectedIds(new Set()),
                      onLabel: () => setBulkLabelOpen(true),
                      onDownload: () => handleDownload(),
                      onDelete: () => {
                        askToDelete(getSelectedFiles());
                      },
                    }
                  : null
              }
            />

            {/* Jetonun süresi doldu: liste ve etiketler yerinde kalır, tek tıkla yeniden bağlanılır. */}
            {driveStatus === "expired" && (
              <Notice
                action={
                  <Button
                    size="sm"
                    onClick={() =>
                      void requestDriveConnection().then((token) => {
                        if (token) void refreshFiles();
                      })
                    }
                  >
                    {t("dashboard.reconnectDrive")}
                  </Button>
                }
              >
                {connectIssueBody ?? t("dashboard.driveSessionExpired")}
              </Notice>
            )}

            {/* Seçilen klasörün dosyaları listelenemedi: açık söyle, dosya seçimine yönlendir (sessiz geri dönüş yok). */}
            {folderNotListedName && (
              <Notice
                onDismiss={() => setFolderNotListedName(null)}
                dismissLabel={t("dashboard.panel.dismiss")}
                action={
                  <Button size="sm" onClick={() => void filePicker.open()} loading={filePicker.isLoading}>
                    {t("dashboard.panel.pickFilesInstead")}
                  </Button>
                }
              >
                {t("dashboard.folderNotListed").replace("{name}", folderNotListedName)}
              </Notice>
            )}

            {hasSearch && (
              <FilterChipBar
                chips={searchChips}
                query={searchQuery.trim()}
                info={t("dashboard.panel.searchingLoadedOnly")}
                onClearQuery={() => setSearchQuery("")}
                onRemove={removeSearchChip}
                onClearAll={clearAllSearch}
                onSaveView={
                  hasSearch
                    ? () => {
                        const defaultName = searchQuery.trim() || searchChips.map((c) => c.displayLabel).join(", ");
                        setCollectionName(defaultName);
                        setCollectionFromSearch(true);
                        setSaveCollectionOpen(true);
                      }
                    : undefined
                }
              />
            )}

            {viewMode === VIEW_MODES.GRAPH ? (
              <div className="relative h-full min-h-0 flex-1 overflow-hidden">
                {isLoadingGraph ? (
                  <div className="px-4 py-3">
                    <Progress
                      label={
                        graphLoadedCount > 0
                          ? t("dashboard.panel.filesLoaded").replace("{count}", String(graphLoadedCount))
                          : t("dashboard.panel.loadingFiles")
                      }
                    />
                  </div>
                ) : regionError ? (
                  errorState
                ) : folderPlsFolderId ? (
                  <GraphPanel
                    files={searchScopeFiles}
                    taggedItems={graphTaggedItems}
                    labels={userLabels}
                    properties={propertyDefinitionsWithStatus}
                    rootFolderId={folderPlsFolderId}
                    rootFolderName={t("dashboard.panel.drive")}
                    onSelectNode={handleGraphNodeClick}
                    onOpenNode={handleGraphNodeDoubleClick}
                  />
                ) : null}
              </div>
            ) : (
              <MarqueeSelection
                onMarqueeSelect={mergeMarqueeIntoSelection}
                enabled={!isLoadingFiles && displayedFiles.length > 0}
                className="flex min-h-0 flex-1 flex-col overflow-y-auto"
              >
                {regionError ? (
                  errorState
                ) : (
                  <FileCollection
                    displayMode={displayMode}
                    loading={regionLoading}
                    groups={fileGroups}
                    extra={labelMatches}
                    empty={emptyState}
                    itemProps={itemProps}
                    sort={sort}
                    onSortChange={setSort}
                    selectedCount={selectedIds.size}
                    onToggleAll={() =>
                      setSelectedIds((prev) =>
                        prev.size >= displayedFiles.length ? new Set() : new Set(displayedFiles.map((f) => f.id))
                      )
                    }
                    ariaLabel={t("dashboard.panel.filesGroup")}
                  />
                )}
              </MarqueeSelection>
            )}
          </>
        ) : (
          <>
            <DriveTopBar title={<PageTitle>{t("dashboard.panel.drive")}</PageTitle>} />
            {error ? (
              errorState
            ) : (
              <EmptyState
                icon={DriveIcon}
                title={t(connectIssue === "popup_blocked" ? "dashboard.drivePopupBlockedTitle" : "dashboard.panel.connectTitle")}
                body={connectIssueBody ?? t(driveStatus === "expired" ? "dashboard.driveSessionExpired" : "dashboard.panel.connectBody")}
                action={
                  <Button size="md" className="gap-2" onClick={connectDrive} loading={isLoadingFiles}>
                    <DriveIcon className="h-4 w-4" aria-hidden="true" />
                    {t(driveStatus === "expired" || connectIssue ? "dashboard.reconnectDrive" : "dashboard.connectDrive")}
                  </Button>
                }
              />
            )}
          </>
        )}

        {/* Eylem hatası: liste dururken (bölge yüklendi) kısa bildirim. */}
        {error && !regionError && isDriveConnected && driveStatus !== "expired" && (
          <Toast tone="danger" onDismiss={() => setError(null)} dismissLabel={t("dashboard.panel.dismiss")}>
            {error}
          </Toast>
        )}

        {/* Başka hesaba geçildi: o hesabın etiketleri açıldı, öncekiler ayrı duruyor. */}
        {accountSwitch && !error && (
          <Toast onDismiss={dismissAccountSwitch} dismissLabel={t("dashboard.panel.dismiss")} duration={8000}>
            {accountSwitch.email
              ? t("dashboard.accountSwitched").replace("{account}", accountSwitch.email)
              : t("dashboard.accountSwitchedUnknown")}
          </Toast>
        )}

        <DriveFileDialogs
          ui={workspaceUi}
          operations={{
            handleSaveLabels,
            handleRename,
            handleUpdateLabels,
            handleUploadWithLabels,
            handleBulkAddLabels,
            handleCreateFolder,
            handleDeleteConfirm,
          }}
          accessToken={accessToken || ""}
          currentFolderId={currentFolderId}
          userLabels={userLabels}
          taggedItems={taggedItems}
          deletesPermanently={viewMode === VIEW_MODES.TRASH}
          busy={isLoadingFiles}
        />
        <Dialog
          open={saveCollectionOpen}
          onOpenChange={(open) => {
            if (!open) {
              setSaveCollectionOpen(false);
              setCollectionName("");
              setCollectionSource("");
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t(collectionFromSearch ? "dashboard.saveCollection" : "dashboard.createCollection")}</DialogTitle>
              <DialogDescription>
                {t(collectionFromSearch ? "dashboard.saveCollectionDesc" : "dashboard.createCollectionDesc")}
              </DialogDescription>
            </DialogHeader>
            {!collectionFromSearch && userLabels.length === 0 && collectionPropertySources.length === 0 ? (
              <p className="py-2 text-sm text-fg-2">{t("dashboard.collectionNoSources")}</p>
            ) : (
              <div className="space-y-3">
                <Input
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  placeholder={t("dashboard.collectionNamePlaceholder")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canSaveCollection && !isSavingCollection) {
                      void handleSaveCollection();
                    }
                  }}
                  autoFocus
                />
                {!collectionFromSearch && (
                  <Select value={collectionSource} onValueChange={setCollectionSource}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("dashboard.collectionPickSource")} />
                    </SelectTrigger>
                    <SelectContent className="z-[110]">
                      {userLabels.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>{t("dashboard.collections")}</SelectLabel>
                          {userLabels.map((label) => (
                            <SelectItem key={label.id} value={`label:${label.id}`}>
                              {label.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {collectionPropertySources.map((prop) => (
                        <SelectGroup key={prop.id}>
                          <SelectLabel>{prop.name}</SelectLabel>
                          {prop.options?.map((opt) => (
                            <SelectItem key={opt.id} value={`prop:${prop.id}:${opt.id}`}>
                              {opt.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setSaveCollectionOpen(false);
                  setCollectionName("");
                  setCollectionSource("");
                }}
                disabled={isSavingCollection}
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={() => void handleSaveCollection()} disabled={!canSaveCollection} loading={isSavingCollection}>
                {t("common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <FoundRootFolderDialog
          folder={foundRootFolder}
          busy={isLoadingFiles}
          onDismiss={() => setFoundRootFolder(null)}
          onChoose={(keepFound) => void settleFoundRootFolder(keepFound)}
        />
      </div>

      <DetailsDock open={detailsOpen} onClose={() => setDetailsOpen(false)}>
        {detailsFile ? (
          <FileDetailsPanel
            file={detailsFile}
            onClose={() => setDetailsOpen(false)}
            userLabels={userLabels}
            itemLabels={taggedItems[detailsFile.id] || []}
            propertyDefinitions={propertyDefinitionsWithStatus}
            itemProperties={itemMetadata[detailsFile.id]?.properties || {}}
            itemNotes={itemMetadata[detailsFile.id]?.notes || []}
            itemRelations={itemMetadata[detailsFile.id]?.relations || []}
            availableFiles={driveFiles}
            onUpdate={reloadLabeledItems}
          />
        ) : undefined}
      </DetailsDock>
    </div>
  );

  const sidebarViewMode = sidebarModeFor(viewMode, editLabelsOpen);

  return (
    <DashboardShell
      account={driveAccount}
      driveStatus={driveStatus}
      onConnectDrive={() => void connectDrive()}
      onDisconnectDrive={handleDisconnect}
      sidebarNav={{
        onOpenSearch: openPalette,
        onChangeFolder: isDriveConnected ? () => void handlePickFolder() : undefined,
        changingFolder: isPickingFolder,
        viewMode: sidebarViewMode,
        onViewChange: handleSidebarViewChange,
        taggedFilesCount,
        taggedFoldersCount,
        isDriveConnected,
        driveStorage,
        folderPath: viewMode === VIEW_MODES.NORMAL ? folderPath : undefined,
        onFolderNavigate: goToFolder,
        folderTreeItems: viewMode === VIEW_MODES.NORMAL && driveFiles.length > 0 ? toTreeItems(driveFiles) : undefined,
        onFolderTreeItemClick: handleTreeItemClick,
        folderChildren,
        onFolderExpand: handleFolderExpand,
        rootTreeItems: rootTreeItems.length === 0 ? undefined : rootTreeItems,
        ensureExpandedFolderIds: folderPath.slice(1).flatMap((crumb) => crumb.id ?? []),
        smartCollections,
        onCollectionClick: handleCollectionClick,
        activeCollectionId,
      }}
    >
      <>
        {mainContent}
        <OnboardingDialog
          open={onboardingOpen}
          onClose={() => setOnboardingOpen(false)}
          onPickFiles={() => {
            setOnboardingOpen(false);
            if (isDriveConnected) void filePicker.open();
            else void connectDrive();
          }}
          driveConnected={isDriveConnected}
          t={t}
        />
        <SearchCommandDialog
          open={isPaletteOpen}
          onOpenChange={(next) => (next ? openPalette() : closePalette())}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          chips={searchChips}
          onRemoveChip={removeSearchChip}
          rankedResults={rankedSearchResults}
          recentSearches={recentSearches}
          onClearRecentSearches={clearRecentSearches}
          suggestions={searchSuggestions}
          onCommit={commitSearch}
          onSelectFile={handlePaletteSelectFile}
        />
      </>
    </DashboardShell>
  );
}

const GoogleDriveDashboardPage = () => (
  <Suspense fallback={<DashboardShellSkeleton />}>
    <DriveWorkspace />
  </Suspense>
);

export default GoogleDriveDashboardPage;

