# 캐시

Simpesys는 이전에 생성한 문서의 HTML을 재사용하는 증분 렌더링을 지원한다. 캐시를 사용하면 내용과 설정이 같은 문서에 대한 렌더링 과정을 생략함으로써 빌드 성능을 개선할 수 있다. 캐시는 기본적으로 비활성화되어 있다. `init({ cache: true })`을 호출하면 캐시를 활성화할 수 있다.

같은 프로세스 내에서 두 개 이상의 Simpesys 인스턴스 사이에 캐시를 공유하기 위해서는 이전 인스턴스의 캐시를 전달하면 된다.

```typescript
import { Simpesys } from "@simpesys/core";

const first = await new Simpesys().init({ cache: true });

const second = await new Simpesys().init({
  cache: {
    previous: first.getCache(),
  },
});
```

위 예시는 첫 번째 인스턴스의 캐시를 `getCache()`로 얻어 두 번째 인스턴스의 `cache.previous`에 전달한다.

| 옵션 | 타입 | 설명 |
|------|------|------|
| `cache.version` | `string` | 캐시를 구분하는 버전. |
| `cache.previous` | `Cache` | 재사용할 캐시. |

`renderInternalLink`, `configureMarkdownConverter` 등 렌더링 훅을 직접 지정한 경우에는 이전 캐시를 재사용할 때 `cache.version` 값을 명시적으로 지정해야 한다. 훅의 구현을 변경하면 버전을 갱신한다.

```typescript
await new Simpesys(config).init({
  cache: { previous, version: "v2" },
});
```

프로세스를 재시작하면 인메모리 캐시는 사라진다. 애플리케이션에서 캐시를 파일시스템에 저장해두면 다른 프로세스의 인스턴스에서 재사용할 수 있다.

```typescript
import { type Cache, Simpesys } from "@simpesys/core";

const cacheDirectory = ".simpesys";
const cachePath = `${cacheDirectory}/cache.json`;

let previous: Cache | undefined;

try {
  previous = JSON.parse(await Deno.readTextFile(cachePath));
} catch (error) {
  if (!(error instanceof Deno.errors.NotFound || error instanceof SyntaxError)) {
    throw error;
  }
}

const simpesys = await new Simpesys().init({
  cache: { previous },
});

const next = simpesys.getCache();

if (next) {
  await Deno.mkdir(cacheDirectory, { recursive: true });
  await Deno.writeTextFile(cachePath, JSON.stringify(next));
}
```
