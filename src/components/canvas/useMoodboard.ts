"use client";

import { useCallback, useMemo, useState } from "react";

import { getStickerAsset } from "@/components/canvas/sticker-assets";
import type {
  MoodboardElement,
  PenElement,
  StickerAssetId,
  TextElement,
} from "@/components/canvas/types";
import { MOODBOARD_HEIGHT, MOODBOARD_WIDTH } from "@/components/canvas/types";

const MAX_UNDO_SNAPSHOTS = 30;

type PenStyle = {
  stroke: string;
  strokeWidth: number;
};

type TextStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nextZIndex(elements: MoodboardElement[]) {
  return (
    elements.reduce((max, element) => Math.max(max, element.z_index), 0) + 1
  );
}

function pushSnapshot(
  snapshots: MoodboardElement[][],
  elements: MoodboardElement[],
) {
  return [...snapshots, elements].slice(-MAX_UNDO_SNAPSHOTS);
}

export function useMoodboard(initialElements: MoodboardElement[] = []) {
  const [elements, setElements] = useState<MoodboardElement[]>(initialElements);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<MoodboardElement[][]>([]);
  const [penStyle, setPenStyle] = useState<PenStyle>({
    stroke: "#2b2b2b",
    strokeWidth: 5,
  });
  const [textStyle, setTextStyle] = useState<TextStyle>({
    fontFamily: "Arial",
    fontSize: 28,
    color: "#ffffff",
    align: "center",
  });

  const selectedElement = useMemo(
    () => elements.find((element) => element.id === selectedId) ?? null,
    [elements, selectedId],
  );

  const replaceElements = useCallback((nextElements: MoodboardElement[]) => {
    setElements(nextElements);
    setSelectedId((currentId) =>
      nextElements.some((element) => element.id === currentId)
        ? currentId
        : null,
    );
  }, []);

  const commitElements = useCallback(
    (
      updater:
        | MoodboardElement[]
        | ((current: MoodboardElement[]) => MoodboardElement[]),
      options: { selectId?: string | null; preserveSelection?: boolean } = {},
    ) => {
      setElements((current) => {
        const nextElements =
          typeof updater === "function" ? updater(current) : updater;
        setUndoStack((currentStack) => pushSnapshot(currentStack, current));
        return nextElements;
      });
      if ("selectId" in options) {
        setSelectedId(options.selectId ?? null);
      } else if (!options.preserveSelection) {
        setSelectedId(null);
      }
    },
    [],
  );

  const addSticker = useCallback(
    (assetId: StickerAssetId) => {
      const asset = getStickerAsset(assetId);
      const id = createId("sticker");
      const element: MoodboardElement = {
        id,
        type: "sticker",
        x: (MOODBOARD_WIDTH - asset.width) / 2,
        y: (MOODBOARD_HEIGHT - asset.height) / 2,
        rotation: -4,
        scaleX: 1,
        scaleY: 1,
        z_index: nextZIndex(elements),
        properties: {
          assetId,
          width: asset.width,
          height: asset.height,
        },
      };
      commitElements([...elements, element], { selectId: id });
      return id;
    },
    [commitElements, elements],
  );

  const addText = useCallback(() => {
    const id = createId("text");
    const element: TextElement = {
      id,
      type: "text",
      x: 58,
      y: MOODBOARD_HEIGHT / 2 - 36,
      rotation: -2,
      scaleX: 1,
      scaleY: 1,
      z_index: nextZIndex(elements),
      properties: {
        ...textStyle,
        content: "",
        width: 244,
      },
    };
    commitElements([...elements, element], { selectId: id });
    return id;
  }, [commitElements, elements, textStyle]);

  const addPen = useCallback(
    (points: number[]) => {
      if (points.length < 4) return null;
      const id = createId("pen");
      const element: PenElement = {
        id,
        type: "pen",
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        z_index: nextZIndex(elements),
        properties: {
          points,
          ...penStyle,
        },
      };
      commitElements([...elements, element], { selectId: id });
      return id;
    },
    [commitElements, elements, penStyle],
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<MoodboardElement>, pushHistory = true) => {
      const updater = (current: MoodboardElement[]) =>
        current.map((element) =>
          element.id === id
            ? ({ ...element, ...patch } as MoodboardElement)
            : element,
        );

      if (pushHistory) {
        commitElements(updater, { preserveSelection: true });
        return;
      }

      setElements(updater);
    },
    [commitElements],
  );

  const updateElementProperties = useCallback(
    (
      id: string,
      properties: Partial<MoodboardElement["properties"]>,
      pushHistory = true,
    ) => {
      const updater = (current: MoodboardElement[]) =>
        current.map((element) =>
          element.id === id
            ? ({
                ...element,
                properties: { ...element.properties, ...properties },
              } as MoodboardElement)
            : element,
        );

      if (pushHistory) {
        commitElements(updater, { preserveSelection: true });
        return;
      }

      setElements(updater);
    },
    [commitElements],
  );

  const removeElement = useCallback(
    (id: string) => {
      commitElements(
        (current) => current.filter((element) => element.id !== id),
        { selectId: null },
      );
    },
    [commitElements],
  );

  const discardEmptyText = useCallback(() => {
    const emptyText =
      selectedElement?.type === "text" &&
      !selectedElement.properties.content.trim();
    if (selectedElement && emptyText) {
      removeElement(selectedElement.id);
    }
  }, [removeElement, selectedElement]);

  const undo = useCallback(() => {
    setUndoStack((currentStack) => {
      const previous = currentStack.at(-1);
      if (!previous) return currentStack;
      setElements(previous);
      setSelectedId(null);
      return currentStack.slice(0, -1);
    });
  }, []);

  return {
    elements,
    selectedElement,
    selectedId,
    canUndo: undoStack.length > 0,
    penStyle,
    textStyle,
    addPen,
    addSticker,
    addText,
    discardEmptyText,
    removeElement,
    replaceElements,
    setPenStyle,
    setSelectedId,
    setTextStyle,
    undo,
    updateElement,
    updateElementProperties,
  };
}
