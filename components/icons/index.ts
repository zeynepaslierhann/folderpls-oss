/**
 * FolderPls'in TEK ikon kaynağı. `lucide-react` yalnız burada import edilir
 * (eslint `no-restricted-imports` ve tests/unit/icons-single-source.test.ts kilitler).
 *
 * Kurallar (ana sayfa referans):
 * - Ad kavramı söyler, çizimi değil: "silme" her yerde DeleteIcon. Bir çizim tek adla çıkar.
 * - Stroke her yerde lucide varsayılanı 2; `strokeWidth` verilmez.
 * - Boyut ölçeği (Tailwind): site 12·14·16·20·24 px, panel 12·14·16·32 px.
 *   Panelde 16 varsayılan, 32 boş/hata durumu; açılır menü radyo noktası 8 px.
 * - Renk: panelde text-fg / fg-2 / fg-3 / danger, sitede brand token'ları.
 * - Yalnız adlandırılmış yeniden dışa aktarım: `import *` ve nesne haritası yok,
 *   ağaç sallama kullanılmayan ikonları pakete sokmaz.
 */
export type { LucideIcon as IconComponent } from "lucide-react";

export {
  // Dosya türleri (FILE_TYPE_ICONS bunları kullanır: ./file-types.ts)
  Folder as FolderIcon,
  File as FileIcon,
  FileImage as ImageIcon,
  Film as VideoIcon,
  Music as AudioIcon,
  FileText as DocumentIcon,
  FileSpreadsheet as SpreadsheetIcon,
  Presentation as PresentationIcon,

  // Klasör ve dosya eylemleri
  Files as FilesIcon,
  FileSearch as FileSearchIcon,
  FileType as FileKindIcon,
  FolderLock as FolderLockIcon,
  FolderPlus as NewFolderIcon,
  FolderSearch as FolderSearchIcon,
  Upload as UploadIcon,
  ClipboardPaste as PasteIcon,
  CloudUpload as CloudBackupIcon,
  Download as DownloadIcon,
  Import as ImportIcon,
  Copy as CopyIcon,
  Scissors as CutIcon,
  Pencil as EditIcon,
  Trash2 as DeleteIcon,
  Plus as AddIcon,
  Minus as MinusIcon,
  RotateCcw as ResetIcon,
  ExternalLink as ExternalLinkIcon,
  Send as SendIcon,

  // Etiket, ilişki, not
  Tag as TagIcon,
  Tags as TagsIcon,
  Link2 as LinkIcon,
  Unlink as DisconnectIcon,
  Bookmark as BookmarkIcon,
  TimerReset as ExpiryIcon,
  CalendarClock as PlannedIcon,

  // Özellik türleri
  Calendar as CalendarIcon,
  CheckSquare as CheckboxIcon,
  CircleDot as CircleDotIcon,
  Hash as NumberIcon,
  Heading as HeadingIcon,
  List as ListIcon,
  Type as TextTypeIcon,

  // Arama, filtre, görünüm
  Search as SearchIcon,
  SearchX as NoResultsIcon,
  Filter as FilterIcon,
  LayoutGrid as GridViewIcon,
  PanelRight as DetailsPanelIcon,
  Share2 as GraphIcon,
  Diamond as GraphRootIcon,
  Crosshair as FocusIcon,

  // Durum
  AlertCircle as AlertIcon,
  CheckCircle2 as SuccessIcon,
  XCircle as XCircleIcon,
  CircleHelp as HelpIcon,
  Info as InfoIcon,
  Check as CheckIcon,
  X as CloseIcon,
  Circle as RadioDotIcon,
  Clock as ClockIcon,

  // Gezinme
  ArrowDown as ArrowDownIcon,
  ArrowDownCircle as ScrollDownIcon,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  ArrowUp as ArrowUpIcon,
  MoveRight as MoveRightIcon,
  ChevronDown as ChevronDownIcon,
  ChevronRight as ChevronRightIcon,
  ChevronUp as ChevronUpIcon,
  Menu as MenuIcon,
  MoreHorizontal as MoreIcon,
  Home as HomeIcon,

  // Hesap, uygulama, site
  HardDrive as DriveIcon,
  User as UserIcon,
  UserCog as AccountSettingsIcon,
  MessageSquare as FeedbackIcon,
  Mail as MailIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  Languages as LanguageIcon,
  Globe as GlobeIcon,
  Code as CodeIcon,
  Layers as LayersIcon,
  ShieldCheck as SecurityIcon,
  Sparkles as SparklesIcon,
} from "lucide-react";
