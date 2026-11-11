import type { Metadata } from "next";

// Sayfa istemci bileşeni ("use client") olduğu için başlık layout'tan verilir.
export const metadata: Metadata = {
  title: "Drive",
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
