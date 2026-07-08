"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  loadMoodboardDraft,
  saveMoodboardDraft,
} from "@/components/board/moodboard-draft-storage";
import { BoardCanvas, STICKER_ASSETS, useMoodboard } from "@/components/canvas";
import type {
  MoodboardElement,
  MoodboardTool,
  StickerAssetId,
} from "@/components/canvas";
import { updateMoodboard } from "@/lib/api/update-moodboard";

type Props = {
  moodboardId: string;
  baseImageUrl: string;
};

const TOOL_ITEMS: { id: MoodboardTool; label: string; symbol: string }[] = [
  { id: "move", label: "이동", symbol: "Move" },
  { id: "sticker", label: "스티커", symbol: "Sticker" },
  { id: "text", label: "글자", symbol: "Text" },
  { id: "pen", label: "펜", symbol: "Pen" },
  { id: "eraser", label: "지우개", symbol: "Erase" },
];

const TEXT_COLORS = ["#ffffff", "#171717", "#ffef62", "#ff7a90", "#7ee7ff"];
const PEN_COLORS = ["#171717", "#ffffff", "#ff5f7a", "#5d5fef", "#39a96b"];
const FONT_OPTIONS = ["Arial", "Georgia", "Verdana"];

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
          저장하지 않고 나가시겠어요?
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-700">
          로컬 드래프트는 남아 있어서 같은 브라우저에서 다시 이어갈 수 있어요.
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

function ToolButton({
  item,
  isActive,
  onClick,
}: {
  item: (typeof TOOL_ITEMS)[number];
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      aria-label={`${item.label} 도구`}
      title={`${item.label} 도구`}
      onClick={onClick}
      className={`flex min-h-14 flex-col items-center justify-center rounded-2xl border px-2 text-[11px] font-bold transition ${
        isActive
          ? "border-foreground bg-surface-inverse text-white"
          : "border-gray-100 bg-card text-gray-700"
      }`}
    >
      <span className="text-[10px] leading-none">{item.symbol}</span>
      <span className="mt-1">{item.label}</span>
    </button>
  );
}

function StickerPanel({
  onAddSticker,
}: {
  onAddSticker: (assetId: StickerAssetId) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {STICKER_ASSETS.map((asset) => (
        <button
          key={asset.id}
          type="button"
          onClick={() => onAddSticker(asset.id)}
          className="flex min-h-16 flex-col items-center justify-center rounded-2xl border border-gray-100 bg-card px-2 text-xs font-bold text-foreground"
        >
          <span
            className="mb-1 h-5 w-8 rounded-full border"
            style={{ backgroundColor: asset.fill, borderColor: asset.stroke }}
          />
          {asset.label}
        </button>
      ))}
    </div>
  );
}

