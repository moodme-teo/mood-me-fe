"use client";

import {
  Image as ImageIcon,
  type LucideIcon,
  PaintBucket,
  Palette,
  Shapes,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

import {
  CROP_SHAPES,
  CROP_SIZE,
  type CropBackground,
  CropCanvas,
  type CropExporter,
  type CropExportFormat,
  CropShapeIcon,
  type CropShapeId,
  extractPalette,
  getCenteredTransform,
  getCropFit,
  type ImageMetrics,
  MAX_ZOOM,
  MIN_ZOOM,
  useCropEditor,
  zoomAtPoint,
} from "@/components/canvas";
import { updateMoodboard } from "@/lib/api/update-moodboard";
import type { MoodProfile } from "@/types/moodboard";

type Props = {
  moodboardId: string;
  baseImageUrl: string;
  // 리포트(GPT-5)가 아직 안 끝났으면 없을 수 있다. 저장 시 함께 영속화해 결과 페이지가
  // 실제 분석을 노출하도록 한다(없으면 서버가 PENDING 폴백). #99 크롭 흐름 통합.
  moodProfile?: MoodProfile | null;
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

function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed top-4 left-1/2 z-40 w-[calc(100%-32px)] max-w-sm -translate-x-1/2 rounded-xl bg-surface-inverse px-4 py-3 text-sm font-semibold text-white shadow-lg"
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
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-surface-inverse/48 p-4 sm:items-center sm:justify-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-title"
        className="w-full max-w-sm rounded-2xl bg-card p-5 text-foreground shadow-xl"
      >
        <h2 id="leave-title" className="text-lg font-bold">
          편집을 그만두시겠어요?
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-700">
          저장하지 않은 크롭 편집 내용은 사라져요.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-foreground"
          >
            계속 편집
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-surface-inverse px-4 py-3 text-sm font-bold text-white"
          >
            나가기
          </button>
        </div>
      </div>
    </div>
  );
}

