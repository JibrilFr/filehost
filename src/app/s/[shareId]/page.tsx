import { notFound } from "next/navigation";
import { getShareData } from "@/actions/shares";
import { SharePageClient } from "@/components/share/share-page-client";
import type { Metadata } from "next";

interface SharePageProps {
  params: Promise<{ shareId: string }>;
}

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { shareId } = await params;
  const data = await getShareData(shareId);

  if (!data) {
    return { title: "File not found — FileHost" };
  }

  return {
    title: `${data.fileName} — FileHost`,
    description: `Download ${data.fileName} from FileHost`,
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { shareId } = await params;
  const data = await getShareData(shareId);

  if (!data) {
    notFound();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <SharePageClient data={data} />
    </div>
  );
}
