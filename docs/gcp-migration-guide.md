# GCP 프로젝트 마이그레이션 가이드

**목표**: `mealio-483914` + `play-store-api` → `zzooapp` 완전 통합, `zzooapp-infra` 독립 repo로 분리

**전략**:
1. `zzooapp-infra` repo 생성 (전체 인프라 통합 관리)
2. 새 프로젝트에 인프라 배포
3. CI/CD 전환
4. 앱 네이티브 빌드 + 스토어 배포
5. 기존 정리

---

## zzooapp-infra 설계

### 역할 분리

| 관리 주체 | 대상 |
|-----------|------|
| **zzooapp-infra (Pulumi)** | Cloud Run, Artifact Registry, IAM/WIF, Neon DB, Cloudflare R2, Sentry, Vercel, PostHog |
| **각 서비스 repo CI** | Docker 이미지 빌드 + `gcloud run deploy` |
| **수동** | Cloudflare DNS, EAS (`eas.json` + CLI) |

서비스 삭제 시 **폴더 삭제 + `pulumi up` 한 번**으로 모든 리소스 자동 정리.

### Pulumi providers

```bash
bun add @pulumi/gcp @pulumi/cloudflare @pulumi/neon @pulumi/vercel pulumi-posthog
# Sentry: pulumiverse provider
bun add @pulumiverse/sentry
```

### repo 구조

```
zzooapp-infra/
├── Pulumi.yaml
├── package.json
├── index.ts                        # 엔트리포인트
├── shared/
│   ├── config.ts                   # gcpProject, gcpRegion, 각 provider 설정
│   ├── iam.ts                      # WIF pool + provider + 공용 서비스 계정
│   ├── registry.ts                 # Artifact Registry (공용 1개)
│   ├── neon.ts                     # Neon 프로젝트 (공용 1개)
│   └── factories/
│       ├── cloud-run.ts            # createService()
│       ├── database.ts             # createDatabase()
│       ├── bucket.ts               # createBucket()
│       ├── sentry.ts               # createSentryProject()
│       ├── vercel.ts               # createVercelProject()
│       └── posthog.ts              # createPosthogResources()
└── services/
    ├── mealio/                     # 파일트리 = 인프라 구성 한눈에 파악
    │   ├── index.ts                # export createMealio()
    │   ├── cloud-run.ts            # Cloud Run 서비스 + 환경변수
    │   ├── cloudflare.ts           # R2 bucket
    │   ├── neon.ts                 # Database
    │   └── sentry.ts               # Sentry 프로젝트
    ├── app-b/                      # Vercel 프론트엔드 서비스 예시
    │   ├── index.ts
    │   ├── neon.ts
    │   ├── vercel.ts               # ← Vercel 프로젝트
    │   ├── sentry.ts
    │   └── posthog.ts              # ← PostHog 피처플래그/대시보드
    └── app-c/
        ├── index.ts
        └── cloud-run.ts            # ← DB도 없는 가벼운 서비스
```

### 시크릿 관리 (`shared` 네임스페이스)

여러 서비스가 공유하는 시크릿은 `shared` 네임스페이스에 1번만 설정.
서비스 전용 시크릿만 각 서비스 네임스페이스에 설정.

```bash
# 공용 시크릿 (1번만 설정, 전 서비스 공유)
pulumi config set --secret shared:r2-account-id <값>
pulumi config set --secret shared:r2-access-key-id <값>
pulumi config set --secret shared:r2-secret-access-key <값>
pulumi config set --secret shared:sentry-org "zzoo-org"
pulumi config set --secret shared:sentry-team "zzoo"

# 서비스 전용 시크릿
pulumi config set --secret mealio:database-url <값>
pulumi config set --secret mealio:jwt-secret <값>
pulumi config set --secret mealio:google-client-id <값>
pulumi config set --secret mealio:gemini-api-key <값>
```

키 로테이션 시: `pulumi config set --secret shared:r2-access-key-id <새값>` + `pulumi up` → 20개 서비스 전부 반영.

