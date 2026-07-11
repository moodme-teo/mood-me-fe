"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { EditProgress } from "@/lib/mood-test/edit-progress-storage";

// 첫진입(저장 보드 0개) 화면에서 편집중 세션들을 여는 진입점. History 상태는 편집중 카드를
// 캐러셀에 직접 싣지만, 첫진입은 캐러셀이 없어 이 필 + 바텀시트로 대신한다.
//
// 필은 "이어서 만들기"(진행 중 테스트 드래프트)와 같은 모양을 20% 어둡게 한 것 — 편집중은
// 이어가기와 성격이 다른 별개 진입점이라 색으로 구분한다. 여러 개일 수 있어 눌러 시트로 편다.

type Props = {
  boards: EditProgress[];
};

function formatRelative(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;

  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
}

export default function EditingBoardsButton({ boards }: Props) {
  const [open, setOpen] = useState(false);

  if (boards.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-between rounded-[var(--radius-md)] bg-gray-200 px-4 py-3 font-semibold text-gray-900 ring-ring outline-none text-body-sm focus-visible:ring-2"
      >
        <span>편집 중</span>
        <span className="text-gray-600 text-caption">
          {boards.length}개 이어보기
        </span>
      </button>

      <DialogContent title="편집 중인 무드보드">
        <ul className="flex flex-col">
          {boards.map((board) => (
            <li
              key={board.sessionId}
              className="border-t border-gray-100 first:border-t-0"
            >
              <Link
                href={`/test/${board.sessionId}/edit`}
                className="flex items-center gap-3 py-3 ring-ring outline-none focus-visible:ring-2"
              >
                <span className="relative h-[68px] w-[52px] shrink-0 overflow-hidden rounded-md bg-surface-sunken">
                  {board.thumbnailUrl ? (
                    <Image
                      fill
                      unoptimized
                      src={board.thumbnailUrl}
                      alt=""
                      sizes="52px"
                      className="object-cover"
                    />
                  ) : null}
                </span>
                <span className="flex-1">
                  <span className="block font-bold text-body-sm">
                    무드보드 편집 이어가기
                  </span>
                  <span className="block text-gray-500 text-caption">
                    {formatRelative(board.updatedAt)}
                  </span>
                </span>
                <span aria-hidden className="text-lg font-bold text-[#2556d9]">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
