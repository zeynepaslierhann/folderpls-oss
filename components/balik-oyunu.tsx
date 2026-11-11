"use client"

/*
 * Balık oyunu: 404 sayfalarının imza küçük hareketi.
 *
 * Tek dosya, bağımlılıksız (React + Canvas 2D). Mantık burada; görünüm `tema`
 * ile dışarıdan gelir, böylece her proje kendi renginde aynı oyunu gösterir.
 * Yalnız kendi projelerde kullanılır; müşteri işlerine eklenmez.
 *
 * Oynanış: Flappy tarzı. Balık yavaşça batar, her dokunuşta yukarı yüzer.
 * Yukarıdan sarkan oltalar ile aşağıdan yükselen yosun/mercan arasındaki
 * boşluktan geçer; her geçiş bir puan.
 *
 * Teknik notlar:
 * - Fizik delta-time ile, en fazla 1/120 sn'lik alt adımlara bölünerek
 *   işlenir: 60, 120 ve 144 Hz ekranlarda aynı hız ve zıplama yüksekliği.
 * - Tuval devicePixelRatio ile ölçeklenir; boyut/zoom değişince yeniden kurulur.
 * - Sekme gizlenince veya oyun ekrandan çıkınca döngü durur (oyun duraklar).
 * - prefers-reduced-motion: otomatik hareket yok, sakin statik sahne + "oyna".
 * - Tema renkleri CSS değişkeni de olabilir (`hsl(var(--primary))` gibi);
 *   tarayıcıdan çözülür, site teması değişince yeniden okunur.
 */

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ */
/* Dış arayüz                                                          */
/* ------------------------------------------------------------------ */

export interface BalikTemasi {
  /** Derin su: sahnenin alt tonu ve arka plan. */
  zemin: string
  /** Yüzeye yakın su: derinlik gradyanının üst tonu. */
  su: string
  /** Balığın gövdesi. */
  balik: string
  /** Skor, düğme, odak halkası, balığın kabarcık izi. */
  vurgu: string
  /** Metin, olta ipi ve iğnesi, ışık huzmesi, ortam kabarcıkları. */
  metin: string
  /** Yosun, mercan ve deniz tabanı. */
  engel: string
  /** İsteğe bağlı CSS font-family. Verilmezse sayfadan miras alınır. */
  yaziTipi?: string
}

interface BalikMetinleri {
  ipucu: string
  basla: string
  tekrar: string
  devam: string
  duraklatildi: string
  oyunBitti: string
  skor: string
  rekor: string
  yeniRekor: string
  tuvalEtiketi: string
}

export interface BalikOyunuProps {
  tema?: Partial<BalikTemasi>
  /** Oyunun üstünde isteğe bağlı başlık. */
  baslik?: string
  /** Başlığın altında isteğe bağlı kısa metin. */
  altMetin?: string
  /** Arayüz metinleri; verilmeyenler İngilizce varsayılanla dolar. */
  metinler?: Partial<BalikMetinleri>
  /** En iyi skorun localStorage anahtarı. */
  rekorAnahtari?: string
  className?: string
}

/** Varsayılan: imzanın özgün hâli (koyu yeşil su, marka altını balık). */
const VARSAYILAN_TEMA: BalikTemasi = {
  zemin: "#0E1F1C",
  su: "#1E3A33",
  balik: "#A38560",
  vurgu: "#A38560",
  metin: "#F3ECDF",
  engel: "#2E5449",
}

const VARSAYILAN_METINLER: BalikMetinleri = {
  ipucu: "Space, click or tap to swim up. Slip between the hooks and the weeds.",
  basla: "Play",
  tekrar: "Play again",
  devam: "Continue",
  duraklatildi: "Paused",
  oyunBitti: "Caught",
  skor: "Score",
  rekor: "Best",
  yeniRekor: "New best",
  tuvalEtiketi:
    "Fish game. Press space or tap to swim up and pass between fishing hooks and seaweed.",
}

/* ------------------------------------------------------------------ */
/* Sabitler (mantıksal sahne birimi: px, saniye)                        */
/* ------------------------------------------------------------------ */

const W = 640
const H = 240
const YUZEY = 10
const TABAN = H - 12
const BALIK_X = 160
const TAVAN_Y = YUZEY + 12

const YERCEKIMI = 620
const ZIPLAMA = -225
const MAX_DUSUS = 290

const HIZ_ILK = 140
const HIZ_ARTIS = 2.5
const HIZ_MAX = 210
const ARALIK = 215
const BOSLUK_ILK = 90
const BOSLUK_MIN = 68
const YOSUN_GEN = 26
const KAYA_GEN = 44

const ALT_ADIM = 1 / 120
const MAX_KARE = 0.1
const CARPMA_SURESI = 0.85
const YENIDEN_BEKLEME_MS = 350
const MAX_KABARCIK = 90
const MAX_DPR = 3

/* ------------------------------------------------------------------ */
/* İç tipler                                                           */
/* ------------------------------------------------------------------ */

type Faz = "hazir" | "oynuyor" | "carpti" | "duraklatildi" | "bitti"
type GorunurFaz = Exclude<Faz, "carpti">

interface Engel {
  x: number
  merkez: number
  bosluk: number
  tur: "yosun" | "kaya"
  tohum: number
  gecildi: boolean
}

interface Kabarcik {
  x: number
  y: number
  r: number
  vy: number
  faz: number
  yas: number
  omur: number
  /** Balığın izi mi (dünyayla kayar, solar), ortam mı. */
  iz: boolean
}

interface Balik {
  y: number
  vy: number
  aci: number
  kuyruk: number
  cirpinma: number
  ezilme: number
  izSayac: number
}

interface Oyun {
  faz: Faz
  fazSuresi: number
  bittiAni: number
  t: number
  balik: Balik
  engeller: Engel[]
  kabarciklar: Kabarcik[]
  hiz: number
  mesafe: number
  kayma: number
  skor: number
  rekor: number
  sonMerkez: number
  flas: number
  kabarcikSayac: number
}

type Rgb = readonly [number, number, number]
type RenkAdi = "zemin" | "su" | "balik" | "vurgu" | "metin" | "engel"
type Renkler = Record<RenkAdi, Rgb>
const RENK_ADLARI: readonly RenkAdi[] = ["zemin", "su", "balik", "vurgu", "metin", "engel"]

