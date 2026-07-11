"use client";

import {
  ArrowLeft,
  CloudFog,
  Image as ImageIcon,
  Loader2,
  type LucideIcon,
  PaintBucket,
  Palette,
  Pipette,
  Save,
  Shapes,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CROP_SHAPES,
  CROP_SIZE,
  type CropBackground,
  CropCanvas,
  type CropExporter,
  CropShapeIcon,
  type CropShapeId,
  type CropState,
  extractPalette,
  getCenteredTransform,
  getCropFit,
  type ImageMetrics,
  MAX_ZOOM,
  MIN_ZOOM,
  useCropEditor,
  zoomAtPoint,
} from "@/components/canvas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogActions, DialogContent } from "@/components/ui/dialog";
import { useConfirmLeave } from "@/hooks/useConfirmLeave";
import { getGenerationJob } from "@/lib/api/get-generation-job";
import { updateMoodboard } from "@/lib/api/update-moodboard";
import {
  clearEditProgress,
  saveEditProgress,
} from "@/lib/mood-test/edit-progress-storage";
import {
  uploadBaseImage,
  uploadExportedImage,
} from "@/lib/moodboard/upload-exported-image";
import { preloadImage } from "@/lib/preload-image";
import type { AnalysisStatus, EditState, MoodProfile } from "@/types/moodboard";

type Props = {
  moodboardId: string;
  baseImageUrl: string;
  // 리포트(GPT-5)가 아직 안 끝났으면 없을 수 있다. 저장 시 함께 영속화해 결과 페이지가
  // 실제 분석을 노출하도록 한다(없으면 서버가 PENDING 폴백). #99 크롭 흐름 통합.
  moodProfile?: MoodProfile | null;
  // moodProfile과 세트 — 결과 페이지가 "아직 안 끝남"과 "실패"를 구별하는 데 쓴다(#122).
  analysisStatus?: AnalysisStatus;
  // 원본 테스트 세션 id. 생성 직후 편집(/test/[sessionId]/edit)에서만 넘어온다 — 최초 저장
  // 시점에만 의미가 있어 재편집(/moodboard/[id]/edit)에서는 비워 둔다. "분석 다시 시도"가
  // journey를 되찾아갈 연결고리다(#122).
  sessionId?: string;
  // 재편집 구도 복원(#116) — 결과물→편집 왕복 시 이전 도형·배경·확대·위치를 되살린다.
  // sourceImageUrl이 baseImageUrl과 다르면(레거시 보드 등) 무시하고 기본값으로 진입한다.
  initialEditState?: EditState | null;
};

type EditTab = "image" | "shape" | "background" | "color";

const TABS: { id: EditTab; label: string; Icon: LucideIcon }[] = [
  { id: "image", label: "이미지", Icon: ImageIcon },
  { id: "shape", label: "도형", Icon: Shapes },
  { id: "background", label: "배경", Icon: PaintBucket },
  { id: "color", label: "색상", Icon: Palette },
];

const SOLID_PRESETS: { label: string; color: string }[] = [
  { label: "흰색", color: "#ffffff" },
  { label: "검정", color: "#171717" },
];

const TRANSPARENT_SWATCH_STYLE = {
  backgroundImage:
    "conic-gradient(var(--gray-300) 90deg, transparent 90deg 180deg, var(--gray-300) 180deg 270deg, transparent 270deg)",
  backgroundSize: "10px 10px",
};

const SWATCH_BASE =
  "flex size-11 shrink-0 items-center justify-center rounded-full border-2";

function swatchRing(isActive: boolean) {
  return isActive
    ? "border-foreground ring-2 ring-foreground"
    : "border-white shadow-card";
}

function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed top-4 left-1/2 z-40 w-[calc(100%-32px)] max-w-sm -translate-x-1/2 rounded-lg bg-surface-inverse px-4 py-3 text-sm font-semibold text-on-inverse shadow-ink"
    >
      {message}
    </div>
  );
}

function ConfirmLeaveDialog({
  isOpen,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        title="편집을 그만두시겠어요?"
        description="저장하지 않은 크롭 편집 내용은 사라져요."
      >
        <DialogActions>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onCancel}
          >
            계속 편집
          </Button>
          <Button type="button" tone="ink" size="md" onClick={onConfirm}>
            나가기
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}

