import AiMockNotice from "@/components/board/AiMockNotice";
import GeneratingLayout from "@/components/generating/GeneratingLayout";
import { isAiMockEnabled } from "@/lib/ai-mock";

export default async function GeneratingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return (
    <>
      <GeneratingLayout sessionId={sessionId} />
      {isAiMockEnabled() && <AiMockNotice />}
    </>
  );
}
