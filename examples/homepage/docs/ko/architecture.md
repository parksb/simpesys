# 아키텍처

이 문서는 Simpesys의 핵심 데이터 구조와 빌드 파이프라인을 포함한 내부 아키텍처를 설명한다.

Simpesys는 다단계 파이프라인을 통해 마크다운 문서를 처리한다. 시스템은 문서 키를 처리된 문서 객체에 매핑하는 문서 딕셔너리를 관리한다. 초기화 과정에서는 루트 문서에서 시작하는 너비 우선 탐색을 통해 문서를 탐색한다.

## 핵심 컴포넌트

### Simpesys

`Simpesys` 클래스는 메인 진입점이다. 문서 로딩, 처리를 관리하고 처리된 문서 딕셔너리에 대한 접근을 제공한다.

```typescript
class Simpesys {
  constructor({ config, hooks }: DeepPartial<Context>);
  init(options?: { syncMetadata?: boolean }): Promise<Simpesys>;
  getDocuments(): DocumentDict;
  getDocument(key: string): Document | undefined;
  getConfig(): Config;
}
```

생성자는 부분 설정을 받는다. 지정되지 않은 옵션은 기본값을 사용한다. 문서에 접근하기 전에 `init()` 메서드를 호출해야 한다.

### Context

`Context` 타입은 설정과 훅을 내부 함수에 전달되는 단일 객체로 결합한다.

```typescript
type Context = {
  config: Config;
  hooks: Hooks;
};
```

사용 가능한 옵션에 대한 자세한 내용은 [[configuration]] 문서를 참고한다.

### Document

`Document` 인터페이스는 빌드된 문서에 대한 정보를 표현한다.

| 속성 | 타입 | 설명 |
|------|------|------|
| `title` | `string` | 첫 레벨 1 제목에서 추출한 문서 제목 |
| `filename` | `string` | 문서 키 (확장자 없는 파일명) |
| `markdown` | `string` | 마크다운 문서 내용 |
| `html` | `string` | 마크다운으로부터 변환된 HTML |
| `breadcrumbs` | `Breadcrumb[]` | 루트에서부터의 경로 |
| `children` | `Document[]` | 하위 문서 |
| `parent` | `Document` | 상위 문서 |
| `referred` | `Reference[]` | 이 문서에 참조하는 문서 |
| `type` | `"subject"` \| `"publication"` | 문서 분류 |
| `createdAt` | `Temporal.Instant` | 생성 타임스탬프 |
| `updatedAt` | `Temporal.Instant` | 마지막 수정 타임스탬프 |

### DocumentDict

`DocumentDict` 타입은 문서 키를 `Document` 객체에 매핑하는 레코드다:

```typescript
type DocumentDict = Record<string, Document>;
```

문서 키는 루트 문서로부터의 상대 경로에서 `.md` 확장자를 뺀 유일한 식별자다. 예를 들어, `features/internal-links.md` 문서의 키는 `features/internal-links`다.

### Reference

`Reference` 인터페이스는 백링크 관계를 표현한다.

```typescript
interface Reference {
  document: Document; // 링크를 포함하는 문서
  sentences: string[]; // 링크를 언급하는 문장
}
```

## 빌드 파이프라인

초기화는 다음과 같은 단계로 진행된다.

```mermaid
flowchart LR
    A[마크다운 문서] --> B[문서 탐색]
    B --> C{syncMetadata}
    C -->|true| D[메타데이터 동기화]
    C -->|false| E[링크 해석]
    D --> E
    E --> F[HTML 렌더링]
    F --> G[문서 딕셔너리]
```

### 문서 탐색

루트 문서에서 시작하여 너비 우선 탐색으로 모든 문서를 탐색하며 각 문서를 아래와 같이 처리한다.

1. 파일 시스템에서 마크다운 파일을 읽는다.
2. `manipulateMarkdown` 훅이 정의되어 있다면 실행해 마크다운을 수정한다.
3. 첫 번째 레벨 1 제목에서 문서 제목을 추출한다.
4. 메타데이터 타임스탬프를 로드하거나 생성한다.
5. 딕셔너리에 문서를 추가한다.
6. 하위 문서 섹션에 나열된 하위 문서를 처리 대기열에 추가한다.

### 링크 해석

모든 문서를 탐색했다면 내부 링크를 처리한다.

1. 각 문서의 내부 링크를 해석하고 레이블을 명시한다.
2. 링크를 문서 딕셔너리와 매칭한다.
3. 해석하지 못한 링크는 있는 경우, `onInternalLinkUnresolved` 훅이 정의되어 있다면 실행해 에러를 처리한다.
4. 유효한 각 링크에 대해 대상 문서에 백링크 참조를 추가한다.

### HTML 변환

마지막으로 각 문서를 HTML로 변환한다.

1. 백링크를 섹션에 추가한다.
2. 제목 앞에 목차를 삽입한다.
3. 마크다운을 HTML로 변환한다.
4. `renderInternalLink` 훅을 통해 내부 링크 문법을 HTML 앵커 태그로 교체한다.

## 문서 유형

문서는 두 가지 유형으로 나뉜다.

| 유형 | 설명 |
|------|------|
| `subject` | 주제 문서 |
| `publication` | 문헌 문서 |

유형은 하위 문서 섹션에서 문서가 표시되는 방식에 영향을 미치며, 커스텀 렌더링 로직에서 커스텀할 수 있다. 기본적으로 레벨 3 `Publications` 제목 하위에 언급된 문서는 문헌 문서로 분류한다. 문헌 섹션의 제목은 `config.docs.publicationsSectionTitle` 옵션으로 설정할 수 있다.
