import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { NotFoundContent } from "@/components/not-found-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found",
  description: "The page you're looking for doesn't exist. Return to FolderPls homepage to organize your Google Drive files with metadata tags.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <Navbar />
      <main id="main-content" className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <NotFoundContent />
      </main>
      <Footer />
    </div>
  );
}
