# 내부 링크

이 문서는 Simpesys의 링크 문법과 경로 해석 규칙, 렌더링 동작을 설명한다. 내부 링크는 디지털 정원 내의 문서를 연결하는 핵심 요소다.

## 링크 스타일

Simpesys는 `config.docs.linkStyle` 옵션을 통해 링크 문법 스타일을 지원한다.

### Simpesys 스타일

| 문법 | 설명 |
|------|------|
| `[[key]]` | 레이블 없는 링크 |
| `[[key]]{label}` | 레이블이 있는 링크 |

예시는 다음과 같다.

```markdown
자세한 내용은 [[getting-started]]를 참고한다.
[[api]]{API 레퍼런스}에서 상세 정보를 확인한다.
```

### Obsidian 스타일

| 문법 | 설명 |
|------|------|
| `[[key]]` | 레이블 없는 링크 |
| `[[key\|label]]` | 레이블이 있는 링크 |

예시는 다음과 같다.

```markdown
자세한 내용은 [[getting-started]]를 참고한다.
[[api|API 레퍼런스]]에서 상세 정보를 확인한다.
```

## 문서 키

문서의 키는 루트 문서로부터의 유일한 상대 경로로 결정되는 문서의 식별자다.

| 파일 경로 | 문서 키 |
|-----------|---------|
| `docs/index.md` | `index` |
| `docs/page.md` | `page` |
| `docs/dir/page.md` | `dir/page` |

## 경로 해석

내부 링크는 현재 문서 기준 상대 경로로 지정할 수 있다.

```markdown
[[page1]]     → page1.md
[[dir/page2]] → dir/page2.md
```

`./` 접두사는 현재 문서가 포함된 디렉토리를 명시적으로 참조한다.

```markdown
<!-- dir/page1.md -->
[[./page2]]        → dir/page2.md
[[./subdir/page3]] → dir/subdir/page3.md
```

`../` 접두사는 상위 디렉토리로 이동한다.

```markdown
<!-- dir/page1.md -->
[[../index]]     → index.md
[[../dir/page2]] → dir/page2.md
```

루트 디렉토리 위로의 탐색은 정규화된다.

```markdown
<!-- index.md -->
[[../page]] → page.md (루트 위로 갈 수 없음)
```

## 링크 해석

초기화 중에 Simpesys는 모든 내부 링크를 해석한다.

1. 각 문서의 마크다운 콘텐츠에서 링크를 추출한다.
2. 경로 해석 규칙을 사용하여 각 링크의 키를 해석한다.
3. 문서 딕셔너리와 키를 매칭한다.
4. 매칭되면 링크에 대상 문서의 제목으로 레이블을 지정한다. (커스텀 레이블이 없는 경우)
5. 매칭되지 않으면 `onInternalLinkUnresolved` 훅을 호출한다.

링크된 문서가 존재하지 않는 등의 이유로 링크를 해석할 수 없는 경우 다음과 같이 처리한다.

- `onInternalLinkUnresolved` 훅이 에러 객체를 받는다.
- 링크가 Not found 문서에 대한 참조로 교체된다. (`config.docs.notFound`를 통해 설정 가능)
- 커스텀 레이블이 제공된 경우 보존된다.
- `private/` 경로에 대한 링크의 경우 키가 별표로 마스킹된다.

## HTML 렌더링

내부 링크는 `renderInternalLink` 훅을 사용하여 HTML 앵커 태그로 변환된다. 기본 구현은 다음과 같다.

```typescript
renderInternalLink: (key, label) => `<a href="/${key}">${label ?? key}</a>`
```

커스텀 렌더링으로 URL 구조를 수정하거나, CSS 클래스를 추가하는 등 다른 변환을 구현할 수 있다.

```typescript
renderInternalLink: (key, label) => {
  return `<a href="/docs/${key}.html" class="link">${label ?? key}</a>`;
}
```