### 핵심 코드

**`shared/config.ts`**:
```typescript
import * as pulumi from "@pulumi/pulumi";

const gcpConfig = new pulumi.Config("gcp");
const cfConfig = new pulumi.Config("cloudflare");
const shared = new pulumi.Config("shared");

// Provider 설정
export const gcpProject = gcpConfig.require("project");          // zzooapp
export const gcpRegion = gcpConfig.require("region");             // us-east4
export const cloudflareAccountId = cfConfig.require("accountId");

// 공용 시크릿 (여러 서비스가 공유)
export const sharedSecrets = {
  r2AccountId: shared.requireSecret("r2-account-id"),
  r2AccessKeyId: shared.requireSecret("r2-access-key-id"),
  r2SecretAccessKey: shared.requireSecret("r2-secret-access-key"),
  sentryOrg: shared.require("sentry-org"),
  sentryTeam: shared.require("sentry-team"),
};
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
  }, { protect: true });
}
```

**`shared/neon.ts`**:
```typescript
import * as neon from "@pulumi/neon";

export function createNeonProject() {
  return new neon.Project("zzooapp", {
    name: "zzooapp",
    pgVersion: 18,
    regionId: "aws-us-east-1",
  }, { protect: true });
}
```

### 팩토리 함수

**`shared/factories/cloud-run.ts`**:
```typescript
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { gcpProject, gcpRegion } from "../config";

export interface CloudRunConfig {
  name: string;
  envs?: { name: string; value: string | pulumi.Output<string> }[];
  cpu?: string;
  memory?: string;
  maxInstances?: number;
  concurrency?: number;
  healthCheckPath?: string;
  public?: boolean;
  protect?: boolean;        // 운영: true, 실험: false
}

export function createCloudRun(config: CloudRunConfig) {
  const {
    name,
    envs = [],
    cpu = "1",
    memory = "512Mi",
    maxInstances = 3,
    concurrency = 80,
    healthCheckPath = "/health",
    public: isPublic = true,
    protect: isProtected = false,
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
    protect: isProtected,
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

**`shared/factories/database.ts`**:
```typescript
import * as neon from "@pulumi/neon";

export interface DatabaseConfig {
  name: string;
  projectId: string;
  branchId: string;
  ownerName?: string;
}

export function createDatabase(config: DatabaseConfig) {
  return new neon.Database(config.name, {
    projectId: config.projectId,
    branchId: config.branchId,
    name: config.name,
    ownerName: config.ownerName ?? config.name,
  });
}
```

**`shared/factories/bucket.ts`**:
```typescript
import * as cloudflare from "@pulumi/cloudflare";
import { cloudflareAccountId } from "../config";

export interface BucketConfig {
  name: string;
  location?: string;
}

export function createBucket(config: BucketConfig) {
  return new cloudflare.R2Bucket(config.name, {
    accountId: cloudflareAccountId,
    name: config.name,
    location: config.location ?? "ENAM",
  });
}
```

**`shared/factories/sentry.ts`**:
```typescript
import * as sentry from "@pulumiverse/sentry";

export interface SentryProjectConfig {
  name: string;           // 프로젝트 이름
  organization: string;   // Sentry org slug
  team: string;           // Sentry team slug
  platform?: string;      // e.g. "node", "python", "react-native"
}

export function createSentryProject(config: SentryProjectConfig) {
  const project = new sentry.SentryProject(config.name, {
    organization: config.organization,
    teams: [config.team],
    name: config.name,
    slug: config.name,
    platform: config.platform ?? "node",
  });

  const key = new sentry.SentryKey(`${config.name}-key`, {
    organization: config.organization,
    project: project.slug,
    name: "Default",
  });

  return { project, key, dsn: key.dsnPublic };
}
```

**`shared/factories/vercel.ts`**:
```typescript
import * as vercel from "@pulumiverse/vercel";

