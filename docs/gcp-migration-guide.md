# GCP 프로젝트 마이그레이션 가이드

**목표**: `mealio-483914` + `play-store-api` → `zzooapp` 완전 통합, `zzooapp-infra` 독립 repo로 분리

**전략**:
1. `zzooapp-infra` repo 생성 (GCP 인프라 전용)
2. 새 프로젝트에 인프라 배포
3. CI/CD 전환
4. 앱 네이티브 빌드 + 스토어 배포
5. 기존 정리

---

## zzooapp-infra 설계

### 역할 분리

| 관리 주체 | 대상 |
|-----------|------|
| **zzooapp-infra (Pulumi)** | Cloud Run, Artifact Registry, IAM/WIF, (향후) Cloud SQL |
| **각 서비스 repo CI** | Docker 이미지 빌드 + `gcloud run deploy` |
| **대시보드 (수동)** | Cloudflare, Neon, Vercel, EAS, Sentry, PostHog |

### repo 구조

```
zzooapp-infra/
├── Pulumi.yaml
├── package.json
├── index.ts                  # 엔트리포인트
├── shared/
│   ├── config.ts             # gcpProject, gcpRegion
│   ├── iam.ts                # WIF pool + provider + 공용 서비스 계정
│   └── registry.ts           # Artifact Registry (공용 1개)
└── services/
    ├── types.ts              # ServiceConfig 타입 정의
    ├── cloud-run.ts          # createService() 팩토리 함수
    ├── mealio.ts             # mealio 서비스 정의
    ├── app-b.ts              # 서비스 B
    └── ...                   # 새 서비스 추가 시 파일 1개 추가
```

### 핵심 코드

**`shared/config.ts`**:
```typescript
import * as pulumi from "@pulumi/pulumi";

const gcpConfig = new pulumi.Config("gcp");

export const gcpProject = gcpConfig.require("project");  // zzooapp
export const gcpRegion = gcpConfig.require("region");     // us-east4
```

**`shared/iam.ts`**:
```typescript
import * as gcp from "@pulumi/gcp";
import { gcpProject } from "./config";

export function createIam() {
  const wifPool = new gcp.iam.WorkloadIdentityPool("github-wif-pool", {
    project: gcpProject,
    workloadIdentityPoolId: "github",
    displayName: "GitHub Actions",
  }, { protect: true });

  const wifProvider = new gcp.iam.WorkloadIdentityPoolProvider("github-wif-provider", {
    project: gcpProject,
    workloadIdentityPoolId: wifPool.workloadIdentityPoolId,
    workloadIdentityPoolProviderId: "github",
    displayName: "GitHub",
    attributeMapping: {
      "google.subject": "assertion.sub",
      "attribute.actor": "assertion.actor",
      "attribute.repository": "assertion.repository",
      "attribute.repository_owner": "assertion.repository_owner",
    },
    // 모든 zzoohub repo 허용
    attributeCondition: 'assertion.repository_owner == "zzoohub"',
    oidc: { issuerUri: "https://token.actions.githubusercontent.com" },
  }, { protect: true });

  const serviceAccount = new gcp.serviceaccount.Account("deploy-sa", {
    project: gcpProject,
    accountId: "github-actions",
    displayName: "GitHub Actions",
  }, { protect: true });

  return { wifPool, wifProvider, serviceAccount };
}
```

**`shared/registry.ts`**:
```typescript
import * as gcp from "@pulumi/gcp";
import { gcpProject, gcpRegion } from "./config";

export function createRegistry() {
  return new gcp.artifactregistry.Repository("services-repo", {
    project: gcpProject,
    location: gcpRegion,
    repositoryId: "services",
    format: "DOCKER",
    description: "Container images for zzooapp services",
  }, { protect: true });
}
```

**`services/types.ts`**:
```typescript
import * as pulumi from "@pulumi/pulumi";

export interface ServiceConfig {
  name: string;                                          // Cloud Run 서비스 이름
  envs?: { name: string; value: string | pulumi.Output<string> }[];
  cpu?: string;                                          // default: "1"
  memory?: string;                                       // default: "512Mi"
  maxInstances?: number;                                 // default: 3
  concurrency?: number;                                  // default: 80
  healthCheckPath?: string;                              // default: "/health"
  public?: boolean;                                      // default: true (allUsers invoker)
}
```

