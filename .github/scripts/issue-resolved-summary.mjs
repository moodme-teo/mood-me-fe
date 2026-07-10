// 닫힌 이슈 하나를 Discord 메시지(JSON)로 바꾼다.
//
// stdin  : gh api graphql 이 뱉은 issue 객체 (discord-issue-resolved-notify.yml 참고)
// stdout : Discord 웹훅 페이로드
//
// 이슈 본문의 `## 📋 개요` 를 300자로 잘라 보여준다. 표·목록·코드블록은 한 줄로 펴면
// 읽을 수 없으므로 버리고 산문 단락만 남긴다. `개요` 가 없는 이슈는 `문제` 를, 그것도
// 없으면 첫 단락을 쓴다.

const OVERVIEW_LIMIT = 300;

/** 마크다운 장식을 걷어내고 한 줄로 만든다. */
function toPlainText(markdown) {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // 이미지
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // 링크 → 텍스트
    .replace(/`([^`]*)`/g, "$1") // 인라인 코드
    .replace(/\*\*([^*]+)\*\*/g, "$1") // 굵게
    .replace(/(?<![*\w])\*([^*]+)\*/g, "$1") // 기울임
    .replace(/^\s*>\s?/gm, "") // 인용
    .replace(/\s+/g, " ")
    .trim();
}

/** 문장 경계를 지켜 자른다. 못 지키면 어절 경계, 그것도 아니면 그냥 자른다. */
function truncate(text, limit) {
  const chars = [...text];
  if (chars.length <= limit) return text;

  const head = chars.slice(0, limit).join("");
  const sentenceEnd = Math.max(head.lastIndexOf("다."), head.lastIndexOf(". "));
  if (sentenceEnd > limit * 0.5) return head.slice(0, sentenceEnd + 1);

  const wordEnd = head.lastIndexOf(" ");
  return `${(wordEnd > limit * 0.5 ? head.slice(0, wordEnd) : head).trimEnd()}…`;
}

/** `## 헤딩` 기준으로 본문을 쪼갠다. 코드블록은 통째로 버린다. */
function toSections(body) {
  const withoutCode = body.replace(/```[\s\S]*?```/g, "");
  const sections = [];
  let current = { heading: "", lines: [] };

  for (const line of withoutCode.split("\n")) {
    const heading = line.match(/^#{2,4}\s+(.*)$/);
    if (heading) {
      sections.push(current);
      current = { heading: toPlainText(heading[1]), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);
  return sections.filter((s) => s.heading || s.lines.some((l) => l.trim()));
}

/** 산문 단락만 남긴다 — 표·목록·말머리("…재현 경로:")는 한 줄로 펴면 읽을 수 없다. */
function toParagraphs(section) {
  return section.lines
    .join("\n")
    .split(/\n\s*\n/)
    .map(toPlainText)
    .filter(
      (p) => [...p].length > 10 && !/^[-|*\d]/.test(p) && !/[:：]$/.test(p),
    );
}

const findSection = (sections, pattern) =>
  sections.find((s) => pattern.test(s.heading));

/** 개요 섹션의 산문을 이어붙여 300자로 자른다. */
function extractOverview(body) {
  const sections = toSections(body);
  const overview =
    findSection(sections, /개요/) ??
    findSection(sections, /문제/) ??
    sections[0];
  if (!overview) return "";

  return truncate(toParagraphs(overview).join(" "), OVERVIEW_LIMIT);
}

/** 이슈를 닫은 PR. 없으면 왜 없는지를 대신 말한다. */
function extractClosedBy(issue) {
  const pr = issue.closedByPullRequestsReferences?.nodes?.[0];
  if (pr) return `#${pr.number} ${toPlainText(pr.title)}`;
  if (issue.stateReason === "NOT_PLANNED")
    return "계획 없음으로 종료 (PR 없음)";
  return "PR 없이 종료";
}

const issue = JSON.parse(await new Response(process.stdin).text());
const overview = extractOverview(issue.body ?? "");

process.stdout.write(
  JSON.stringify({
    content: `[✅ **이슈 해결**] 하위 #${issue.parent.number}`,
    embeds: [
      {
        title: `#${issue.number} ${issue.title}`,
        url: issue.url,
        description: [overview, `**닫은 PR** · ${extractClosedBy(issue)}`]
          .filter(Boolean)
          .join("\n\n"),
        color: 3066993,
      },
    ],
  }),
);