function SaveSheet({
  isOpen,
  isSaving,
  onClose,
  onDownload,
  onComplete,
}: {
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onDownload: (format: CropExportFormat) => void;
  onComplete: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-surface-inverse/48 p-4 sm:items-center sm:justify-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-title"
        className="w-full max-w-sm space-y-2 rounded-2xl bg-card p-5 text-foreground shadow-xl"
      >
        <h2 id="save-title" className="text-lg font-bold">
          저장하기
        </h2>
        <p className="mb-2 text-sm leading-6 text-gray-700">
          미리보기 그대로 저장돼요. 투명 배경은 PNG에서 유지됩니다.
        </p>
        <button
          type="button"
          onClick={() => onDownload("png")}
          className="w-full rounded-xl border border-gray-300 bg-card px-4 py-3 text-sm font-bold text-foreground"
        >
          PNG로 저장 (투명 유지)
        </button>
        <button
          type="button"
          onClick={() => onDownload("jpeg")}
          className="w-full rounded-xl border border-gray-300 bg-card px-4 py-3 text-sm font-bold text-foreground"
        >
          JPG로 저장 (흰 배경)
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={onComplete}
          className="w-full rounded-xl bg-surface-inverse px-4 py-3 text-sm font-bold text-white disabled:opacity-45"
        >
          {isSaving ? "저장 중" : "완성하고 공유하기"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl px-4 py-2 text-sm font-bold text-gray-700"
        >
          닫기
        </button>
      </div>
    </div>
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
      <p className="text-sm leading-6 font-semibold text-gray-700">
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
          className="mt-2 w-full accent-neutral-950 disabled:opacity-40"
          aria-label="확대"
        />
      </label>
      <button
        type="button"
        onClick={onReset}
        disabled={!hasImage}
        className="w-full rounded-xl border border-gray-300 bg-card px-4 py-3 text-sm font-bold text-foreground disabled:opacity-40"
      >
        구도 초기화
      </button>
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
        <button
          key={item.id}
          type="button"
          aria-label={item.label}
          title={item.label}
          aria-pressed={shape === item.id}
          onClick={() => onSelect(item.id)}
          className={`flex size-16 shrink-0 items-center justify-center rounded-2xl border bg-card p-3 transition ${
            shape === item.id
              ? "border-foreground ring-2 ring-foreground"
              : "border-gray-200"
          }`}
        >
          <CropShapeIcon
            shape={item.id}
            className="size-full text-foreground"
          />
        </button>
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-pressed={isTransparent}
        onClick={onTransparent}
        className={`min-h-14 rounded-2xl border px-4 text-xs font-bold transition ${
          isTransparent
            ? "border-foreground bg-surface-inverse text-white"
            : "border-gray-100 bg-card text-gray-700"
        }`}
      >
        투명
      </button>
      <button
        type="button"
        aria-pressed={isBlur}
        onClick={onBlur}
        className={`min-h-14 rounded-2xl border px-4 text-xs font-bold transition ${
          isBlur
            ? "border-foreground bg-surface-inverse text-white"
            : "border-gray-100 bg-card text-gray-700"
        }`}
      >
        이미지 블러
      </button>
      {SOLID_PRESETS.map((preset) => (
        <button
          key={preset.color}
          type="button"
          aria-pressed={activeColor === preset.color}
          onClick={() => onSolid(preset.color)}
          className={`min-h-14 rounded-2xl border px-4 text-xs font-bold transition ${
            activeColor === preset.color
              ? "border-foreground ring-2 ring-foreground"
              : "border-gray-200"
          }`}
          style={{
            backgroundColor: preset.color,
            color: preset.color === "#ffffff" ? "#171717" : "#ffffff",
          }}
        >
          {preset.label}
        </button>
      ))}
      <label className="flex min-h-14 cursor-pointer items-center gap-2 rounded-2xl border border-gray-100 bg-card px-4 text-xs font-bold text-gray-700">
        직접 선택
        <input
          type="color"
          value={activeColor ?? "#ffffff"}
          onChange={(event) => onSolid(event.target.value)}
          className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
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
      <p className="text-sm leading-6 font-semibold text-gray-700">
        이미지에서 추천 색을 추출하지 못했어요. 배경 탭에서 직접 색을 골라
        보세요.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-gray-700">
        이미지에서 뽑은 추천 배경색
      </p>
      <div className="flex flex-wrap gap-2">
        {palette.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${color} 배경`}
            aria-pressed={activeColor === color}
            onClick={() => onSelect(color)}
            className={`h-11 w-11 rounded-full border-2 transition ${
              activeColor === color
                ? "border-foreground ring-2 ring-foreground"
                : "border-white shadow-sm"
            }`}
            style={{ backgroundColor: color }}
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
}: Props) {
  const router = useRouter();
  const crop = useCropEditor();
  const [tab, setTab] = useState<EditTab>("shape");
  const [toast, setToast] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isBaseImageFailed, setIsBaseImageFailed] = useState(false);
  const [metrics, setMetrics] = useState<ImageMetrics | null>(null);

  const exporterRef = useRef<CropExporter | null>(null);

  const { setPalette, setTransform } = crop;

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

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

  const handleDownload = useCallback(
    async (format: CropExportFormat) => {
      try {
        const dataUrl = await exporterRef.current?.(format);
        if (!dataUrl) {
          showToast("이미지 준비가 아직 끝나지 않았어요.");
          return;
        }
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `mood-me-${moodboardId}.${format === "png" ? "png" : "jpg"}`;
        link.click();
        setIsSaveOpen(false);
        showToast(`${format === "png" ? "PNG" : "JPG"} 이미지를 저장했어요.`);
      } catch (error) {
        console.error(error);
        showToast("이미지 저장에 실패했어요. 다시 시도해 주세요.");
      }
    },
    [moodboardId, showToast],
  );

  const handleComplete = useCallback(async () => {
    setIsSaving(true);
    try {
      const exportedImageDataUrl =
        (await exporterRef.current?.("png")) ?? undefined;
      // 크롭 결과는 한 장의 평면 이미지 — elements는 비우고 export 이미지를 저장한다.
      // moodProfile은 있을 때만 함께 저장(없으면 서버가 기존 값 유지 / PENDING 폴백).
      await updateMoodboard(moodboardId, {
        baseImageUrl,
        elements: [],
        exportedImageDataUrl,
        ...(moodProfile ? { moodProfile } : {}),
      });
      router.push(`/moodboard/${moodboardId}`);
    } catch (error) {
      console.error(error);
      showToast("저장하지 못했어요. 다시 시도해 주세요.");
      setIsSaving(false);
    }
  }, [baseImageUrl, moodProfile, moodboardId, router, showToast]);

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
      <SaveSheet
        isOpen={isSaveOpen}
        isSaving={isSaving}
        onClose={() => setIsSaveOpen(false)}
        onDownload={handleDownload}
        onComplete={handleComplete}
      />

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-foreground/5 bg-background/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => setIsLeaveOpen(true)}
          className="rounded-xl border border-gray-300 bg-card px-3 py-2 text-sm font-bold"
        >
          뒤로
        </button>
        <h1 className="text-base font-bold">편집</h1>
        <button
          type="button"
          disabled={isBaseImageFailed}
          onClick={() => setIsSaveOpen(true)}
          className="rounded-xl bg-surface-inverse px-3 py-2 text-sm font-bold text-white disabled:opacity-45"
        >
          저장
        </button>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-5">
        {isBaseImageFailed ? (
          <div className="w-full max-w-sm rounded-2xl bg-card p-5 text-center shadow-sm">
            <p className="text-lg font-bold">이미지를 불러오지 못했어요.</p>
            <p className="mt-2 text-sm leading-6 text-gray-700">
              네트워크를 확인한 뒤 다시 시도해 주세요.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsBaseImageFailed(false);
                router.refresh();
              }}
              className="mt-4 rounded-xl bg-surface-inverse px-4 py-3 text-sm font-bold text-white"
            >
              다시 시도
            </button>
          </div>
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
          />
        )}
      </div>

      <div className="sticky bottom-0 z-30">
        <nav
          aria-label="크롭 편집 모드"
          className="grid grid-cols-4 gap-2 border-t border-foreground/5 bg-surface-card px-3 py-3"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              title={item.label}
              aria-pressed={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`flex min-h-11 items-center justify-center rounded-2xl border transition ${
                tab === item.id
                  ? "border-foreground bg-surface-inverse text-white"
                  : "border-gray-100 bg-card text-gray-700"
              }`}
            >
              <item.Icon className="size-5" aria-hidden strokeWidth={2.25} />
            </button>
          ))}
        </nav>
        <section className="rounded-t-3xl bg-card px-4 pt-3 pb-5 shadow-[0_-8px_24px_rgba(0,0,0,0.10)]">
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
