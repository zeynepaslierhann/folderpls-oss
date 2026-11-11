import Image from "next/image";
import { BRAND_LOGO_SRC } from "@/lib/brand";

interface BrandLogoProps {
  className?: string;
  priority?: boolean;
}

/**
 * Sitenin logosu (next/image; site sayfaları bileşeni zaten yüklüyor). Panelde
 * PanelBrandLogo kullanılır. Yanında "FolderPls" yazısı olduğu için dekoratiftir.
 * width/height optimize kaynak genişliğini seçer, gerçek boyutu className verir.
 */
export function BrandLogo({ className, priority }: BrandLogoProps) {
  return <Image src={BRAND_LOGO_SRC} alt="" width={40} height={32} priority={priority} className={className} />;
}
