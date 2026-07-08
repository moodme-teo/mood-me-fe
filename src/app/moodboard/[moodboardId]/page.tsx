import type { Metadata } from "next";

import MoodboardResult from "@/components/board/MoodboardResult";
import { getMockMoodboard } from "@/lib/moodboard/mock";

type Props = {
  params: Promise<{ moodboardId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { moodboardId } = await params;
  const moodboard = getMockMoodboard(moodboardId);

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ),
    title: `${moodboard.moodProfile.title} · mood·me`,
    description: moodboard.moodProfile.type_name,
    openGraph: {
      title: `${moodboard.moodProfile.title} · mood·me`,
      description: moodboard.moodProfile.type_name,
      images: [moodboard.baseImageUrl],
    },
  };
}

export default async function MoodboardResultPage({ params }: Props) {
  const { moodboardId } = await params;

  return <MoodboardResult moodboardId={moodboardId} />;
}