**`services/cloud-run.ts`**:
```typescript
import * as gcp from "@pulumi/gcp";
import { gcpProject, gcpRegion } from "../shared/config";
import { ServiceConfig } from "./types";

export function createService(config: ServiceConfig) {
  const {
    name,
    envs = [],
    cpu = "1",
    memory = "512Mi",
    maxInstances = 3,
    concurrency = 80,
    healthCheckPath = "/health",
    public: isPublic = true,
  } = config;

  const image = `${gcpRegion}-docker.pkg.dev/${gcpProject}/services/${name}:latest`;

  const service = new gcp.cloudrunv2.Service(name, {
    project: gcpProject,
    location: gcpRegion,
    name,
    ingress: "INGRESS_TRAFFIC_ALL",
    scaling: { minInstanceCount: 0 },
    template: {
      scaling: { minInstanceCount: 0, maxInstanceCount: maxInstances },
      containers: [{
        image,
        ports: { containerPort: 8080 },
        resources: { limits: { cpu, memory }, startupCpuBoost: true },
        envs,
        startupProbe: {
          httpGet: { path: healthCheckPath, port: 8080 },
          initialDelaySeconds: 0,
          periodSeconds: 4,
          failureThreshold: 5,
        },
        livenessProbe: {
          httpGet: { path: healthCheckPath, port: 8080 },
          periodSeconds: 15,
        },
      }],
      maxInstanceRequestConcurrency: concurrency,
      timeout: "30s",
    },
  }, {
    protect: true,
    ignoreChanges: ["template.containers[0].image"],
  });

  if (isPublic) {
    new gcp.cloudrunv2.ServiceIamMember(`${name}-public`, {
      project: gcpProject,
      location: gcpRegion,
      name: service.name,
      role: "roles/run.invoker",
      member: "allUsers",
    });
  }

  return service;
}
```

**`services/mealio.ts`** — 서비스별 정의:
```typescript
import * as pulumi from "@pulumi/pulumi";
import { createService } from "./cloud-run";

const config = new pulumi.Config("mealio");

export function createMealio() {
  return createService({
    name: "mealio-api",
    envs: [
      { name: "APPLE_TEAM_ID", value: "6VMN7W3K93" },
      { name: "APPLE_BUNDLE_ID", value: "com.zzoo.mealio" },
      { name: "R2_BUCKET_NAME", value: "mealio-uploads" },
      { name: "R2_PUBLIC_URL", value: config.require("r2-public-url") },
      { name: "GEMINI_MODEL", value: "gemini-2.5-flash" },
      { name: "DATABASE_URL", value: config.requireSecret("database-url") },
      { name: "JWT_SECRET", value: config.requireSecret("jwt-secret") },
      { name: "GOOGLE_CLIENT_ID", value: config.requireSecret("google-client-id") },
      { name: "R2_ACCOUNT_ID", value: config.requireSecret("r2-account-id") },
      { name: "R2_ACCESS_KEY_ID", value: config.requireSecret("r2-access-key-id") },
      { name: "R2_SECRET_ACCESS_KEY", value: config.requireSecret("r2-secret-access-key") },
      { name: "SENTRY_DSN", value: config.requireSecret("sentry-dsn") },
      { name: "GEMINI_API_KEY", value: config.requireSecret("gemini-api-key") },
    ],
  });
}
```

**`index.ts`** — 엔트리포인트:
```typescript
import { createIam } from "./shared/iam";
import { createRegistry } from "./shared/registry";
import { createMealio } from "./services/mealio";
// import { createAppB } from "./services/app-b";  ← 새 서비스 추가 시

createIam();
createRegistry();

const mealio = createMealio();
// const appB = createAppB();

export const mealioApiUrl = mealio.uri;
```

### 새 서비스 추가 시

1. `services/app-b.ts` 파일 생성 (mealio.ts 복사 후 수정)
2. `index.ts`에 import + 호출 추가
3. `pulumi config set --secret app-b:database-url <값>`
4. `pulumi up`

끝.

---

## 마이그레이션 순서

### Phase 1: zzooapp-infra repo 생성

```bash
# repo 생성
gh repo create zzoohub/zzooapp-infra --private

# 로컬 클론
git clone git@github.com:zzoohub/zzooapp-infra.git
cd zzooapp-infra

# Pulumi 초기화
pulumi new typescript --name zzooapp-infra --yes
bun install @pulumi/gcp
```

위 설계의 코드를 작성.

`Pulumi.yaml`:
```yaml
name: zzooapp-infra
runtime:
  name: nodejs
  options:
    packagemanager: bun
description: GCP infrastructure for zzooapp services
```

### Phase 2: 새 GCP 프로젝트 세팅

```bash
gcloud config set project zzooapp

gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com \
  androidpublisher.googleapis.com
```

### Phase 3: OAuth 이전

[GCP Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials?project=zzooapp)에서 OAuth Client ID 3종 생성:

| 타입 | 설정 |
|------|------|
| Web | API 서버 토큰 검증용 |
| Android | 패키지: `com.zzoo.mealio`, SHA-1 지문 |
| iOS | 번들 ID: `com.zzoo.mealio` |

기록:
- Web Client ID → `pulumi config set --secret mealio:google-client-id`
- iOS Client ID → `app.json`의 `iosUrlScheme` (reversed 형식)

### Phase 4: Play Store API 서비스 계정

```bash
gcloud iam service-accounts create play-store-publisher \
  --display-name="Play Store Publisher" \
  --project=zzooapp

gcloud iam service-accounts keys create \
  ~/apps/mealio/mobile/google-service-account-play-store-api.json \
  --iam-account=play-store-publisher@zzooapp.iam.gserviceaccount.com
```

