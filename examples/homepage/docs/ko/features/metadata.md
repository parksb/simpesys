# 메타데이터

Simpesys는 문서의 생성 및 수정 타임스탬프를 별도의 메타데이터 파일로 추적한다. 이 문서는 메타데이터 시스템과 저장 형식, 동기화 동작을 설명한다. 각 문서에는 다음과 같은 메타데이터가 있다.

- `createdAt`: 문서가 처음 생성된 타임스탬프.
- `updatedAt`: 문서가 마지막으로 수정된 타임스탬프.
- `contentHash`: 문서 내용의 해시값.
- `previousContentHash`: 이전 버전의 `contentHash` 값.
- `previousUpdatedAt`: 이전 버전의 `updatedAt` 값.

메타데이터는 프로젝트 루트의 JSON 파일에 저장되고, 초기화 과정에서 파일 시스템 타임스탬프와 동기화된다.

## 저장 형식

메타데이터는 프로젝트 루트의 `simpesys.metadata.json`에 저장된다.

```json
{
  "index": {
    "createdAt": "2025-12-12T15:55:29.107Z",
    "updatedAt": "2025-12-14T15:57:00.944Z",
    "contentHash": "978b4fbf6093e61d540f2af4674155e1ce49f18e",
    "previousContentHash": "60cccf1c4f26c6539b970eb4bba758b3c58fa708",
    "previousUpdatedAt": "2025-12-14T15:54:42.366Z"
  },
  "page1": {
    "createdAt": "2025-01-16T09:00:00Z",
    "updatedAt": "2025-01-16T09:00:00Z",
    "contentHash": "fba929d171cdf4487ee7e2637e9b89dc7e8eae9c"
  },
  "dir/page2": {
    "createdAt": "2025-12-13T12:03:38.423Z",
    "updatedAt": "2025-12-14T15:57:14.14Z",
    "contentHash": "87d94a15a7bed82faa73eaa3d6ce244cd9d64156",
    "previousContentHash": "7004ce48e8796e4fed235d7519bf54d291552dd1",
    "previousUpdatedAt": "2025-12-14T15:54:35.88Z"
  }
}
```

JSON 객체의 키는 문서 키에 해당한다. 타임스탬프는 ISO 8601 문자열로 저장된다.

## 타임스탬프 해석

초기화 중에 Simpesys는 여러 소스에서 타임스탬프를 해석한다.

### 우선순위

1. 기존 메타데이터 파일: 문서가 이미 메타데이터 파일에 있으면 해당 타임스탬프를 사용한다.
2. 파일 시스템 타임스탬프: 실제 문서 파일의 생성 시각과 수정 시각을 읽는다.

### 동기화 로직

기존 메타데이터가 없으면 파일 시스템 타임스탬프를 사용하고, 있으면 `contentHash`를 비교해 내용의 변경 여부를 판단한다. 내용이 변경되면 `updatedAt`을 현재 시각으로 업데이트하고 이전 값을 보존한다. 이 접근 방식은 다음을 보장한다.

- 생성 타임스탬프가 배포 환경 간에 안정적으로 유지된다.
- 수정 타임스탬프가 실제 파일 변경을 반영한다.
- 수동 메타데이터 편집이 존중된다.
- 마크다운 문서 파일을 Simpesys 명세와 분리한다.

## 메타데이터 동기화

메타데이터를 동기화하려면 파일시스템 접근이 필요하므로, 기본적으로 메타데이터 동기화는 비활성화되어있다. 문서의 메타데이터를 추적해야 한다면 `init()` 메서드에 `syncMetadata: true` 옵션을 전달해 동기화를 활성화해야 한다.

```typescript
await new Simpesys(/* ... */).init({ syncMetadata: true });
```

## 비공개 문서 제외

`private/`로 시작하는 키를 가진 문서는 메타데이터 동기화에서 제외한다. 이는 비공개 문서 경로가 공개 메타데이터 파일에 나타나는 것을 방지한다. 현재 비공개 문서에 대한 메타데이터를 추적하는 기능은 제공하지 않는다.
