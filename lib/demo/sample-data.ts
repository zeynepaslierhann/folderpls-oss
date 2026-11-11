/**
 * /demo örnek verisi: UYDURMA dosyalar, müşteriler ve etiketler. Gerçek kullanıcı verisi, gerçek müşteri
 * ya da şirket adı ya da Drive bağlantısı YOK. "Acme" ve "Birch & Co" bilerek genel, kurgusal adlardır.
 *
 * Kurallar (pazarlama planı §5 "Görsel kapı"): klasör ağacı, Picker akışı ve fiyat yok.
 * `webViewLink` ve `parents` YOK: bağlam menüsündeki "Open in Drive" yalnız webViewLink varsa görünür, burada hiç görünmez.
 */

import type { DriveFile, LabelItem } from "@/lib/types";
import { PRESET_COLORS } from "@/lib/constants/colors";

export const DEMO_LABELS: LabelItem[] = [
  { id: "l-invoice", name: "Invoice", color: PRESET_COLORS[0] },
  { id: "l-draft", name: "Draft", color: PRESET_COLORS[1] },
  { id: "l-review", name: "In review", color: PRESET_COLORS[2] },
  { id: "l-approved", name: "Approved", color: PRESET_COLORS[3] },
  { id: "l-2026", name: "2026", color: PRESET_COLORS[4] },
  { id: "l-acme", name: "Client · Acme", color: PRESET_COLORS[5] },
  { id: "l-birch", name: "Client · Birch & Co", color: PRESET_COLORS[6] },
  { id: "l-q4", name: "Q4 campaign", color: PRESET_COLORS[7] },
];

const DOC = "application/vnd.google-apps.document";
const SHEET = "application/vnd.google-apps.spreadsheet";

export interface DemoSampleFile extends DriveFile {
  /** Dosyanın (uydurma) Drive konumu: etiketlemek konumu DEĞİŞTİRMEZ; ayrıntı panelinde sabit satır olarak görünür. */
  location: string;
  /** Başlangıç etiketleri (etiket kimlikleri). */
  labelIds: string[];
}

export const DEMO_FILES: DemoSampleFile[] = [
  { id: "demo-01", name: "acme-logo-final.pdf", mimeType: "application/pdf", size: "482000", modifiedTime: "2026-10-02T09:30:00Z", location: "Clients / Acme / Logos", labelIds: ["l-acme", "l-approved", "l-2026"] },
  { id: "demo-02", name: "acme-logo-v3.png", mimeType: "image/png", size: "1240000", modifiedTime: "2026-09-18T14:05:00Z", location: "Clients / Acme / Logos / Old versions", labelIds: ["l-acme", "l-review"] },
  { id: "demo-03", name: "acme-brand-guidelines.pdf", mimeType: "application/pdf", size: "5320000", modifiedTime: "2026-08-21T11:00:00Z", location: "Clients / Acme / Brand", labelIds: ["l-acme", "l-approved", "l-2026"] },
  { id: "demo-04", name: "acme-invoice-0412.pdf", mimeType: "application/pdf", size: "96000", modifiedTime: "2026-04-12T08:15:00Z", location: "Finance / Invoices / 2026", labelIds: ["l-acme", "l-invoice", "l-2026"] },
  { id: "demo-05", name: "acme-kickoff-notes", mimeType: DOC, modifiedTime: "2026-03-03T16:40:00Z", location: "Clients / Acme / Meetings", labelIds: ["l-acme", "l-2026"] },
  { id: "demo-06", name: "birch-homepage-mockup.png", mimeType: "image/png", size: "2860000", modifiedTime: "2026-10-09T10:20:00Z", location: "Clients / Birch & Co / Web", labelIds: ["l-birch", "l-review", "l-q4"] },
  { id: "demo-07", name: "birch-q4-campaign-brief", mimeType: DOC, modifiedTime: "2026-10-05T13:00:00Z", location: "Clients / Birch & Co / Campaigns", labelIds: ["l-birch", "l-q4", "l-approved"] },
  { id: "demo-08", name: "birch-invoice-0923.pdf", mimeType: "application/pdf", size: "101000", modifiedTime: "2026-09-23T09:00:00Z", location: "Finance / Invoices / 2026", labelIds: ["l-birch", "l-invoice", "l-2026"] },
  { id: "demo-09", name: "birch-team-photo.jpg", mimeType: "image/jpeg", size: "3400000", modifiedTime: "2026-07-14T12:30:00Z", location: "Clients / Birch & Co / Photos", labelIds: ["l-birch", "l-approved"] },
  { id: "demo-10", name: "q4-social-calendar", mimeType: SHEET, modifiedTime: "2026-10-11T07:45:00Z", location: "Campaigns / Q4", labelIds: ["l-q4", "l-draft"] },
  { id: "demo-11", name: "launch-teaser.mp4", mimeType: "video/mp4", size: "48200000", modifiedTime: "2026-10-10T18:10:00Z", location: "Campaigns / Q4 / Video", labelIds: ["l-q4", "l-review"] },
  { id: "demo-12", name: "brand-moodboard.pdf", mimeType: "application/pdf", size: "7100000", modifiedTime: "2026-06-30T10:00:00Z", location: "Studio / Inspiration", labelIds: ["l-draft"] },
];
