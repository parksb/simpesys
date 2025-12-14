# 시작하기

이 문서는 Simpesys를 이용해 첫 디지털 정원을 구축하는 방법을 설명한다.

## 요구사항

Simpesys는 [Deno](https://deno.com) 런타임 버전 2.0 이상을 필요로 한다. 패키지는 [JSR](https://jsr.io) (JavaScript Registry)을 통해 배포된다.

## 프로젝트 초기화

디지털 정원을 구축하기 위한 Deno 프로젝트를 구성하는 것으로 시작한다. 여기서 프로젝트의 이름을 예시로 `my-garden`을 사용한다. 다음 명령어를 실행하면 `my-garden` 디렉토리가 생성되고 Deno 프로젝트가 구성된다.

```sh
$ deno init my-garden
```

Simpesys 프로젝트는 `app` 디렉토리와 `docs` 디렉토리로 구성되어 있다. `app` 디렉토리는 애플리케이션 구현 코드를 담기 위해 필요하고, `docs` 디렉토리는 마크다운 문서를 담기 위해 필요하다.

```
my-graden/
├── deno.json
├── app/
│   └── main.ts
└── docs/
    ├── index.md
    └── 404.md
```

다음 명령어를 실행하면 `my-garden` 디렉토리로 이동해 `app` 디렉토리와 `docs` 디렉토리를 생성하고, 각 디렉토리 내에 빈 파일을 만든다.

```sh
$ cd my-garden
$ mkdir app docs
$ touch app/main.ts docs/index.md docs/404.md
```

문서를 보관하는 경로는 기본적으로 `docs` 디렉토리이지만, `config.project.docs` 옵션으로 설정할 수도 있다.

## 패키지 설치

`my-garden` 디렉토리 안에서 `deno add` 명령어로 프로젝트에 `@simpesys/core` 패키지를 추가한다.

```sh
$ deno add jsr:@simpesys/core
```

이 명령은 `deno.json`에 import 매핑을 추가한다.

```json
{
  "imports": {
    "@simpesys/core": "jsr:@simpesys/core"
  }
}
```

## 문서 작성

모든 마크다운 문서는 제목으로 시작해야 한다. 마크다운 문법상 레벨 1 헤딩(heading)이 문서 제목이 된다. 선호하는 편집기를 이용해 `docs` 디렉토리 안에 있는 `index.md` 문서를 다음과 같이 작성한다.

```markdown
# Index

## Subpages

- [[404]]
```

`Subpages` 섹션 아래에 리스트로 나열되는 문서는 해당 페이지의 하위 문서가 된다. Simpesys는 루트 문서로부터 출발해 링크를 통해 도달할 수 있는 문서만 빌드한다. 하위 문서를 담는 섹션의 제목은 `config.docs.subdocumentsSectionTitle` 옵션으로 설정할 수 있다.

이어서 `404.md` 문서를 다음과 같이 작성한다.

```markdown
# Not Found
```

## 애플리케이션 구현

`app` 디렉토리 안에 있는 `main.ts` 파일에 Simpesys를 초기화하고, 문서를 빌드하는 애플리케이션을 구현한다. 다음은 최소 사용 예시로, `index.md` 문서 정보를 콘솔에 출력한다.

```typescript
import { Simpesys } from "@simpesys/core";

const simpesys = await new Simpesys().init({ syncMetadata: true });

const document = simpesys.getDocument("index");
console.log(document);
```

`Simpesys` 생성자는 설정 객체를 받는다. `init()` 메서드는 모든 문서를 로드하고 빌드한다. `syncMetadata` 옵션을 `true`로 설정하면 빌드 과정에서 문서에 대한 메타데이터 파일을 생성하고, 업데이트한다.

## 실행

애플리케이션을 실행하려면 다음과 같은 Deno 권한이 필요하다.

| 권한 | 플래그 | 목적 |
|------|--------|------|
| Read | `--allow-read` 또는 `-R` | 마크다운 파일 및 메타데이터 읽기 |
| Write | `--allow-write` 또는 `-W` | 메타데이터 파일 쓰기 (`syncMetadata` 활성화 시) |
| Environment | `--allow-env` 또는 `-E` | 환경 변수 접근 |

다음 명령으로 애플리케이션을 실행하면 콘솔에서 `index.md` 문서에 대한 정보를 콘솔에서 확인할 수 있다.

```sh
$ deno run -R -W -E app/main.ts
```

앞서 `syncMetadata` 옵션을 `true`로 설정했다면 애플리케이션 실행 직후 `simpesys.metadata.json` 파일이 생성된다.

## 웹 프레임워크 통합

Simpesys로 빌드한 문서 트리를 웹사이트로 서빙하는 가장 쉬운 방법은 웹 프레임워크를 사용하는 것이다. Simpesys는 마크다운 문서를 HTML로 변환해 제공한다. 다음은 [Hono](https://hono.dev/)를 사용해 작성한 `app.ts` 파일의 예시다.

```typescript
import { Simpesys } from "@simpesys/core";
import { Hono } from "@hono/hono";

const simpesys = await new Simpesys()
  .init({ syncMetadata: Deno.env.get("ENV") !== "production" });

const app = new Hono();

function documentResponse(id: string, c: Context) {
  let document = simpesys.getDocument(id);

  if (!document) {
    c.status(404);
    document = simpesys.getDocument("404")!;
  }

  return c.html(document.html);
}

app.get("/:id", (c) => {
  const id = c.req.param("id");
  return documentResponse(id, c);
});

app.get("/", (c) => {
  return documentResponse("index", c);
});

Deno.serve(app.fetch);
```

다음 명령을 통해 위 애플리케이션을 실행하면 로컬 환경에서 서버를 실행할 수 있다.

```sh
$ deno run -R -W -E -N app/main.ts
Listening on http://0.0.0.0:8000/ (http://localhost:8000/)
```