function TextPanel({
  selectedElement,
  onAddText,
  onBeginTextEdit,
  onUpdateText,
}: {
  selectedElement: MoodboardElement | null;
  onAddText: () => void;
  onBeginTextEdit: () => void;
  onUpdateText: (properties: Record<string, string | number>) => void;
}) {
  const textElement = selectedElement?.type === "text" ? selectedElement : null;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onAddText}
        className="w-full rounded-xl bg-surface-inverse px-4 py-3 text-sm font-bold text-white"
      >
        텍스트 박스 추가
      </button>
      {textElement ? (
        <div className="space-y-3">
          <input
            value={textElement.properties.content}
            onFocus={onBeginTextEdit}
            onChange={(event) => onUpdateText({ content: event.target.value })}
            placeholder="무드 한 줄"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base font-semibold text-foreground placeholder:text-muted-foreground"
          />
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <select
              value={textElement.properties.fontFamily}
              onChange={(event) =>
                onUpdateText({ fontFamily: event.target.value })
              }
              className="rounded-xl border border-gray-300 bg-card px-3 py-2 text-sm font-semibold text-foreground"
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={14}
              max={72}
              value={textElement.properties.fontSize}
              onChange={(event) =>
                onUpdateText({ fontSize: Number(event.target.value) })
              }
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-foreground"
              aria-label="글자 크기"
            />
          </div>
          <div className="flex items-center gap-2">
            {TEXT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`${color} 글자색`}
                onClick={() => onUpdateText({ color })}
                className="h-9 w-9 rounded-full border-2 border-foreground"
                style={{ backgroundColor: color }}
              />
            ))}
            <button
              type="button"
              onClick={() => onUpdateText({ align: "left" })}
              className="ml-auto rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold"
            >
              왼쪽
            </button>
            <button
              type="button"
              onClick={() => onUpdateText({ align: "center" })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold"
            >
              중앙
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PenPanel({
  penStyle,
  onChange,
}: {
  penStyle: { stroke: string; strokeWidth: number };
  onChange: (style: { stroke?: string; strokeWidth?: number }) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {PEN_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${color} 펜 색상`}
            onClick={() => onChange({ stroke: color })}
            className={`h-9 w-9 rounded-full border-2 ${
              penStyle.stroke === color
                ? "border-foreground"
                : "border-gray-300"
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <label className="block text-xs font-bold text-gray-700">
        굵기
        <input
          type="range"
          min={2}
          max={16}
          value={penStyle.strokeWidth}
          onChange={(event) =>
            onChange({ strokeWidth: Number(event.target.value) })
          }
          className="mt-2 w-full accent-neutral-950"
        />
      </label>
    </div>
  );
}

function ContextPanel({
  tool,
  selectedElement,
  penStyle,
  onAddSticker,
  onAddText,
  onBeginTextEdit,
  onDeleteSelected,
  onPenStyleChange,
  onUndo,
  onUpdateText,
  canUndo,
}: {
  tool: MoodboardTool;
  selectedElement: MoodboardElement | null;
  penStyle: { stroke: string; strokeWidth: number };
  onAddSticker: (assetId: StickerAssetId) => void;
  onAddText: () => void;
  onBeginTextEdit: () => void;
  onDeleteSelected: () => void;
  onPenStyleChange: (style: { stroke?: string; strokeWidth?: number }) => void;
  onUndo: () => void;
  onUpdateText: (properties: Record<string, string | number>) => void;
  canUndo: boolean;
}) {
  return (
    <section className="space-y-3 rounded-t-3xl bg-card px-4 pt-3 pb-4 shadow-[0_-8px_24px_rgba(0,0,0,0.10)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-foreground">
          {tool === "sticker"
            ? "스티커 고르기"
            : tool === "text"
              ? "글자 꾸미기"
              : tool === "pen"
                ? "펜 설정"
                : selectedElement
                  ? "선택한 요소"
                  : "캔버스 도구"}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-foreground disabled:opacity-40"
          >
            Undo
          </button>
          {selectedElement ? (
            <button
              type="button"
              onClick={onDeleteSelected}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white"
            >
              선택 삭제
            </button>
          ) : null}
        </div>
      </div>
      {tool === "sticker" ? <StickerPanel onAddSticker={onAddSticker} /> : null}
      {tool === "text" || selectedElement?.type === "text" ? (
        <TextPanel
          selectedElement={selectedElement}
          onAddText={onAddText}
          onBeginTextEdit={onBeginTextEdit}
          onUpdateText={onUpdateText}
        />
      ) : null}
      {tool === "pen" ? (
        <PenPanel penStyle={penStyle} onChange={onPenStyleChange} />
      ) : null}
      {tool === "eraser" ? (
        <p className="text-sm leading-6 font-semibold text-gray-700">
          지울 요소를 탭하면 바로 삭제돼요. base 이미지는 지워지지 않습니다.
        </p>
      ) : null}
    </section>
  );
}

export default function MoodboardEditor({ moodboardId, baseImageUrl }: Props) {
  const router = useRouter();
  const [tool, setTool] = useState<MoodboardTool>("move");
  const [toast, setToast] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isBaseImageFailed, setIsBaseImageFailed] = useState(false);
  const exportRef = useRef<(() => string | null) | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);

  const moodboard = useMoodboard();
  const { replaceElements } = moodboard;

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    loadMoodboardDraft(moodboardId)
      .then((draft) => {
        if (!draft || draft.baseImageUrl !== baseImageUrl) return;
        replaceElements(draft.elements);
        showToast("저장된 드래프트를 불러왔어요.");
      })
      .catch(() => {
        showToast("드래프트를 불러오지 못했어요.");
      });
  }, [baseImageUrl, moodboardId, replaceElements, showToast]);

  useEffect(() => {
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      saveMoodboardDraft({
        moodboardId,
        baseImageUrl,
        elements: moodboard.elements,
        updatedAt: new Date().toISOString(),
      }).catch(() => {
        showToast("변경사항이 저장되지 않을 수 있어요.");
      });
    }, 500);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [baseImageUrl, moodboard.elements, moodboardId, showToast]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isSaving) return;
      event.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSaving]);

  const selectedTextElement = useMemo(
    () =>
      moodboard.selectedElement?.type === "text"
        ? moodboard.selectedElement
        : null,
    [moodboard.selectedElement],
  );

  const beginTextEdit = useCallback(() => {
    if (!selectedTextElement) return;
    setTool("text");
  }, [selectedTextElement]);

  const addText = useCallback(() => {
    moodboard.discardEmptyText();
    moodboard.addText();
    setTool("text");
  }, [moodboard]);

  const addSticker = useCallback(
    (assetId: StickerAssetId) => {
      moodboard.addSticker(assetId);
      setTool("move");
    },
    [moodboard],
  );

  const updateSelectedText = useCallback(
    (properties: Record<string, string | number>) => {
      if (!selectedTextElement) return;
      moodboard.updateElementProperties(
        selectedTextElement.id,
        properties as Partial<MoodboardElement["properties"]>,
        false,
      );
    },
    [moodboard, selectedTextElement],
  );

  const deleteSelected = useCallback(() => {
    if (!moodboard.selectedId) return;
    moodboard.removeElement(moodboard.selectedId);
  }, [moodboard]);

  const completeMoodboard = useCallback(async () => {
    moodboard.discardEmptyText();
    setIsSaving(true);

    try {
      const exportedImageDataUrl = exportRef.current?.() ?? undefined;
      await updateMoodboard(moodboardId, {
        baseImageUrl,
        elements: moodboard.elements.filter(
          (element) =>
            element.type !== "text" || element.properties.content.trim(),
        ),
        exportedImageDataUrl,
      });
      router.push(`/moodboard/${moodboardId}`);
    } catch (error) {
      console.error(error);
      showToast("저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }, [baseImageUrl, moodboard, moodboardId, router, showToast]);

  return (
    <main className="min-h-dvh bg-[#f6f7fb] text-foreground">
      <Toast message={toast} />
      <ConfirmLeaveDialog
        isOpen={isLeaveOpen}
        onCancel={() => setIsLeaveOpen(false)}
        onConfirm={() => router.push("/")}
      />

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-foreground/5 bg-[#f6f7fb]/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => setIsLeaveOpen(true)}
          className="rounded-xl border border-gray-300 bg-card px-3 py-2 text-sm font-bold"
        >
          뒤로
        </button>
        <h1 className="text-base font-black">편집</h1>
        <button
          type="button"
          disabled={isSaving || isBaseImageFailed}
          onClick={completeMoodboard}
          className="rounded-xl bg-surface-inverse px-3 py-2 text-sm font-black text-white disabled:opacity-45"
        >
          {isSaving ? "저장 중" : "완성하고 공유하기"}
        </button>
      </header>

      <div className="flex min-h-[calc(100dvh-220px)] items-center justify-center px-4 py-5">
        {isBaseImageFailed ? (
          <div className="w-full max-w-sm rounded-2xl bg-card p-5 text-center shadow-sm">
            <p className="text-lg font-black">이미지를 불러오지 못했어요.</p>
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
          <BoardCanvas
            baseImageUrl={baseImageUrl}
            elements={moodboard.elements}
            selectedId={moodboard.selectedId}
            tool={tool}
            penStyle={moodboard.penStyle}
            onAddPen={moodboard.addPen}
            onBaseImageError={() => setIsBaseImageFailed(true)}
            onBeginTextEdit={(id) => {
              moodboard.setSelectedId(id);
              setTool("text");
            }}
            onExportReady={(exportImage) => {
              exportRef.current = exportImage;
            }}
            onRemoveElement={moodboard.removeElement}
            onSelectElement={moodboard.setSelectedId}
            onUpdateElement={moodboard.updateElement}
          />
        )}
      </div>

      <div className="sticky bottom-0 z-30">
        <nav
          aria-label="무드보드 편집 도구"
          className="grid grid-cols-5 gap-2 border-t border-foreground/5 bg-[#f6f7fb] px-3 py-3"
        >
          {TOOL_ITEMS.map((item) => (
            <ToolButton
              key={item.id}
              item={item}
              isActive={tool === item.id}
              onClick={() => {
                if (item.id !== "text") moodboard.discardEmptyText();
                setTool(item.id);
              }}
            />
          ))}
        </nav>
        <ContextPanel
          tool={tool}
          selectedElement={moodboard.selectedElement}
          penStyle={moodboard.penStyle}
          canUndo={moodboard.canUndo}
          onAddSticker={addSticker}
          onAddText={addText}
          onBeginTextEdit={beginTextEdit}
          onDeleteSelected={deleteSelected}
          onPenStyleChange={(style) =>
            moodboard.setPenStyle((current) => ({ ...current, ...style }))
          }
          onUndo={moodboard.undo}
          onUpdateText={updateSelectedText}
        />
      </div>
    </main>
  );
}