function ImagePanel({
  zoom,
  onZoomChange,
  onReset,
  hasImage,
}: {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onReset: () => void;
  hasImage: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-gray-700 text-caption">
        두 손가락으로 확대·축소, 드래그로 이동, 더블탭으로 구도를 초기화할 수
        있어요.
      </p>
      <label className="block text-xs font-bold text-gray-700">
        확대
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          disabled={!hasImage}
          onChange={(event) => onZoomChange(Number(event.target.value))}
          className="mt-2 w-full accent-gray-900 disabled:opacity-40"
          aria-label="확대"
        />
      </label>
      <Button
        type="button"
        variant="secondary"
        size="md"
        className="w-full"
        onClick={onReset}
        disabled={!hasImage}
      >
        구도 초기화
      </Button>
    </div>
  );
}

function ShapePanel({
  shape,
  onSelect,
}: {
  shape: CropShapeId;
  onSelect: (shape: CropShapeId) => void;
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {CROP_SHAPES.map((item) => (
        <Button
          key={item.id}
          type="button"
          aria-label={item.label}
          title={item.label}
          aria-pressed={shape === item.id}
          onClick={() => onSelect(item.id)}
          variant={"ghost"}
          className={`flex size-16 shrink-0 items-center justify-center bg-card p-3 ${shape === item.id ? "border border-gray-300" : ""}`}
        >
          <CropShapeIcon
            shape={item.id}
            className="size-full text-foreground"
          />
        </Button>
      ))}
    </div>
  );
}