interface Gradyanlar {
  arka: CanvasGradient
  isik: CanvasGradient
}

type Kutu = readonly [number, number, number, number]

/* ------------------------------------------------------------------ */
/* Yardımcılar                                                         */
/* ------------------------------------------------------------------ */

const sinirla = (d: number, a: number, b: number) => Math.min(b, Math.max(a, d))
const rastgele = (a: number, b: number) => a + Math.random() * (b - a)
const yaklas = (simdi: number, hedef: number, hiz: number, dt: number) =>
  simdi + (hedef - simdi) * (1 - Math.exp(-hiz * dt))

/** Tohumdan kararlı sözde-rastgele [0, 1): kayaların biçimi her karede aynı kalsın. */
function sozde(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453
  return s - Math.floor(s)
}

function boya(c: Rgb, alfa = 1): string {
  return alfa >= 1 ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alfa})`
}

/**
 * Herhangi bir CSS rengini (hex, rgb, hsl, oklch, var(--x)) sRGB üçlüsüne çevirir.
 * var() için öğenin hesaplanan stilinden geçer; sonucu 1x1 tuvalde okur.
 */
function renkCoz(ornek: HTMLElement, piksel: CanvasRenderingContext2D, deger: string): Rgb {
  const onceki = ornek.style.color
  ornek.style.color = ""
  ornek.style.color = deger
  const hesaplanan = ornek.style.color ? getComputedStyle(ornek).color : deger
  ornek.style.color = onceki

  piksel.clearRect(0, 0, 1, 1)
  piksel.fillStyle = "#000000"
  piksel.fillStyle = hesaplanan
  piksel.fillRect(0, 0, 1, 1)
  const [r, g, b] = piksel.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

function genislik(e: Engel): number {
  return e.tur === "yosun" ? YOSUN_GEN : KAYA_GEN
}

/** Çarpışma kutuları, görselden biraz bağışlayıcı. */
function engelKutulari(e: Engel): readonly Kutu[] {
  const gen = genislik(e)
  const ust = e.merkez - e.bosluk / 2
  const alt = e.merkez + e.bosluk / 2
  const cx = e.x + gen / 2
  return [
    [cx - 1.5, 0, cx + 1.5, ust - 12],
    [cx - 11, ust - 16, cx + 2, ust],
    [e.x + 4, alt + 3, e.x + gen - 4, H],
  ]
}

function daireKutu(cx: number, cy: number, r: number, k: Kutu): boolean {
  const dx = cx - sinirla(cx, k[0], k[2])
  const dy = cy - sinirla(cy, k[1], k[3])
  return dx * dx + dy * dy < r * r
}

/* ------------------------------------------------------------------ */
/* Çizim                                                               */
/* ------------------------------------------------------------------ */

function gradyanlariKur(c: CanvasRenderingContext2D, r: Renkler): Gradyanlar {
  const arka = c.createLinearGradient(0, 0, 0, H)
  arka.addColorStop(0, boya(r.su))
  arka.addColorStop(1, boya(r.zemin))
  const isik = c.createLinearGradient(0, 0, 0, H)
  isik.addColorStop(0, boya(r.metin, 0.06))
  isik.addColorStop(1, boya(r.metin, 0))
  return { arka, isik }
}

function isiklariCiz(c: CanvasRenderingContext2D, o: Oyun, g: Gradyanlar) {
  c.fillStyle = g.isik
  for (let i = 0; i < 3; i++) {
    const x = 70 + i * 220 + Math.sin(o.t * 0.18 + i * 2.1) * 24
    const w = 22 + i * 8
    c.beginPath()
    c.moveTo(x, 0)
    c.lineTo(x + w, 0)
    c.lineTo(x + w + 90, H)
    c.lineTo(x + 50, H)
    c.closePath()
    c.fill()
  }
}

function uzakSirtCiz(c: CanvasRenderingContext2D, o: Oyun, r: Renkler) {
  const kaydir = o.kayma * 0.3
  c.fillStyle = boya(r.engel, 0.22)
  c.beginPath()
  c.moveTo(0, H)
  for (let x = 0; x <= W; x += 16) {
    const u = x + kaydir
    c.lineTo(x, TABAN - 16 - Math.sin(u * 0.011) * 10 - Math.sin(u * 0.029 + 1.3) * 5)
  }
  c.lineTo(W, H)
  c.closePath()
  c.fill()
}

function tabanCiz(c: CanvasRenderingContext2D, o: Oyun, r: Renkler) {
  c.fillStyle = boya(r.engel, 0.6)
  c.beginPath()
  c.moveTo(0, H)
  for (let x = 0; x <= W; x += 8) {
    c.lineTo(x, TABAN + Math.sin((x + o.kayma) * 0.09) * 1.4)
  }
  c.lineTo(W, H)
  c.closePath()
  c.fill()
}

function yuzeyCiz(c: CanvasRenderingContext2D, o: Oyun, r: Renkler) {
  const dalga = (x: number) =>
    YUZEY - 3 +
    Math.sin(x * 0.035 + o.kayma * 0.02 + o.t * 1.3) * 1.6 +
    Math.sin(x * 0.013 - o.t * 0.7) * 1.2

  c.fillStyle = boya(r.metin, 0.05)
  c.beginPath()
  c.moveTo(0, 0)
  for (let x = 0; x <= W; x += 8) c.lineTo(x, dalga(x))
  c.lineTo(W, 0)
  c.closePath()
  c.fill()

  c.strokeStyle = boya(r.metin, 0.2)
  c.lineWidth = 1
  c.beginPath()
  for (let x = 0; x <= W; x += 8) {
    if (x === 0) c.moveTo(x, dalga(x))
    else c.lineTo(x, dalga(x))
  }
  c.stroke()
}

function oltaCiz(c: CanvasRenderingContext2D, r: Renkler, cx: number, ust: number) {
  c.lineCap = "round"
  c.strokeStyle = boya(r.metin, 0.45)
  c.lineWidth = 1
  c.beginPath()
  c.moveTo(cx, 0)
  c.lineTo(cx, ust - 14)
  c.stroke()

  c.strokeStyle = boya(r.metin, 0.9)
  c.lineWidth = 1.8
  c.beginPath()
  c.arc(cx, ust - 15.5, 1.5, 0, Math.PI * 2)
  c.stroke()
  c.beginPath()
  c.moveTo(cx, ust - 14)
  c.lineTo(cx, ust - 5)
  c.arc(cx - 5, ust - 5, 5, 0, Math.PI)
  c.lineTo(cx - 10, ust - 9)
  c.lineTo(cx - 7.5, ust - 7)
  c.stroke()
}

function yosunCiz(c: CanvasRenderingContext2D, o: Oyun, r: Renkler, e: Engel, alt: number) {
  const kokler = [5, 21, 13]
  const oranlar = [0.78, 0.88, 1]
  const alfalar = [0.72, 0.86, 1]
  const boy = TABAN + 2 - alt
  for (let i = 0; i < 3; i++) {
    const bx = e.x + kokler[i]
    const uzunluk = boy * oranlar[i]
    const uc = TABAN + 2 - uzunluk
    const orta = (TABAN + uc) / 2
    const salinim = Math.sin(o.t * 1.4 + e.tohum + i * 1.7) * 5

    c.fillStyle = boya(r.engel, alfalar[i])
    c.beginPath()
    c.moveTo(bx - 4, TABAN + 2)
    c.bezierCurveTo(
      bx - 4 + salinim * 0.2, orta + uzunluk * 0.2,
      bx - 3 + salinim * 0.7, orta - uzunluk * 0.2,
      bx + salinim, uc,
    )
    c.bezierCurveTo(
      bx + 3 + salinim * 0.7, orta - uzunluk * 0.2,
      bx + 4 + salinim * 0.2, orta + uzunluk * 0.2,
      bx + 4, TABAN + 2,
    )
    c.fill()

    c.strokeStyle = boya(r.metin, 0.08)
    c.lineWidth = 0.8
    c.beginPath()
    c.moveTo(bx, TABAN)
    c.quadraticCurveTo(bx + salinim * 0.5, orta, bx + salinim, uc + 4)
    c.stroke()
  }
}

/** Noktalardan geçen kapalı, yumuşak yol (orta noktalardan ikinci derece eğri). */
function yumusakYol(c: CanvasRenderingContext2D, n: readonly (readonly [number, number])[]) {
  const orta = (i: number) => {
    const [ax, ay] = n[i % n.length]
    const [bx, by] = n[(i + 1) % n.length]
    return [(ax + bx) / 2, (ay + by) / 2] as const
  }
  const [sx, sy] = orta(n.length - 1)
  c.moveTo(sx, sy)
  for (let i = 0; i < n.length; i++) {
    const [mx, my] = orta(i)
    c.quadraticCurveTo(n[i][0], n[i][1], mx, my)
  }
  c.closePath()
}

/**
 * Mercan başı. (2026-09-24) Önceki sürüm üst üste yuvarlatılmış dikdörtgenlerdi
 * ve "kare kare" görünüyordu. Çarpışma kutusu engelin TAM genişliğini kapladığı
 * için dallı/boşluklu bir mercan haksız olurdu (balık boşlukta ölürdü); bu yüzden
 * siluet dolu kalır: dalgalı kenarlı gövde, karnabahar gibi yumrulu tepe, polipler.
 */
function mercanCiz(c: CanvasRenderingContext2D, o: Oyun, r: Renkler, e: Engel, alt: number) {
  const x0 = e.x + 3
  const x1 = e.x + KAYA_GEN - 3
  const ust = alt + 2
  const taban = TABAN + 3
  const salinim = Math.sin(o.t * 0.8 + e.tohum) * 0.9
  // Kenar: lob lob şişkinlik + tabana doğru hafif daralma (baş geniş, kök ince).
  const kenar = (y: number, taraf: number) => {
    const lob = Math.abs(Math.sin(y * 0.085 + e.tohum * 3 + taraf)) * 3.2
    const daralma = ((y - ust) / Math.max(1, taban - ust)) * 3
    return (taraf ? 1 : -1) * (lob - daralma)
  }

  const n: [number, number][] = []
  // sol kenar, aşağıdan yukarı
  for (let y = taban; y > ust + 10; y -= 5) n.push([x0 + kenar(y, 0), y])
  // yumrulu tepe: yuvarlak loblar, aralarında içe kıvrım (karnabahar/beyin mercanı)
  const yumru = 3 + Math.floor(sozde(e.tohum) * 2)
  const tepe: [number, number][] = []
  const ornek = 28
  for (let i = 0; i <= ornek; i++) {
    const t = i / ornek
    const x = x0 + (x1 - x0) * t
    const kubbe = (1 - Math.sin(Math.PI * t)) * 8
    const lob = Math.pow(Math.abs(Math.sin(Math.PI * yumru * t + 0.2)), 0.6) * 5
    tepe.push([x + salinim * Math.sin(Math.PI * t), ust + 4 + kubbe - lob])
  }
  n.push(...tepe)
  // sağ kenar, yukarıdan aşağı
  for (let y = ust + 12; y <= taban; y += 5) n.push([x1 + kenar(y, 1.7), y])

  c.fillStyle = boya(r.engel, 0.94)
  c.beginPath()
  yumusakYol(c, n)
  c.fill()

  // gövdeyi yumru yumru ayıran kıvrımlar (beyin mercanı dokusu)
  c.save()
  c.beginPath()
  yumusakYol(c, n)
  c.clip()
  c.strokeStyle = boya(r.metin, 0.09)
  c.lineWidth = 1.1
  c.lineCap = "round"
  for (let y = ust + 16, k = 0; y < taban - 4; y += 15, k++) {
    c.beginPath()
    c.moveTo(x0 - 2, y + Math.sin(k + e.tohum) * 2)
    c.bezierCurveTo(
      x0 + (x1 - x0) * 0.33, y - 4 + sozde(e.tohum + k) * 3,
      x0 + (x1 - x0) * 0.66, y + 4 - sozde(e.tohum + k * 2) * 3,
      x1 + 2, y + Math.cos(k + e.tohum) * 2,
    )
    c.stroke()
  }
  // polipler
  c.fillStyle = boya(r.metin, 0.13)
  const polip = Math.max(4, Math.round(((taban - ust) * (x1 - x0)) / 170))
  for (let i = 0; i < polip; i++) {
    const px = x0 + 4 + sozde(e.tohum + i * 1.9) * (x1 - x0 - 8)
    const py = ust + 6 + sozde(e.tohum + i * 4.3) * (taban - ust - 8)
    c.beginPath()
    c.arc(px, py, 1 + sozde(e.tohum + i) * 0.8, 0, Math.PI * 2)
    c.fill()
  }
  c.restore()

  // tepede ışık kenarı
  c.strokeStyle = boya(r.metin, 0.12)
  c.lineWidth = 1
  c.beginPath()
  tepe.forEach(([x, y], i) => (i ? c.lineTo(x, y + 1.2) : c.moveTo(x, y + 1.2)))
  c.stroke()
}

function engelCiz(c: CanvasRenderingContext2D, o: Oyun, r: Renkler, e: Engel) {
  const ust = e.merkez - e.bosluk / 2
  const alt = e.merkez + e.bosluk / 2
  oltaCiz(c, r, e.x + genislik(e) / 2, ust)
  if (e.tur === "yosun") yosunCiz(c, o, r, e, alt)
  else mercanCiz(c, o, r, e, alt)
}

function kabarcikCiz(c: CanvasRenderingContext2D, r: Renkler, k: Kabarcik) {
  const renk = k.iz ? r.vurgu : r.metin
  const solma = k.iz ? Math.max(0, 1 - k.yas / k.omur) : 1
  const yuzeyeYakin = sinirla((k.y - YUZEY) / 20, 0, 1)
  const alfa = solma * yuzeyeYakin
  if (alfa <= 0.01) return
  const x = k.x + Math.sin(k.faz + k.yas * 2.4) * 1.4

  c.strokeStyle = boya(renk, 0.42 * alfa)
  c.lineWidth = 0.8
  c.beginPath()
  c.arc(x, k.y, k.r, 0, Math.PI * 2)
  c.stroke()
  if (k.r > 1.4) {
    c.fillStyle = boya(renk, 0.5 * alfa)
    c.beginPath()
    c.arc(x - k.r * 0.35, k.y - k.r * 0.35, k.r * 0.28, 0, Math.PI * 2)
    c.fill()
  }
}

function balikCiz(c: CanvasRenderingContext2D, o: Oyun, r: Renkler) {
  const b = o.balik
  const sersem = o.faz === "carpti" || o.faz === "bitti"

  c.save()
  c.translate(BALIK_X, b.y)
  c.rotate(b.aci)
  c.scale(1 + 0.14 * b.ezilme, 1 - 0.12 * b.ezilme)

  // Kuyruk: gövdeye bağlı pivotta çırpınır; zıplamada hızlanır ve genişler.
  c.save()
  c.translate(-12, 0)
  c.rotate(Math.sin(b.kuyruk) * (0.32 + 0.3 * b.cirpinma))
  c.fillStyle = boya(r.balik)
  c.beginPath()
  c.moveTo(1, 0)
  c.quadraticCurveTo(-5, -3, -11, -9)
  c.quadraticCurveTo(-8, 0, -11, 9)
  c.quadraticCurveTo(-5, 3, 1, 0)
  c.fill()
  c.restore()

  // Sırt yüzgeci
  c.fillStyle = boya(r.balik, 0.85)
  c.beginPath()
  c.moveTo(-5, -7)
  c.quadraticCurveTo(-1, -14, 7, -7.5)
  c.closePath()
  c.fill()

  // Gövde
  c.fillStyle = boya(r.balik)
  c.beginPath()
  c.moveTo(17, 1)
  c.bezierCurveTo(15, -8, 2, -10, -8, -7)
  c.quadraticCurveTo(-14, -4, -13.5, 0)
  c.quadraticCurveTo(-14, 4, -8, 7)
  c.bezierCurveTo(2, 10, 15, 8, 17, 1)
  c.fill()

  // Karın ışığı
  c.fillStyle = boya(r.metin, 0.14)
  c.beginPath()
  c.ellipse(2, 3.8, 10, 3, 0, 0, Math.PI * 2)
  c.fill()

  // Solungaç çizgisi
  c.strokeStyle = boya(r.zemin, 0.35)
  c.lineWidth = 1
  c.beginPath()
  c.arc(-2, 0, 7, -0.8, 0.8)
  c.stroke()

  // Göğüs yüzgeci
  c.save()
  c.translate(2, 3)
  c.rotate(0.5 + Math.sin(b.kuyruk * 1.3) * 0.25)
  c.fillStyle = boya(r.balik, 0.7)
  c.beginPath()
  c.ellipse(-3, 0, 4.5, 2, 0, 0, Math.PI * 2)
  c.fill()
  c.restore()

  // Göz; çarpınca küçük bir çarpı
  c.fillStyle = boya(r.metin)
  c.beginPath()
  c.arc(10, -2, 2.8, 0, Math.PI * 2)
  c.fill()
  if (sersem) {
    c.strokeStyle = boya(r.zemin)
    c.lineWidth = 1
    c.beginPath()
    c.moveTo(8.6, -3.4)
    c.lineTo(11.4, -0.6)
    c.moveTo(11.4, -3.4)
    c.lineTo(8.6, -0.6)
    c.stroke()
  } else {
    c.fillStyle = boya(r.zemin)
    c.beginPath()
    c.arc(10.8, -2, 1.5, 0, Math.PI * 2)
    c.fill()
  }

  c.restore()
}

function sahneyiCiz(
  c: CanvasRenderingContext2D,
  o: Oyun,
  r: Renkler,
  g: Gradyanlar,
  sx: number,
  sy: number,
) {
  c.setTransform(sx, 0, 0, sy, 0, 0)
  c.fillStyle = g.arka
  c.fillRect(0, 0, W, H)
  isiklariCiz(c, o, g)
  uzakSirtCiz(c, o, r)
  for (const k of o.kabarciklar) if (!k.iz) kabarcikCiz(c, r, k)
  for (const e of o.engeller) engelCiz(c, o, r, e)
  tabanCiz(c, o, r)
  for (const k of o.kabarciklar) if (k.iz) kabarcikCiz(c, r, k)
  balikCiz(c, o, r)
  yuzeyCiz(c, o, r)
  if (o.flas > 0.01) {
    c.fillStyle = boya(r.metin, 0.16 * o.flas)
    c.fillRect(0, 0, W, H)
  }
}

/* ------------------------------------------------------------------ */
/* Stil (kapsamlı sınıf adları; projede Tailwind olsun olmasın çalışır)  */
/* ------------------------------------------------------------------ */

const STIL = `
.imza-balik{display:flex;flex-direction:column;align-items:center;gap:.75rem;width:100%;max-width:640px;margin-inline:auto;color:var(--ib-metin)}
.imza-balik__baslik{margin:0;font-size:1rem;font-weight:600;letter-spacing:.01em}
.imza-balik__alt{margin:-.25rem 0 0;font-size:.875rem;opacity:.72}
.imza-balik__sahne{position:relative;width:100%;overflow:hidden;border:1px solid rgba(127,127,127,.3);border-color:color-mix(in srgb,var(--ib-metin) 16%,transparent);border-radius:4px;background:var(--ib-zemin);user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
.imza-balik__tuval{display:block;width:100%;height:auto;aspect-ratio:${W}/${H};touch-action:manipulation;cursor:pointer;outline:none}
.imza-balik__tuval:focus-visible{outline:2px solid var(--ib-vurgu);outline-offset:-2px}
.imza-balik__katman{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5rem;padding:1rem;text-align:center;pointer-events:none;animation:ib-belir .35s ease-out both}
.imza-balik__katman--karart{background:rgba(0,0,0,.35);background:color-mix(in srgb,var(--ib-zemin) 58%,transparent)}
.imza-balik__durum{margin:0;font-size:1.125rem;font-weight:600}
.imza-balik__sonuc{margin:0;font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;font-variant-numeric:tabular-nums;opacity:.8}
.imza-balik__rozet{margin:0;font-size:.6875rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ib-vurgu)}
.imza-balik__dugme{pointer-events:auto;margin-top:.25rem;font:inherit;font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;padding:.6rem 1.25rem;border:1px solid var(--ib-vurgu);border-radius:2px;background:rgba(0,0,0,.25);background:color-mix(in srgb,var(--ib-zemin) 70%,transparent);color:var(--ib-vurgu);cursor:pointer;transition:background-color .2s ease,color .2s ease}
.imza-balik__dugme:hover{background:var(--ib-vurgu);color:var(--ib-zemin)}
.imza-balik__dugme:focus-visible{outline:2px solid var(--ib-vurgu);outline-offset:3px}
.imza-balik__skor{position:absolute;top:.4rem;left:50%;transform:translateX(-50%);font-size:1.5rem;line-height:1.2;font-variant-numeric:tabular-nums;pointer-events:none}
.imza-balik__skor span{display:inline-block;animation:ib-puan .28s ease-out}
.imza-balik__rekor{position:absolute;top:.6rem;right:.75rem;font-size:.6875rem;letter-spacing:.14em;text-transform:uppercase;font-variant-numeric:tabular-nums;opacity:.65;pointer-events:none}
.imza-balik__ipucu{margin:0;font-size:.75rem;opacity:.6;text-align:center}
.imza-balik__gizli{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
@keyframes ib-belir{from{opacity:0}to{opacity:1}}
@keyframes ib-puan{from{transform:scale(1.3)}to{transform:scale(1)}}
@media (prefers-reduced-motion:reduce){.imza-balik__katman,.imza-balik__skor span{animation:none}.imza-balik__dugme{transition:none}}
`

/* ------------------------------------------------------------------ */
/* Bileşen                                                             */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Rekor deposu
 *
 * Rekor ekranda gösterildiği için React state'i olmak zorunda. İlk hâli
 * localStorage'ı mount effect'inde okuyup setState çağırıyordu;
 * `react-hooks/set-state-in-effect` kuralı bunu (haklı olarak) reddetti.
 * `useState` başlatıcısında okumak da olmaz: sunucu 0 çizer, istemci
 * kayıtlı rekoru çizer, hydration uyuşmazlığı doğar.
 *
 * Doğru yol React'in dış depo okuma sözleşmesi: `useSyncExternalStore`.
 * Sunucuda 0 döner, hydration'dan sonra gerçek değere geçer, uyuşmazlık yok.
 *
 * Bellek yedeği: depolama kapalıysa (gizli sekme, kota) rekor yalnız bu
 * oturumda tutulur — eski davranış korunuyor. Rekor yalnız artar; bu yüzden
 * okuma kalıcı ve bellekteki değerin büyüğünü alır.
 * ------------------------------------------------------------------ */
const bellekRekor = new Map<string, number>()
const rekorDinleyicileri = new Set<() => void>()

function rekorOku(anahtar: string): number {
  let kalici = 0
  try {
    kalici = Number(window.localStorage.getItem(anahtar)) || 0
  } catch {
    // Depolama kapalı: yalnız bellek.
  }
  return Math.max(kalici, bellekRekor.get(anahtar) ?? 0)
}

function rekorYaz(anahtar: string, deger: number): void {
  bellekRekor.set(anahtar, deger)
  try {
    window.localStorage.setItem(anahtar, String(deger))
  } catch {
    // Gizli sekme / depolama kapalı: rekor yalnız bu oturumda tutulur.
  }
  rekorDinleyicileri.forEach((dinle) => dinle())
}

function rekoraAbone(dinle: () => void): () => void {
  rekorDinleyicileri.add(dinle)
  // Başka sekmede kırılan rekor da buraya yansısın.
  window.addEventListener("storage", dinle)
  return () => {
    rekorDinleyicileri.delete(dinle)
    window.removeEventListener("storage", dinle)
  }
}

const sunucudaRekor = () => 0

export function BalikOyunu({
  tema,
  baslik,
  altMetin,
  metinler,
  rekorAnahtari = "imza-404-balik-rekor",
  className,
}: BalikOyunuProps) {
  const t: BalikTemasi = { ...VARSAYILAN_TEMA, ...tema }
  const m: BalikMetinleri = { ...VARSAYILAN_METINLER, ...metinler }
  const temaAnahtari = RENK_ADLARI.map((ad) => t[ad]).join("|")

  const tuvalRef = useRef<HTMLCanvasElement>(null)
  const ayarRef = useRef({ tema: t, metinler: m, rekorAnahtari })
  const girdiRef = useRef<() => void>(() => undefined)
  const renkYenileRef = useRef<() => void>(() => undefined)

  const [faz, setFaz] = useState<GorunurFaz>("hazir")
  const [skor, setSkor] = useState(0)
  const rekor = useSyncExternalStore(
    rekoraAbone,
    () => rekorOku(rekorAnahtari),
    sunucudaRekor,
  )
  const [yeniRekor, setYeniRekor] = useState(false)
  const [duyuru, setDuyuru] = useState("")
  const ipucuId = useId()

  // Güncel ayarları döngüye ref ile ver (döngü bir kez kurulur).
  useEffect(() => {
    ayarRef.current = { tema: t, metinler: m, rekorAnahtari }
  })

  useEffect(() => {
    const tuvalOge = tuvalRef.current
    const ctx2d = tuvalOge?.getContext("2d")
    const piksel = document.createElement("canvas").getContext("2d", { willReadFrequently: true })
    if (!tuvalOge || !ctx2d || !piksel) return
    const tuval: HTMLCanvasElement = tuvalOge
    const c: CanvasRenderingContext2D = ctx2d

    const hareketSorgu = window.matchMedia("(prefers-reduced-motion: reduce)")
    let sakin = hareketSorgu.matches
    let gorunur = document.visibilityState === "visible"
    let ekranda = true
    let sx = 1
    let sy = 1
    let sonDpr = 0
    let rafId = 0
    let calisiyor = false
    let oncekiZaman = 0

    const renkleriOku = (): Renkler => {
      const tm = ayarRef.current.tema
      const sonuc = {} as Record<RenkAdi, Rgb>
      for (const ad of RENK_ADLARI) sonuc[ad] = renkCoz(tuval, piksel, tm[ad])
      return sonuc
    }
    let renkler = renkleriOku()
    let gradyanlar = gradyanlariKur(c, renkler)

    const o: Oyun = {
      faz: "hazir",
      fazSuresi: 0,
      bittiAni: 0,
      t: 0,
      balik: { y: H * 0.5, vy: 0, aci: 0, kuyruk: 0, cirpinma: 0, ezilme: 0, izSayac: 0 },
      engeller: [],
      kabarciklar: [],
      hiz: HIZ_ILK,
      mesafe: 0,
      kayma: 0,
      skor: 0,
      rekor: 0,
      sonMerkez: H * 0.5,
      flas: 0,
      kabarcikSayac: 0,
    }
    for (let i = 0; i < 12; i++) {
      o.kabarciklar.push({
        x: rastgele(10, W - 10),
        y: rastgele(YUZEY + 20, TABAN - 4),
        r: rastgele(1, 2.8),
        vy: rastgele(-34, -18),
        faz: rastgele(0, Math.PI * 2),
        yas: 0,
        omur: Infinity,
        iz: false,
      })
    }

    o.rekor = rekorOku(ayarRef.current.rekorAnahtari)

    const ciz = () => sahneyiCiz(c, o, renkler, gradyanlar, sx, sy)

    /* --- boyut ve DPR --- */
    const boyutla = () => {
      const cssGen = tuval.clientWidth
      if (cssGen === 0) return
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const gen = Math.round(cssGen * dpr)
      const yuk = Math.round(((cssGen * H) / W) * dpr)
      if (tuval.width !== gen) tuval.width = gen
      if (tuval.height !== yuk) tuval.height = yuk
      sx = gen / W
      sy = yuk / H
      sonDpr = dpr
      ciz()
    }

    /* --- kabarcıklar --- */
    const kabarcikEkle = (k: Kabarcik) => {
      if (o.kabarciklar.length >= MAX_KABARCIK) o.kabarciklar.shift()
      o.kabarciklar.push(k)
    }

    const izBirak = (adet: number, yayilma: number, hizAraligi: readonly [number, number]) => {
      const b = o.balik
      const kx = BALIK_X - Math.cos(b.aci) * 16
      const ky = b.y - Math.sin(b.aci) * 16
      for (let i = 0; i < adet; i++) {
        kabarcikEkle({
          x: kx + rastgele(-yayilma, yayilma),
          y: ky + rastgele(-yayilma, yayilma),
          r: rastgele(0.8, 2),
          vy: rastgele(hizAraligi[0], hizAraligi[1]),
          faz: rastgele(0, Math.PI * 2),
          yas: 0,
          omur: rastgele(1.1, 1.9),
          iz: true,
        })
      }
    }

    const kabarciklariGuncelle = (h: number) => {
      if (!sakin) {
        o.kabarcikSayac -= h
        if (o.kabarcikSayac <= 0) {
          o.kabarcikSayac = rastgele(0.25, 0.6)
          kabarcikEkle({
            x: rastgele(10, W - 10),
            y: TABAN - 2,
            r: rastgele(1, 2.8),
            vy: rastgele(-34, -18),
            faz: rastgele(0, Math.PI * 2),
            yas: 0,
            omur: Infinity,
            iz: false,
          })
        }
      }
      let yaz = 0
      for (const k of o.kabarciklar) {
        if (sakin && !k.iz) {
          o.kabarciklar[yaz++] = k
          continue
        }
        k.yas += h
        k.y += k.vy * h
        if (k.y > YUZEY + 2 && k.x > -8 && k.yas < k.omur) o.kabarciklar[yaz++] = k
      }
      o.kabarciklar.length = yaz
    }

    /* --- dünya --- */
    const engelEkle = (x: number) => {
      const bosluk = Math.max(BOSLUK_MIN, BOSLUK_ILK - o.skor)
      const enAz = YUZEY + 30 + bosluk / 2
      const enCok = TABAN - 24 - bosluk / 2
      const merkez = sinirla(o.sonMerkez + rastgele(-65, 65), enAz, enCok)
      o.sonMerkez = merkez
      o.engeller.push({
        x,
        merkez,
        bosluk,
        tur: Math.random() < 0.62 ? "yosun" : "kaya",
        tohum: rastgele(0, 1000),
        gecildi: false,
      })
    }

    const dunyayiKaydir = (h: number) => {
      const d = o.hiz * h
      o.kayma += d
      for (const e of o.engeller) e.x -= d
      for (const k of o.kabarciklar) if (k.iz) k.x -= d
      o.mesafe += d
      if (o.mesafe >= ARALIK) {
        o.mesafe -= ARALIK
        engelEkle(W + 10 - o.mesafe)
      }
      if (o.faz === "oynuyor") {
        for (const e of o.engeller) {
          if (!e.gecildi && e.x + genislik(e) < BALIK_X - 10) {
            e.gecildi = true
            o.skor += 1
            o.hiz = Math.min(HIZ_MAX, o.hiz + HIZ_ARTIS)
            setSkor(o.skor)
          }
        }
      }
      while (o.engeller.length > 0 && o.engeller[0].x + genislik(o.engeller[0]) < -20) {
        o.engeller.shift()
      }
    }

    const carpisiyor = (): boolean => {
      const b = o.balik
      if (b.y >= TABAN - 7) return true
      const cos = Math.cos(b.aci)
      const sin = Math.sin(b.aci)
      const onX = BALIK_X + cos * 6
      const onY = b.y + sin * 6
      const arkaX = BALIK_X - cos * 6
      const arkaY = b.y - sin * 6
      for (const e of o.engeller) {
        if (e.x > BALIK_X + 30 || e.x + genislik(e) < BALIK_X - 30) continue
        for (const k of engelKutulari(e)) {
          if (daireKutu(onX, onY, 7.5, k) || daireKutu(arkaX, arkaY, 6, k)) return true
        }
      }
      return false
    }

    /* --- durum geçişleri --- */
    const donguGerekli = () =>
      gorunur && ekranda && (!sakin || o.faz === "oynuyor" || o.faz === "carpti")

    const kare = (zaman: number) => {
      rafId = requestAnimationFrame(kare)
      const dt = oncekiZaman === 0 ? 0 : Math.min((zaman - oncekiZaman) / 1000, MAX_KARE)
      oncekiZaman = zaman
      // Pencere başka ekrana taşınınca veya zoom değişince DPR değişir.
      if (Math.min(window.devicePixelRatio || 1, MAX_DPR) !== sonDpr) boyutla()
      const adimSayisi = Math.ceil(dt / ALT_ADIM)
      if (adimSayisi > 0) {
        const h = dt / adimSayisi
        for (let i = 0; i < adimSayisi; i++) adim(h)
      }
      ciz()
    }

    const donguyuAyarla = () => {
      const gerek = donguGerekli()
      if (gerek && !calisiyor) {
        calisiyor = true
        oncekiZaman = 0
        rafId = requestAnimationFrame(kare)
      } else if (!gerek && calisiyor) {
        calisiyor = false
        cancelAnimationFrame(rafId)
        ciz()
      }
    }

    const odagiTuvaleAl = () => {
      const aktif = document.activeElement
      if (aktif instanceof HTMLButtonElement && tuval.parentElement?.contains(aktif)) {
        tuval.focus({ preventScroll: true })
      }
    }

    const zipla = () => {
      const b = o.balik
      b.vy = ZIPLAMA
      b.cirpinma = 1
      b.ezilme = 1
      izBirak(3, 2, [-40, -22])
    }

    const basla = () => {
      if (o.faz === "bitti") {
        o.balik.y = H * 0.5
        o.balik.aci = 0
      }
      o.faz = "oynuyor"
      o.fazSuresi = 0
      o.engeller = []
      o.hiz = HIZ_ILK
      o.mesafe = ARALIK - 40
      o.skor = 0
      o.sonMerkez = H * 0.5
      o.flas = 0
      o.balik.vy = 0
      setSkor(0)
      setYeniRekor(false)
      setDuyuru("")
      setFaz("oynuyor")
      zipla()
      odagiTuvaleAl()
      donguyuAyarla()
    }

    const carp = () => {
      o.faz = "carpti"
      o.fazSuresi = 0
      o.balik.vy = -40
      if (!sakin) o.flas = 1
      izBirak(10, 9, [-80, -40])
    }

    const bitir = () => {
      o.faz = "bitti"
      o.fazSuresi = 0
      o.bittiAni = performance.now()
      o.flas = 0
      const yeni = o.skor > o.rekor
      if (yeni) {
        o.rekor = o.skor
        rekorYaz(ayarRef.current.rekorAnahtari, o.rekor)
      }
      const mt = ayarRef.current.metinler
      setYeniRekor(yeni)
      setFaz("bitti")
      setDuyuru(`${mt.oyunBitti}. ${mt.skor} ${o.skor}. ${mt.rekor} ${o.rekor}.`)
      donguyuAyarla()
    }

    const duraklat = () => {
      if (o.faz === "oynuyor") {
        o.faz = "duraklatildi"
        setFaz("duraklatildi")
        setDuyuru(ayarRef.current.metinler.duraklatildi)
      } else if (o.faz === "carpti") {
        bitir()
      }
    }

    const girdi = () => {
      switch (o.faz) {
        case "hazir":
          basla()
          break
        case "oynuyor":
          zipla()
          break
        case "duraklatildi":
          o.faz = "oynuyor"
          setFaz("oynuyor")
          setDuyuru("")
          zipla()
          odagiTuvaleAl()
          donguyuAyarla()
          break
        case "bitti":
          if (performance.now() - o.bittiAni >= YENIDEN_BEKLEME_MS) basla()
          break
        case "carpti":
          break
      }
    }
    girdiRef.current = girdi

    /* --- tek fizik adımı --- */
    function adim(h: number) {
      const b = o.balik
      o.fazSuresi += h
      if (!sakin) o.t += h
      b.cirpinma *= Math.exp(-h * 5)
      b.ezilme *= Math.exp(-h * 12)
      o.flas *= Math.exp(-h * 6)
      const kuyrukHizi = o.faz === "bitti" ? 0 : 7 + b.cirpinma * 18
      b.kuyruk += h * kuyrukHizi

      if (o.faz === "hazir") {
        b.y = yaklas(b.y, H * 0.5 + Math.sin(o.t * 1.7) * 7, 6, h)
        b.aci = yaklas(b.aci, Math.cos(o.t * 1.7) * 0.07, 6, h)
        if (!sakin) o.kayma += 20 * h
      } else if (o.faz === "oynuyor") {
        b.vy = Math.min(b.vy + YERCEKIMI * h, MAX_DUSUS)
        b.y += b.vy * h
        if (b.y < TAVAN_Y) {
          b.y = TAVAN_Y
          if (b.vy < 0) b.vy = 0
        }
        b.aci = yaklas(b.aci, sinirla(b.vy * 0.0028, -0.45, 0.95), 10, h)
        dunyayiKaydir(h)
        b.izSayac -= h
        if (b.izSayac <= 0) {
          b.izSayac = 0.12
          izBirak(1, 1.5, [-34, -20])
        }
        if (carpisiyor()) carp()
      } else if (o.faz === "carpti") {
        // Yumuşak an: dünya yavaşlayarak durur, balık sersemleyip hafifçe süzülür.
        const k = Math.max(0, 1 - o.fazSuresi / 0.4)
        dunyayiKaydir(h * k * k)
        b.vy = Math.min(b.vy + 160 * h, 45)
        b.y = Math.min(b.y + b.vy * h, TABAN - 8)
        b.aci = yaklas(b.aci, 0.6, 3, h)
        if (o.fazSuresi >= CARPMA_SURESI) bitir()
      }
      kabarciklariGuncelle(h)
    }

    /* --- olaylar --- */
    const isaretci = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return
      girdi()
    }

    const tus = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return
      const hedef = e.target
      const tuvalde = hedef === tuval
      const serbest = tuvalde || hedef === document.body || hedef === document.documentElement
      const ziplamaTusu = e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW"
      if ((ziplamaTusu && serbest && ekranda) || (e.code === "Enter" && tuvalde)) {
        e.preventDefault()
        girdi()
      }
    }

    const gorunurlukDegisti = () => {
      gorunur = document.visibilityState === "visible"
      if (!gorunur) duraklat()
      donguyuAyarla()
    }

    const hareketDegisti = () => {
      sakin = hareketSorgu.matches
      if (sakin) o.flas = 0
      donguyuAyarla()
      ciz()
    }

    const renkleriYenile = () => {
      renkler = renkleriOku()
      gradyanlar = gradyanlariKur(c, renkler)
      ciz()
    }
    renkYenileRef.current = renkleriYenile

    tuval.addEventListener("pointerdown", isaretci)
    window.addEventListener("keydown", tus)
    window.addEventListener("resize", boyutla)
    document.addEventListener("visibilitychange", gorunurlukDegisti)
    hareketSorgu.addEventListener("change", hareketDegisti)

    const renkSemasi = window.matchMedia("(prefers-color-scheme: dark)")
    renkSemasi.addEventListener("change", renkleriYenile)
    // Sınıf/data-theme ile tema değiştiren siteler (açık/koyu düğmesi) için.
    const temaGozcusu = new MutationObserver(renkleriYenile)
    temaGozcusu.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    })

    const boyutGozcusu = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(boyutla)
    boyutGozcusu?.observe(tuval)

    const ekranGozcusu =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((girdiler) => {
            const son = girdiler[girdiler.length - 1]
            if (!son) return
            ekranda = son.isIntersecting
            if (!ekranda) duraklat()
            donguyuAyarla()
          })
    ekranGozcusu?.observe(tuval)

    boyutla()
    donguyuAyarla()

    return () => {
      cancelAnimationFrame(rafId)
      calisiyor = false
      tuval.removeEventListener("pointerdown", isaretci)
      window.removeEventListener("keydown", tus)
      window.removeEventListener("resize", boyutla)
      document.removeEventListener("visibilitychange", gorunurlukDegisti)
      hareketSorgu.removeEventListener("change", hareketDegisti)
      renkSemasi.removeEventListener("change", renkleriYenile)
      temaGozcusu.disconnect()
      boyutGozcusu?.disconnect()
      ekranGozcusu?.disconnect()
      girdiRef.current = () => undefined
      renkYenileRef.current = () => undefined
    }
  }, [])

  // Tema prop'u değişince renkleri yeniden çöz (döngü yeniden kurulmaz).
  useEffect(() => {
    renkYenileRef.current()
  }, [temaAnahtari])

  const stil: CSSProperties & Record<`--${string}`, string> = {
    "--ib-zemin": t.zemin,
    "--ib-vurgu": t.vurgu,
    "--ib-metin": t.metin,
  }
  if (t.yaziTipi) stil.fontFamily = t.yaziTipi

  const girdiVer = () => girdiRef.current()

  return (
    <div className={className ? `imza-balik ${className}` : "imza-balik"} style={stil}>
      <style>{STIL}</style>
      {baslik ? <p className="imza-balik__baslik">{baslik}</p> : null}
      {altMetin ? <p className="imza-balik__alt">{altMetin}</p> : null}

      <div className="imza-balik__sahne">
        <canvas
          ref={tuvalRef}
          className="imza-balik__tuval"
          tabIndex={0}
          role="application"
          aria-label={m.tuvalEtiketi}
          aria-describedby={ipucuId}
        />

        {faz === "oynuyor" || faz === "duraklatildi" ? (
          <div className="imza-balik__skor" aria-hidden="true">
            <span key={skor}>{skor}</span>
          </div>
        ) : null}

        {rekor > 0 && faz !== "bitti" ? (
          <div className="imza-balik__rekor" aria-hidden="true">
            {m.rekor} {rekor}
          </div>
        ) : null}

        {faz === "hazir" ? (
          <div className="imza-balik__katman">
            <button type="button" className="imza-balik__dugme" onClick={girdiVer}>
              {m.basla}
            </button>
          </div>
        ) : null}

        {faz === "duraklatildi" ? (
          <div className="imza-balik__katman imza-balik__katman--karart">
            <p className="imza-balik__durum">{m.duraklatildi}</p>
            <button type="button" className="imza-balik__dugme" onClick={girdiVer}>
              {m.devam}
            </button>
          </div>
        ) : null}

        {faz === "bitti" ? (
          <div className="imza-balik__katman imza-balik__katman--karart">
            <p className="imza-balik__durum">{m.oyunBitti}</p>
            <p className="imza-balik__sonuc">
              {m.skor} {skor} <span aria-hidden="true">/</span> {m.rekor} {rekor}
            </p>
            {yeniRekor ? <p className="imza-balik__rozet">{m.yeniRekor}</p> : null}
            <button type="button" className="imza-balik__dugme" onClick={girdiVer}>
              {m.tekrar}
            </button>
          </div>
        ) : null}
      </div>

      <p id={ipucuId} className="imza-balik__ipucu">
        {m.ipucu}
      </p>
      <p className="imza-balik__gizli" role="status" aria-live="polite">
        {duyuru}
      </p>
    </div>
  )
}
