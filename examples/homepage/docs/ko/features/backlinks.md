# 백링크

백링크는 현재 문서를 참조하는 문서들을 자동으로 추적해 링크를 만드는 역참조 기능이다. 이 문서는 백링크를 계산하고, 표시하는 방법을 설명한다. 문서 A가 문서 B에 대한 내부 링크를 포함하면, Simpesys는 자동으로 문서 B에 백링크 항목으로 문서 A를 추가한다. 이 양방향 관계는 참조된 문서에서 참조하는 소스로의 탐색을 가능하게 한다.

## 백링크 계산

백링크는 초기화 과정의 링크 해석 단계에서 계산된다.

1. 각 문서에서 마크다운 콘텐츠로부터 내부 링크를 추출한다.
2. 문서 딕셔너리에서 각 링크 대상을 식별한다.
3. 현재 문서를 참조한 문서와 현재 문서를 인용한 문장을 포함하는 `Reference` 객체를 생성한다.
4. 대상 문서의 `referred` 리스트에 참조를 추가한다.

## 백링크 섹션

백링크는 각 문서의 마크다운 콘텐츠 끝에 전용 섹션으로 추가된다. 섹션 제목은 `config.docs.backlinksSectionTitle` 옵션으로 설정할 수 있다. 기본값은 "Backlinks"이다.

```typescript
const simpesys = new Simpesys({
  config: {
    docs: {
      backlinksSectionTitle: "이 문서를 인용한 문서"
    },
  },
});
```

## 프로그래밍 방식으로 백링크 접근

`Document` 객체는 모든 백링크 참조가 있는 `referred` 리스트를 포함한다.

```typescript
const doc = simpesys.getDocument("api");

for (const ref of doc.referred) {
  console.log(`참조한 문서: ${ref.document.title}`);
  console.log(`문장: ${ref.sentences.join(", ")}`);
}
```