function BackgroundPanel({
  background,
  onTransparent,
  onSolid,
  onBlur,
}: {
  background: CropBackground;
  onTransparent: () => void;
  onSolid: (color: string) => void;
  onBlur: () => void;
}) {
  const isTransparent = background.type === "transparent";
  const isBlur = background.type === "blur";
  const activeColor = background.type === "solid" ? background.color : null;
  const isCustomActive =
    activeColor !== null &&
    !SOLID_PRESETS.some((preset) => preset.color === activeColor);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        aria-label="투명"
        aria-pressed={isTransparent}
        onClick={onTransparent}
        style={TRANSPARENT_SWATCH_STYLE}
        className={`${SWATCH_BASE} ${swatchRing(isTransparent)}`}
      />
      <button
        type="button"
        aria-label="이미지 블러"
        aria-pressed={isBlur}
        onClick={onBlur}
        className={`${SWATCH_BASE} bg-surface-sunken ${swatchRing(isBlur)}`}
      >
        <CloudFog className="size-5 text-gray-700" aria-hidden />
      </button>
      {SOLID_PRESETS.map((preset) => (
        <button
          key={preset.color}
          type="button"
          aria-label={preset.label}
          aria-pressed={activeColor === preset.color}
          onClick={() => onSolid(preset.color)}
          style={{ backgroundColor: preset.color }}
          className={`${SWATCH_BASE} ${swatchRing(activeColor === preset.color)}`}
        />
      ))}
      <label
        className={`${SWATCH_BASE} relative cursor-pointer bg-surface-sunken ${swatchRing(isCustomActive)}`}
      >
        <Pipette className="size-5 text-gray-700" aria-hidden />
        <input
          type="color"
          value={activeColor ?? "#ffffff"}
          onChange={(event) => onSolid(event.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          aria-label="배경색 직접 선택"
        />
      </label>
    </div>
  );
}

function ColorPanel({
  palette,
  activeColor,
  onSelect,
}: {
  palette: string[];
  activeColor: string | null;
  onSelect: (color: string) => void;
}) {
  if (palette.length === 0) {
    return (
      <p className="text-gray-700 text-caption">
        이미지에서 추천 색을 추출하지 못했어요. 배경 탭에서 직접 색을 골라
        보세요.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-gray-700 text-caption">이미지에서 뽑은 추천 배경색</p>
      <div className="flex flex-wrap gap-3">
        {palette.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${color} 배경`}
            aria-pressed={activeColor === color}
            onClick={() => onSelect(color)}
            style={{ backgroundColor: color }}
            className={`${SWATCH_BASE} ${swatchRing(activeColor === color)}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function MoodboardCropEditor({
  moodboardId,
  baseImageUrl,
  moodProfile,
  analysisStatus,
  sessionId,
  initialEditState,
}: Props) {
  const router = useRouter();
  // sourceImageUrl이 지금 편집 대상과 다르면(레거시 보드 등) 복원하지 않는다.
  const initialCropState = useMemo<CropState | undefined>(() => {
    if (!initialEditState || initialEditState.sourceImageUrl !== baseImageUrl) {
      return undefined;
    }
    return {
      // CropShapeId는 확장 가능한 문자열 유니언 — 저장된 값을 그대로 신뢰한다.
      // 알 수 없는 값이면 crop-shapes.ts가 사각형으로 안전 폴백한다.
      shape: initialEditState.shapeId as CropShapeId,
      background: initialEditState.background,
      transform: {
        zoom: initialEditState.scale,
        offsetX: initialEditState.x,
        offsetY: initialEditState.y,
      },
    };
  }, [initialEditState, baseImageUrl]);
  const crop = useCropEditor(initialCropState);
  const [tab, setTab] = useState<EditTab>("shape");
  const [toast, setToast] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { isLeaveOpen, setIsLeaveOpen } = useConfirmLeave(true);
  const [isBaseImageFailed, setIsBaseImageFailed] = useState(false);
  const [metrics, setMetrics] = useState<ImageMetrics | null>(null);

  const exporterRef = useRef<CropExporter | null>(null);

  const { setPalette, setTransform } = crop;

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    // 생성 직후 편집(sessionId 있음)만 이어하기 표시를 남긴다 — 아직 저장 전이라 여기서
    // 나가면 완료된 job 이 서버에 남아 있어도 홈에서 편집으로 되돌아올 길이 없다. 저장한
    // 보드 재편집(sessionId 없음)은 이미 히스토리에 있으므로 표시하지 않는다.
    // baseImageUrl 을 함께 남겨 홈 캐러셀이 편집중 카드를 서버 조회 없이 바로 그린다
    // (data: URL 이면 storage 는 알아서 담지 않는다).
    if (sessionId) saveEditProgress(sessionId, baseImageUrl);
  }, [sessionId, baseImageUrl]);

  const handleImageLoad = useCallback(
    (image: HTMLImageElement) => {
      setMetrics({
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      });
      setPalette(extractPalette(image));
    },
    [setPalette],
  );

  const handleExportReady = useCallback((exporter: CropExporter) => {
    exporterRef.current = exporter;
  }, []);

  const handleImageError = useCallback(() => setIsBaseImageFailed(true), []);

  const handleZoomChange = useCallback(
    (zoom: number) => {
      if (!metrics) return;
      setTransform(
        zoomAtPoint(
          crop.transform,
          metrics,
          CROP_SIZE,
          zoom,
          CROP_SIZE / 2,
          CROP_SIZE / 2,
          getCropFit(crop.shape),
        ),
      );
    },
    [crop.transform, crop.shape, metrics, setTransform],
  );

  const handleReset = useCallback(() => {
    if (!metrics) return;
    setTransform(
      getCenteredTransform(metrics, CROP_SIZE, getCropFit(crop.shape)),
    );
  }, [crop.shape, metrics, setTransform]);

  const handleComplete = useCallback(async () => {
    setIsSaving(true);
    try {
      const exportedImageDataUrl =
        (await exporterRef.current?.("png")) ?? undefined;

      // 업로드 2건과 최신 job 재조회는 서로 독립적이다 — 순차로 기다리면 저장 버튼을
      // 누른 뒤 그만큼 그대로 화면이 멈춰 있는 것처럼 보인다. 동시에 진행한다.
      //
      // Promise.all이 아니라 allSettled를 쓴다 — all은 하나가 실패하면 즉시 reject하고
      // 나머지는 백그라운드에서 계속 돈다. 그 상태로 사용자가 바로 다시 "완성하고
      // 공유하기"를 누르면, 이번 시도의 새 업로드와 아까 실패로 처리했던 시도의 남은
      // 업로드가 같은 Storage 경로(upsert)를 두고 경합해 새 저장이 오래된 내용으로
      // 덮어써질 수 있다. allSettled로 셋 다 완전히 끝난 뒤에야 실패 여부를 판단하면,
      // 다음 시도가 시작될 때(=isSaving이 풀릴 때) 이전 시도의 요청은 전부 끝나 있다.
      const [exportedUpload, baseUpload, jobFetchResult] =
        await Promise.allSettled([
          // base64 dataURL을 그대로 저장 요청에 실으면 Vercel 요청 바디 제한(413)에
          // 걸린다(#163) — Supabase Storage에 먼저 올리고 결과 URL만 보낸다.
          exportedImageDataUrl
            ? uploadExportedImage(moodboardId, exportedImageDataUrl)
            : Promise.resolve(undefined),
          // baseImageUrl은 생성 시점에 이미 Storage URL이어야 정상이다
          // (uploadGeneratedBaseImage, generate-mood-analysis.ts) — 그 전에 만들어진
          // 레거시 보드만 아직 base64일 수 있어 재저장 시 여기서 자가 치유한다.
          // 그러지 않으면 이 값도 exportedImageUrl과 같은 이유로 PATCH body에서
          // 413을 일으킨다(#163 후속).
          baseImageUrl.startsWith("data:")
            ? uploadBaseImage(moodboardId, baseImageUrl).then(
                (url) => url ?? baseImageUrl,
              )
            : Promise.resolve(baseImageUrl),
          // 이 화면은 서버 컴포넌트가 렌더 시점에 job을 1회만 읽어 moodProfile을 prop으로
          // 내려받는다 — 그 이후 리포트(GPT-5)가 끝나도 이 prop은 갱신되지 않는다. 저장
          // 직전에 최신 job을 한 번 더 조회해 그 스냅샷 대신 쓴다 — 그래야 편집 화면에
          // 머무는 동안 리포트가 끝난 경우에도 결과가 유실되지 않는다(#125). sessionId가
          // 없으면(재편집) 애초에 다시 조회할 job이 없다. 재조회 실패해도 저장 자체를
          // 막지 않는다 — ok:false로 표시해 기존 prop 스냅샷으로 폴백한다.
          sessionId
            ? getGenerationJob(sessionId).then(
                (job) => ({ ok: true as const, job }),
                (error: unknown) => {
                  console.error(error);
                  return { ok: false as const };
                },
              )
            : Promise.resolve({ ok: false as const }),
        ]);

      // 업로드 2건은 실패하면 저장 자체를 막아야 한다(기존 동작) — allSettled로 모아뒀으니
      // 여기서 직접 던져 아래 catch로 보낸다. job 재조회는 이미 내부에서 실패를 삼켜
      // 항상 fulfilled다.
      if (exportedUpload.status === "rejected") throw exportedUpload.reason;
      if (baseUpload.status === "rejected") throw baseUpload.reason;

      const exportedImageUrl = exportedUpload.value;
      const persistedBaseImageUrl = baseUpload.value;
      const jobFetch =
        jobFetchResult.status === "fulfilled"
          ? jobFetchResult.value
          : ({ ok: false } as const);

      const latestMoodProfile = jobFetch.ok
        ? jobFetch.job.moodProfile
        : moodProfile;
      const latestAnalysisStatus = jobFetch.ok
        ? jobFetch.job.analysisStatus
        : analysisStatus;

      // 결과 화면은 이 URL을 <img src>로 그대로 보여준다 — 방금 올라간 Storage 경로라
      // 캐시 미스가 확정이다. PATCH가 끝나길 기다리는 동안 미리 받아두면, 결과 화면
      // 도착 시점엔 캐시에 있어 이미지가 뒤늦게 뜨는 게 덜 보인다(useGenerationPolling의
      // 프리로드와 같은 이유 — 여긴 <img>로 그대로 보여주기만 하니 crossOrigin은 불필요).
      if (exportedImageUrl) {
        preloadImage(exportedImageUrl);
      }

      // 크롭 결과는 한 장의 평면 이미지 — elements는 비우고 export 이미지를 저장한다.
      // moodProfile·analysisStatus는 있을 때만 함께 저장(없으면 서버가 기존 값 유지 / PENDING
      // 폴백). editState는 재편집 구도 복원용으로 항상 현재 값을 함께 커밋한다 (#116).
      // sessionId는 최초 저장(생성 직후 편집)에서만 온다 — 재편집 저장에서는 보내지 않아
      // 서버가 기존 test_session_id를 그대로 둔다(#122).
      // 소유자는 서버가 쿠키에서 읽는다 — 여기서 실어 보내지 않는다 (#126).
      await updateMoodboard(moodboardId, {
        baseImageUrl: persistedBaseImageUrl,
        elements: [],
        exportedImageUrl,
        editState: {
          sourceImageUrl: persistedBaseImageUrl,
          shapeId: crop.shape,
          background: crop.background,
          scale: crop.transform.zoom,
          x: crop.transform.offsetX,
          y: crop.transform.offsetY,
        },
        ...(latestMoodProfile ? { moodProfile: latestMoodProfile } : {}),
        ...(latestAnalysisStatus
          ? { analysisStatus: latestAnalysisStatus }
          : {}),
        ...(sessionId ? { sessionId } : {}),
      });
      // 저장까지 마쳤으니 편집 이어하기 표시를 거둔다 — 이제 히스토리에서 열 수 있다.
      if (sessionId) clearEditProgress(sessionId);
      // 결과 페이지가 "직후 진입"과 "히스토리 재열람"을 구분하는 유일한 신호 (#157).
      router.push(`/moodboard/${moodboardId}?from=complete`);
    } catch (error) {
      console.error(error);
      showToast("저장하지 못했어요. 다시 시도해 주세요.");
      setIsSaving(false);
    }
  }, [
    baseImageUrl,
    moodProfile,
    analysisStatus,
    sessionId,
    moodboardId,
    router,
    showToast,
    crop.shape,
    crop.background,
    crop.transform,
  ]);

  const activeSolidColor =
    crop.background.type === "solid" ? crop.background.color : null;

  const paletteActiveColor = useMemo(
    () =>
      crop.background.type === "solid" &&
      crop.palette.includes(crop.background.color)
        ? crop.background.color
        : null,
    [crop.background, crop.palette],
  );

  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
      <Toast message={toast} />
      <ConfirmLeaveDialog
        isOpen={isLeaveOpen}
        onCancel={() => setIsLeaveOpen(false)}
        onConfirm={() => router.push("/")}
      />
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-foreground/5 bg-background/95 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          size="icon-md"
          aria-label="뒤로"
          disabled={isSaving}
          onClick={() => setIsLeaveOpen(true)}
        >
          <ArrowLeft aria-hidden />
        </Button>
        <h1 className="text-heading-md">편집</h1>
        <Button
          type="button"
          variant="primary"
          tone="ink"
          size="icon-md"
          aria-label={isSaving ? "저장 중" : "완료"}
          disabled={isBaseImageFailed || isSaving}
          onClick={handleComplete}
        >
          {/* 아이콘만 있는 버튼이라 disabled의 옅어짐(40%)만으로는 "눌렸다"가 잘 안
              보인다 — 저장 중엔 아이콘 자체를 스피너로 바꿔 확실한 진행 신호를 준다. */}
          {isSaving ? (
            <Loader2
              aria-hidden
              className="animate-spin motion-reduce:animate-none"
            />
          ) : (
            <Save aria-hidden />
          )}
        </Button>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-5">
        {isBaseImageFailed ? (
          <Card className="w-full max-w-sm px-5 text-center">
            <p className="text-heading-md">이미지를 불러오지 못했어요.</p>
            <p className="text-gray-700 text-caption">
              네트워크를 확인한 뒤 다시 시도해 주세요.
            </p>
            <Button
              type="button"
              variant="primary"
              tone="ink"
              size="md"
              onClick={() => {
                setIsBaseImageFailed(false);
                router.refresh();
              }}
            >
              다시 시도
            </Button>
          </Card>
        ) : (
          <CropCanvas
            baseImageUrl={baseImageUrl}
            shape={crop.shape}
            background={crop.background}
            transform={crop.transform}
            onTransformChange={crop.setTransform}
            onImageLoad={handleImageLoad}
            onImageError={handleImageError}
            onExportReady={handleExportReady}
            initialTransform={initialCropState?.transform}
          />
        )}
      </div>

      <div className="sticky bottom-0 z-30">
        <nav
          aria-label="크롭 편집 모드"
          className="grid grid-cols-4 gap-2 border-t border-foreground/5 bg-surface-card px-3 py-1"
        >
          {TABS.map((item) => (
            <Button
              key={item.id}
              type="button"
              aria-label={item.label}
              title={item.label}
              aria-pressed={tab === item.id}
              onClick={() => setTab(item.id)}
              variant={"ghost"}
              className={`flex min-h-11 items-center justify-center ${
                tab === item.id ? "border border-gray-300" : ""
              }`}
            >
              <item.Icon className="size-5" aria-hidden strokeWidth={2.25} />
            </Button>
          ))}
        </nav>
        <section className="border-t bg-card px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
          {tab === "image" ? (
            <ImagePanel
              zoom={crop.transform.zoom}
              onZoomChange={handleZoomChange}
              onReset={handleReset}
              hasImage={Boolean(metrics)}
            />
          ) : null}
          {tab === "shape" ? (
            <ShapePanel shape={crop.shape} onSelect={crop.setShape} />
          ) : null}
          {tab === "background" ? (
            <BackgroundPanel
              background={crop.background}
              onTransparent={crop.setTransparentBackground}
              onSolid={crop.setSolidBackground}
              onBlur={crop.setBlurBackground}
            />
          ) : null}
          {tab === "color" ? (
            <ColorPanel
              palette={crop.palette}
              activeColor={paletteActiveColor ?? activeSolidColor}
              onSelect={crop.setSolidBackground}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}
