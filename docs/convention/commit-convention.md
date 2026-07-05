# 커밋 컨벤션

이 저장소의 모든 커밋 메시지는 아래 규칙을 따릅니다.
규칙은 **Husky `commit-msg` 훅으로 자동 검사**되며, 형식에 맞지 않으면 커밋이 거부됩니다.

## 형식

```
<prefix> : <메시지>
```

- prefix 뒤에는 **공백 + 콜론 + 공백**(` : `)이 반드시 있어야 합니다.
- 메시지는 비워둘 수 없습니다.

예시:

```
feat : 무드보드 공유 버튼 추가
fix : 이미지 생성 시 프롬프트 누락 수정
docs : 커밋 컨벤션 문서 추가
```

## prefix 목록

| prefix     | 설명                                             |
| ---------- | ------------------------------------------------ |
| `feat`     | 새로운 기능 추가                                 |
| `fix`      | 버그 및 기타 수정                                |
| `refactor` | 코드 리팩토링                                    |
| `rename`   | 네이밍 수정, 파일 이동, 오타 수정                |
| `remove`   | 파일 삭제                                        |
| `style`    | css style 관련 변경                              |
| `chore`    | 빌드 부분 혹은 패키지 매니저, config 수정, 모듈 추가 |
| `docs`     | 문서 작성                                         |
| `hotfix`   | 긴급 작업                                         |
| `test`     | 테스트 코드 관련                                 |
| `perf`     | 퍼포먼스 효율 개선 관련                          |

## 강제 방식

- **도구**: [Husky](https://typicode.github.io/husky/) `commit-msg` 훅 — `.husky/commit-msg`
- **설치**: 별도 명령 없이 `npm install` 시 `prepare` 스크립트가 자동으로 훅을 활성화합니다.
- **검사 규칙**: 위 prefix 목록 + ` : ` 형식을 정규식으로 확인합니다.
- **예외**: `Merge ...`, `Revert ...`로 시작하는 자동 생성 커밋은 검사에서 제외됩니다.

훅이 동작하지 않는다면 (예: 저장소를 처음 clone한 직후) 아래를 실행하세요.

```bash
npm install   # prepare 스크립트가 husky를 초기화
```

> prefix 목록을 수정할 때는 이 문서, `README.md`의 "커밋 prefix" 섹션, `.husky/commit-msg`의 `pattern` 세 곳을 함께 맞춰주세요.
