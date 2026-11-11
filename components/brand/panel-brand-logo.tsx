import { BRAND_LOGO_SRC } from "@/lib/brand";

const optimized = (width: number) => `/_next/image?url=${encodeURIComponent(BRAND_LOGO_SRC)}&w=${width}&q=75`;

/**
 * Panel ve demo kabuğunun logosu: BrandLogo ile aynı dosya, aynı optimize adresler.
 * Ayrı dosya ve düz <img>, çünkü panel next/image çalışma kodunu (~29 KB)
 * yalnız bu 20 px'lik işaret için indirmesin.
 */
export function PanelBrandLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={optimized(48)}
      srcSet={`${optimized(32)} 1x, ${optimized(48)} 2x`}
      alt=""
      width={20}
      height={20}
      decoding="async"
      className={className}
    />
  );
}
