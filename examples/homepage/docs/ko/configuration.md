# 설정

이 문서는 Simpesys에서 사용 가능한 모든 설정 옵션을 설명한다. Simpesys 설정은 `config`와 `hooks` 두 개의 최상위 속성을 가진 객체로 생성자에 전달된다. 모든 속성은 선택사항이며, 기본값이 있다.

```typescript
const simpesys = new Simpesys({
  config: { /* ... */ },
  hooks: { /* ... */ },
});
```

## Config

### `config.web`

웹 관련 설정.

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `domain` | `string` | `"localhost:8000"` | 웹사이트 도메인. 내부 도메인을 식별하는 데 사용된다. |

### `config.project`

프로젝트 구조 설정.

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `root` | `string` | `"./"` | 프로젝트 루트 디렉터리의 절대 또는 상대 경로. |
| `docs` | `string` | `"docs"` | 프로젝트 루트 기준 문서 디렉터리 상대 경로. |

### `config.docs`

문서 처리 설정.

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `root` | `string` | `"index"` | 루트 문서 키. 기본적으로 `index.md`에 해당한다. |
| `notFound` | `string` | `"404"` | Not found 문서의 키. 내부 링크를 해석할 수 없을 때 사용된다. |
| `linkStyle` | `"simpesys"` \| `"obsidian"` | `"simpesys"` | 내부 링크 문법 스타일. [[features/internal-links]] 참고. |
| `subdocumentsSectionTitle` | `string[]` | `"Subpages"` | 하위 문서 섹션을 표시하는 레벨 2 제목. |
| `publicationsSectionTitle` | `string[]` | `"Publications"` | 하위 문서 내에서 출판물 유형 문서를 표시하는 레벨 3 제목. |
| `backlinksSectionTitle` | `string` | `"Backlinks"` | 자동 생성되는 백링크 섹션의 레벨 2 제목. |

### `config.docs.toc`

목차 설정.

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `listType` | `"ul"` \| `"ol"` | `"ul"` | 목차의 HTML 리스트 유형. |
| `levels` | `number[]` | `[2, 3, 4]` | 목차에 포함할 제목 레벨. |

## Hooks

훅은 빌드 파이프라인의 동작을 커스터마이징하기 위한 콜백 함수다.

| 훅 | 시그니처 | 설명 |
|----|----------|------|
| `manipulateMarkdown` | `(markdown: string, candidate: DocumentCandidate) => string` | 처리 전 마크다운 콘텐츠를 변환한다. |
| `onInternalLinkUnresolved` | `(error: Error) => void` | 내부 링크를 해석할 수 없을 때 실행한다. |
| `renderInternalLink` | `(key: string, label?: string) => string` | 내부 링크를 HTML로 렌더링한다. |
