# Mealio GCP 마이그레이션 가이드

**전제조건**: `infra` repo 세팅 완료 ([infra/docs/setup.md](../../infra/docs/setup.md) 참고)

**목표**: `mealio-483914` + `play-store-api` → `zzooapp` 완전 이전, 기존 프로젝트 삭제

**전략**: 새 프로젝트에 먼저 배포 (무중단) → 앱 네이티브 빌드 + 스토어 배포 → 기존 정리

---

## Phase 1: OAuth 이전

[GCP Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials?project=zzooapp)에서 OAuth Client ID 3종 생성:

| 타입 | 설정 |
|------|------|
| Web | API 서버 토큰 검증용 |
| Android | 패키지: `com.zzoo.mealio`, SHA-1 지문 |
| iOS | 번들 ID: `com.zzoo.mealio` |

기록:
- Web Client ID → `pulumi config set --secret mealio:google-client-id`
- iOS Client ID → `app.json`의 `iosUrlScheme` (reversed 형식)

---

## Phase 2: Play Store API 서비스 계정

```bash
gcloud iam service-accounts create play-store-publisher \
  --display-name="Play Store Publisher" \
  --project=zzooapp

gcloud iam service-accounts keys create \
  ~/apps/mealio/mobile/google-service-account-play-store-api.json \
  --iam-account=play-store-publisher@zzooapp.iam.gserviceaccount.com
```

[Google Play Console → API access](https://play.google.com/console/developers/api-access)에서 새 서비스 계정에 권한 부여.

---

## Phase 3: Pulumi에 mealio 시크릿 설정 + 배포

```bash
cd ~/apps/infra

# mealio 전용 시크릿
pulumi config set mealio:r2-public-url <값>
pulumi config set --secret mealio:database-url <값>
pulumi config set --secret mealio:jwt-secret <값>
pulumi config set --secret mealio:google-client-id <새 Web Client ID>
pulumi config set --secret mealio:gemini-api-key <값>

pulumi up
```

확인:
```bash
curl $(pulumi stack output mealioApiUrl)/health
```

새 Cloud Run URL 기록 (예: `https://mealio-api-XXXXXXXXXXXX.us-east4.run.app`).

---

## Phase 4: CI/CD 전환

### GitHub Actions workflow

`.github/workflows/api.yml`:

```yaml
env:
  IMAGE: us-east4-docker.pkg.dev/zzooapp/services/mealio-api

# deploy job
gcloud run deploy mealio-api \
  --image ${{ env.IMAGE }}:${GITHUB_SHA::7} \
  --region us-east4 \
  --project zzooapp
```

### GitHub Secrets 업데이트

Repository → Settings → Secrets:

| Secret | 값 |
|--------|---|
| `WIF_PROVIDER` | `projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/github/providers/github` |
| `WIF_SERVICE_ACCOUNT` | `github-actions@zzooapp.iam.gserviceaccount.com` |

```bash
gcloud projects describe zzooapp --format="value(projectNumber)"
```

CI 검증: `api/`에 사소한 변경 push.

---

## Phase 5: 앱 네이티브 빌드 + 스토어 배포

OAuth 이전으로 네이티브 레이어가 변경되므로 스토어 배포 필요.

### 코드 변경

`mobile/src/shared/config/index.ts`:
```typescript
// BASE_URL → 새 Cloud Run URL (Phase 3에서 확인한 것)
: "https://mealio-api-XXXXXXXXXXXX.us-east4.run.app/api",
```

`mobile/app.json`:
```jsonc
// iosUrlScheme → 새 iOS Client ID (Phase 1에서 생성한 것)
["@react-native-google-signin/google-signin", {
  "iosUrlScheme": "com.googleusercontent.apps.<새_iOS_CLIENT_ID>"
}]
```

`google-services.json` 교체 (필요 시).

### 빌드 + 배포

```bash
cd mobile
eas build --platform all --profile production
eas submit --platform all --profile production
```

스토어 배포 후 Google 로그인, 사진 업로드, AI 분석 전체 테스트.

---

## Phase 6: 기존 정리 (1~2주 뒤)

스토어 배포 반영 + 사용자 업데이트 시간 확보 후 진행.

### mealio repo에서 infra 제거

```bash
cd ~/apps/mealio
rm -rf infra/
# commit & push
```

### 기존 Pulumi 스택 정리

```bash
# 기존 mealio/infra에서 (삭제 전에 실행, 또는 git stash로 복원)
cd infra
pulumi state unprotect --all
pulumi destroy
pulumi stack rm
```

### GCP 프로젝트 삭제

```bash
gcloud projects delete mealio-483914
gcloud projects delete play-store-api
```

> 삭제 후 30일간 복구 가능.

---

## 변경 파일 요약

| 파일 | 변경 | Phase |
|------|------|-------|
| `mobile/src/shared/config/index.ts` | BASE_URL → 새 Cloud Run URL | 5 |
| `mobile/app.json` | `iosUrlScheme` → 새 iOS Client ID | 5 |
| `mobile/google-services.json` | 새 프로젝트 파일로 교체 | 5 |
| `mobile/google-service-account-play-store-api.json` | 새 서비스 계정 키 | 2 |
| `.github/workflows/api.yml` | IMAGE 경로 + `--project zzooapp` | 4 |
| `infra/` | 삭제 | 6 |

**변경 불필요**: `eas.json`, 번들 ID(`com.zzoo.mealio`), Cloudflare DNS

---

## 체크리스트

- [ ] Phase 1: OAuth 3종 생성 (Web/Android/iOS)
- [ ] Phase 2: Play Store 서비스 계정 생성 + Play Console 연결
- [ ] Phase 3: Pulumi mealio 시크릿 설정 + `pulumi up` + health check
- [ ] Phase 4: CI/CD → 새 프로젝트로 전환 + 파이프라인 검증
- [ ] Phase 5: 앱 네이티브 빌드 + 스토어 배포 + Google 로그인 테스트
- [ ] Phase 6: mealio/infra 삭제 + 기존 GCP 프로젝트 삭제 (1~2주 뒤)