export interface VercelProjectConfig {
  name: string;
  framework?: string;     // e.g. "nextjs", "vite"
  gitRepository?: {
    type: string;          // "github"
    repo: string;          // "zzoohub/app-b"
  };
  environmentVariables?: {
    key: string;
    value: string;
    targets: string[];     // ["production", "preview", "development"]
  }[];
}

export function createVercelProject(config: VercelProjectConfig) {
  return new vercel.Project(config.name, {
    name: config.name,
    framework: config.framework,
    gitRepository: config.gitRepository,
    environments: config.environmentVariables?.map(env => ({
      key: env.key,
      value: env.value,
      targets: env.targets,
    })),
  });
}
```

**`shared/factories/posthog.ts`**:
```typescript
import * as posthog from "pulumi-posthog";

export interface PosthogFeatureFlagConfig {
  name: string;
  key: string;
  rolloutPercentage?: number;
  active?: boolean;
}

export function createFeatureFlag(config: PosthogFeatureFlagConfig) {
  return new posthog.FeatureFlag(config.name, {
    key: config.key,
    name: config.name,
    active: config.active ?? false,
    filters: JSON.stringify({
      groups: [{
        rollout_percentage: config.rolloutPercentage ?? 0,
      }],
    }),
  });
}
```

### 서비스 예시: mealio

**`services/mealio/neon.ts`**:
```typescript
import { createDatabase } from "../../shared/factories/database";

export function createMealioDB(projectId: string, branchId: string) {
  return createDatabase({ name: "mealio", projectId, branchId });
}
```

**`services/mealio/cloudflare.ts`**:
```typescript
import { createBucket } from "../../shared/factories/bucket";

export function createMealioBucket() {
  return createBucket({ name: "mealio-uploads" });
}
```

**`services/mealio/sentry.ts`**:
```typescript
import { createSentryProject } from "../../shared/factories/sentry";
import { sharedSecrets } from "../../shared/config";

export function createMealioSentry() {
  return createSentryProject({
    name: "mealio-api",
    organization: sharedSecrets.sentryOrg,    // ← shared에서
    team: sharedSecrets.sentryTeam,           // ← shared에서
    platform: "node",
  });
}
```

**`services/mealio/cloud-run.ts`**:
```typescript
import * as pulumi from "@pulumi/pulumi";
import { createCloudRun } from "../../shared/factories/cloud-run";
import { sharedSecrets } from "../../shared/config";

const config = new pulumi.Config("mealio");

export function createMealioService(sentryDsn?: pulumi.Output<string>) {
  return createCloudRun({
    name: "mealio-api",
    protect: true,
    envs: [
      // 서비스 고유
      { name: "APPLE_TEAM_ID", value: "6VMN7W3K93" },
      { name: "APPLE_BUNDLE_ID", value: "com.zzoo.mealio" },
      { name: "R2_BUCKET_NAME", value: "mealio-uploads" },
      { name: "R2_PUBLIC_URL", value: config.require("r2-public-url") },
      { name: "GEMINI_MODEL", value: "gemini-2.5-flash" },
      { name: "DATABASE_URL", value: config.requireSecret("database-url") },
      { name: "JWT_SECRET", value: config.requireSecret("jwt-secret") },
      { name: "GOOGLE_CLIENT_ID", value: config.requireSecret("google-client-id") },
      { name: "GEMINI_API_KEY", value: config.requireSecret("gemini-api-key") },
      // 공용 시크릿 (shared에서)
      { name: "R2_ACCOUNT_ID", value: sharedSecrets.r2AccountId },
      { name: "R2_ACCESS_KEY_ID", value: sharedSecrets.r2AccessKeyId },
      { name: "R2_SECRET_ACCESS_KEY", value: sharedSecrets.r2SecretAccessKey },
      // Sentry DSN (Pulumi가 자동 생성)
      { name: "SENTRY_DSN", value: sentryDsn ?? config.requireSecret("sentry-dsn") },
    ],
  });
}
```

**`services/mealio/index.ts`**:
```typescript
import { createMealioDB } from "./neon";
import { createMealioBucket } from "./cloudflare";
import { createMealioSentry } from "./sentry";
import { createMealioService } from "./cloud-run";

