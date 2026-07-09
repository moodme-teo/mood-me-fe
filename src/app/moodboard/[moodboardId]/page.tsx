import type { Metadata } from "next";

import MoodboardResult from "@/components/board/MoodboardResult";
import { getMoodboardById } from "@/lib/moodboard/get-moodboard";

type Props = {
  params: Promise<{ moodboardId: string }>;
};

const FALLBACK_METADATA: Metadata = {
  title: "mood·me",
  description: "짧은 테스트로 나만의 AI 무드보드를 만들고 공유하는 mood·me",
};

// 카카오톡·트위터·슬랙 등 공유 미리보기 카드가 실제 저장된 무드보드를 보여주도록
// 실제 데이터를 조회한다(mock 아님) — getMoodboardById는 API 라우트와 동일한 함수.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { moodboardId } = await params;
  const result = await getMoodboardById(moodboardId);

  if (!result.ok) {
    return FALLBACK_METADATA;
  }

  const moodboard = result.value;
  const title = `${moodboard.moodProfile.title} · mood·me`;

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ),
    title,
    description: moodboard.moodProfile.type_name,
    openGraph: {
      title,
      description: moodboard.moodProfile.type_name,
      images: [moodboard.baseImageUrl],
    },
  };
}

export default async function MoodboardResultPage({ params }: Props) {
  const { moodboardId } = await params;

  return <MoodboardResult moodboardId={moodboardId} />;
}
