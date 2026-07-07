import { Header } from "@/components/layout/header";
import { UploadClient } from "@/components/upload/upload-client";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              Upload &amp; share files
            </h1>
            <p className="mt-2 text-muted-foreground">
              Fast, direct uploads. No file size worries.
            </p>
          </div>

          <UploadClient />
        </div>
      </main>
    </div>
  );
}