export function createMealio(neonProjectId: string, neonBranchId: string) {
  const db = createMealioDB(neonProjectId, neonBranchId);
  const bucket = createMealioBucket();
  const sentry = createMealioSentry();
  const service = createMealioService(sentry.dsn);

  return { db, bucket, sentry, service };
}
```

### 엔트리포인트

**`index.ts`**:
```typescript
import { createIam } from "./shared/iam";
import { createRegistry } from "./shared/registry";
import { createNeonProject } from "./shared/neon";
import { createMealio } from "./services/mealio";
// import { createAppB } from "./services/app-b";

// 공용 리소스
createIam();
createRegistry();
const neon = createNeonProject();

// 서비스
const mealio = createMealio(neon.id, neon.defaultBranchId);
// const appB = createAppB(neon.id, neon.defaultBranchId);

// Outputs
export const mealioApiUrl = mealio.service.uri;
```

### 서비스 라이프사이클

**추가:**
1. `services/new-app/` 폴더 생성 (필요한 파일만)
2. `index.ts`에 import + 호출 추가
3. `pulumi config set --secret new-app:database-url <값>` (필요시)
4. `pulumi up`

**삭제:**
1. `index.ts`에서 import/호출 제거
2. `services/old-app/` 폴더 삭제
3. `pulumi up` → Cloud Run + DB + R2 + Sentry + Vercel + PostHog 전부 자동 삭제
   - `protect: true`인 경우 먼저 `pulumi state unprotect <urn>`

---

## 마이그레이션 순서

### Phase 1: zzooapp-infra repo 생성

```bash
gh repo create zzoohub/zzooapp-infra --private

git clone git@github.com:zzoohub/zzooapp-infra.git
cd zzooapp-infra

pulumi new typescript --name zzooapp-infra --yes
bun add @pulumi/gcp @pulumi/cloudflare @pulumi/neon @pulumiverse/vercel @pulumiverse/sentry pulumi-posthog
```

`Pulumi.yaml`:
```yaml
name: zzooapp-infra
runtime:
  name: nodejs
  options:
    packagemanager: bun
description: Infrastructure for zzooapp services
```

위 설계의 코드 작성.

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

# ── Provider 설정 ──
pulumi config set gcp:project zzooapp
pulumi config set gcp:region us-east4
pulumi config set cloudflare:accountId <값>
pulumi config set --secret cloudflare:apiToken <값>
pulumi config set --secret neon:apiKey <값>
pulumi config set --secret sentry:token <값>
pulumi config set --secret vercel:apiToken <값>
pulumi config set --secret posthog:apiKey <값>

# ── 공용 시크릿 (shared) ── 1번만 설정, 전 서비스 공유
pulumi config set --secret shared:r2-account-id <값>
pulumi config set --secret shared:r2-access-key-id <값>
pulumi config set --secret shared:r2-secret-access-key <값>
pulumi config set shared:sentry-org zzoo-org
pulumi config set shared:sentry-team zzoo

# ── mealio 전용 시크릿 ──
pulumi config set mealio:r2-public-url <값>
pulumi config set --secret mealio:database-url <값>
pulumi config set --secret mealio:jwt-secret <값>
pulumi config set --secret mealio:google-client-id <새 Web Client ID>
pulumi config set --secret mealio:gemini-api-key <값>

pulumi up
```

> 새 서비스 추가 시 공용 시크릿은 이미 설정되어 있으므로 서비스 전용 시크릿만 추가하면 됨.

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

### Phase 8: 기존 정리 (1~2주 뒤)

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

**변경 불필요**: `eas.json`, 번들 ID(`com.zzoo.mealio`), Cloudflare DNS

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