[Google Play Console → API access](https://play.google.com/console/developers/api-access)에서 권한 부여.

### Phase 5: Pulumi 배포

```bash
cd zzooapp-infra

# GCP 설정
pulumi config set gcp:project zzooapp
pulumi config set gcp:region us-east4

# mealio secrets (기존 값 복사)
pulumi config set mealio:r2-public-url <값>
pulumi config set --secret mealio:database-url <값>
pulumi config set --secret mealio:jwt-secret <값>
pulumi config set --secret mealio:google-client-id <새 Web Client ID>
pulumi config set --secret mealio:r2-account-id <값>
pulumi config set --secret mealio:r2-access-key-id <값>
pulumi config set --secret mealio:r2-secret-access-key <값>
pulumi config set --secret mealio:sentry-dsn <값>
pulumi config set --secret mealio:gemini-api-key <값>

pulumi up
```

확인:
```bash
curl $(pulumi stack output mealioApiUrl)/health
```

### Phase 6: CI/CD 전환

**mealio repo** `.github/workflows/api.yml`:

```yaml
env:
  IMAGE: us-east4-docker.pkg.dev/zzooapp/services/mealio-api

# deploy job
gcloud run deploy mealio-api \
  --image ${{ env.IMAGE }}:${GITHUB_SHA::7} \
  --region us-east4 \
  --project zzooapp
```

**GitHub Secrets 업데이트** (mealio repo):

| Secret | 값 |
|--------|---|
| `WIF_PROVIDER` | `projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/github/providers/github` |
| `WIF_SERVICE_ACCOUNT` | `github-actions@zzooapp.iam.gserviceaccount.com` |

```bash
gcloud projects describe zzooapp --format="value(projectNumber)"
```

CI 검증: `api/`에 사소한 변경 push.

### Phase 7: 앱 네이티브 빌드 + 스토어 배포

#### 코드 변경

`mobile/src/shared/config/index.ts`:
```typescript
// BASE_URL → 새 Cloud Run URL (Phase 5에서 확인한 것)
: "https://mealio-api-XXXXXXXXXXXX.us-east4.run.app/api",
```

`mobile/app.json`:
```jsonc
// iosUrlScheme → 새 iOS Client ID (Phase 3에서 생성한 것)
["@react-native-google-signin/google-signin", {
  "iosUrlScheme": "com.googleusercontent.apps.<새_iOS_CLIENT_ID>"
}]
```

`google-services.json` 교체 (필요 시).

#### 빌드 + 배포

```bash
cd mobile
eas build --platform all --profile production
eas submit --platform all --profile production
```

스토어 배포 후 Google 로그인, 사진 업로드, AI 분석 전체 테스트.

### Phase 8: mealio/infra 제거 + 기존 프로젝트 정리

스토어 배포 반영 + 1~2주 뒤.

#### mealio repo에서 infra 제거

```bash
cd ~/apps/mealio
rm -rf infra/
# commit & push
```

#### 기존 Pulumi 스택 정리

```bash
# 기존 mealio/infra에서 (삭제 전에 실행, 또는 git stash로 복원)
cd infra
pulumi state unprotect --all
pulumi destroy
pulumi stack rm
```

#### GCP 프로젝트 삭제

```bash
gcloud projects delete mealio-483914
gcloud projects delete play-store-api
```

> 삭제 후 30일간 복구 가능.

---

## 변경 파일 요약

| 파일 | 변경 | Phase |
|------|------|-------|
| `zzooapp-infra/` (새 repo) | 전체 생성 | 1, 5 |
| `mobile/src/shared/config/index.ts` | BASE_URL → 새 Cloud Run URL | 7 |
| `mobile/app.json` | `iosUrlScheme` → 새 iOS Client ID | 7 |
| `mobile/google-services.json` | 새 프로젝트 파일로 교체 | 7 |
| `mobile/google-service-account-play-store-api.json` | 새 서비스 계정 키 | 4 |
| `.github/workflows/api.yml` | IMAGE 경로 + `--project zzooapp` | 6 |
| `infra/` | 삭제 | 8 |

**변경 불필요**: `eas.json`, 번들 ID, Neon, R2, Sentry, PostHog, Cloudflare

---

## 체크리스트

- [ ] Phase 1: `zzooapp-infra` repo 생성 + 코드 작성
- [ ] Phase 2: zzooapp GCP API 활성화
- [ ] Phase 3: OAuth 3종 생성 (Web/Android/iOS)
- [ ] Phase 4: Play Store 서비스 계정 생성 + Play Console 연결
- [ ] Phase 5: `pulumi up` + health check 통과
- [ ] Phase 6: mealio CI/CD → 새 프로젝트로 전환 + 파이프라인 검증
- [ ] Phase 7: 앱 네이티브 빌드 + 스토어 배포 + Google 로그인 테스트
- [ ] Phase 8: mealio/infra 삭제 + 기존 GCP 프로젝트 삭제 (1~2주 뒤)
