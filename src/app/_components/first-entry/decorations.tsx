// 첫진입 스플래시 장식 모티프 — 순수 표현용 SVG. 의미 없는 장식이므로 aria-hidden.
// 이모지·클립아트 대신 손으로 다듬은 벡터로 "친근하되 유치하지 않게"(PRODUCT.md)를 지킨다.

type MarkProps = {
  className?: string;
  style?: React.CSSProperties;
};

/**
 * 리본 보우 — 근검정 리본에 핑크 글로우 헤일로. "Vision" 위에 얹힌다.
 * 글로우는 브랜드의 "글로우 그라디언트" 언어를 장식 헤일로로 옮긴 것(슬롭 아님).
 */
export function BowMark({ className, style }: MarkProps) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ display: "inline-block", lineHeight: 0, ...style }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 112 84"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 핑크 소프트 글로우 */}
        <ellipse cx="56" cy="46" rx="52" ry="34" fill="url(#bow-glow)" />
        <g>
          {/* 왼쪽 루프 */}
          <path
            d="M52 42C40 26 24 20 14 26C4 32 4 54 15 62C25 69 42 60 52 46Z"
            fill="url(#bow-body)"
          />
          {/* 오른쪽 루프 */}
          <path
            d="M60 42C72 26 88 20 98 26C108 32 108 54 97 62C87 69 70 60 60 46Z"
            fill="url(#bow-body)"
          />
          {/* 리본 꼬리 */}
          <path
            d="M50 48C44 62 40 72 36 80L48 76C52 66 54 58 56 50Z"
            fill="url(#bow-body)"
          />
          <path
            d="M62 48C68 62 72 72 76 80L64 76C60 66 58 58 56 50Z"
            fill="url(#bow-body)"
          />
          {/* 매듭 */}
          <rect x="49" y="38" width="14" height="18" rx="5" fill="#0c0c10" />
          {/* 하이라이트(광택) */}
          <path
            d="M22 34C18 38 17 48 21 56"
            stroke="#4a4a55"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M90 34C94 38 95 48 91 56"
            stroke="#4a4a55"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
        </g>
        <defs>
          <radialGradient id="bow-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ff8fc4" stopOpacity="0.55" />
            <stop offset="0.6" stopColor="#ffb3d9" stopOpacity="0.22" />
            <stop offset="1" stopColor="#ffb3d9" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="bow-body" x1="14" y1="20" x2="98" y2="80">
            <stop offset="0" stopColor="#26262c" />
            <stop offset="1" stopColor="#0a0a0d" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

/**
 * 4-포인트 스파클(별) — 은색 광택. "Chugumi" 오른쪽에 큰 별 + 작은 별로 배치.
 */
export function SparkleMark({ className, style }: MarkProps) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ display: "inline-block", lineHeight: 0, ...style }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 96 108"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 큰 별 */}
        <path
          d="M60 8C63 30 66 33 88 36C66 39 63 42 60 64C57 42 54 39 32 36C54 33 57 30 60 8Z"
          fill="url(#sparkle-silver)"
          stroke="#c9c9d2"
          strokeWidth="0.75"
        />
        {/* 작은 별 */}
        <path
          d="M26 62C28 78 30 80 46 82C30 84 28 86 26 102C24 86 22 84 6 82C22 80 24 78 26 62Z"
          fill="url(#sparkle-silver)"
          stroke="#c9c9d2"
          strokeWidth="0.75"
        />
        <defs>
          <linearGradient id="sparkle-silver" x1="20" y1="8" x2="80" y2="100">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.45" stopColor="#e3e3ea" />
            <stop offset="0.75" stopColor="#b6b6c2" />
            <stop offset="1" stopColor="#8f8f9d" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}
