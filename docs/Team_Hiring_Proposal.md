# Cơm Tấm Má Tư — Đề Xuất Tuyển Dụng Bổ Sung (Team Hiring Proposal)

> **Vai trò người viết:** Tech Lead
> **Ngày:** 2026-03-08
> **Mục đích:** Phân tích bottleneck của team hiện tại (3 người, 16 tuần) và đề xuất tuyển thêm nhân sự để đảm bảo chất lượng sản phẩm, giảm rủi ro, và mở rộng khả năng delivery.

---

## 1. Hiện Trạng Team & Bottleneck Analysis

### 1.1 Team Hiện Tại (3 Người)

| # | Vai trò | Trách nhiệm chính | Workload |
|---|---------|-------------------|----------|
| 1 | Senior UI/UX Designer | User research, Design System, Figma screens, micro-interactions, usability testing, App Store assets | Ổn — nhưng phải đi trước FE 1 sprint liên tục |
| 2 | Senior Front-End Developer (Mobile) | Flutter app: component library, 20+ screens, offline mode, E2E tests, performance, App Store submission | **QUÁ TẢI** — 1 người cho 2 platform (iOS + Android) |
| 3 | Back-End Developer | Schema, 15+ Edge Functions, RLS, CRM integration, push infra, load testing, monitoring, security | **QUÁ TẢI** — kiêm DevOps + QA backend + DBA |

### 1.2 Các Bottleneck Chính

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         BOTTLENECK MAP (Team 3 người)                        │
│                                                                              │
│  🔴 CRITICAL (chặn tiến độ)                                                 │
│  ├─ FE Dev phải học Dart/Flutter 2-3 tuần (Sprint 0) → mất 15% timeline     │
│  ├─ FE Dev 1 người build 20+ screens + component library + tests            │
│  ├─ BE Dev kiêm DevOps (CI/CD, monitoring, load testing)                    │
│  ├─ KHÔNG có QA chuyên trách → bugs phát hiện muộn                          │
│  └─ Section 5 (Delivery + Đặt Bàn) chưa ai được assign                     │
│                                                                              │
│  🟡 HIGH RISK (ảnh hưởng chất lượng)                                        │
│  ├─ BE Dev kiêm luôn Security (rate limiting, fraud detection)              │
│  ├─ Không ai phụ trách DevOps pipeline chuyên sâu                           │
│  ├─ Designer chỉ test usability 2 lần (tuần 10, 14) — quá ít               │
│  ├─ Không có data person cho analytics (PostHog) setup                      │
│  └─ Load testing 1000 concurrent — cần infrastructure expertise             │
│                                                                              │
│  🟢 MANAGEABLE                                                               │
│  ├─ Design workflow ổn (v0.app hỗ trợ rapid prototyping)                    │
│  └─ Supabase managed → giảm ops overhead                                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Risk Matrix — Nếu Giữ Team 3 Người

| Rủi ro | Xác suất | Impact | Hậu quả |
|--------|----------|--------|---------|
| FE không kịp build hết screens trong 16 tuần | 🔴 Cao | 🔴 Rất cao | Trễ release 4-6 tuần, hoặc cắt features |
| Bugs lọt vào production (không có QA) | 🔴 Cao | 🔴 Rất cao | UX tệ, mất khách hàng đầu tiên, review 1 sao |
| BE dev burnout (kiêm 4 vai trò) | 🟡 Trung bình | 🔴 Cao | Nghỉ việc → dự án đứng hoàn toàn |
| Section 5 (Delivery + Đặt Bàn) không kịp MVP | 🔴 Cao | 🟡 Trung bình | Phải release thiếu 2 tính năng quan trọng |
| Security issues bị bỏ sót | 🟡 Trung bình | 🔴 Rất cao | Data breach, mất uy tín thương hiệu |
| CI/CD pipeline mong manh, deploy thủ công | 🟡 Trung bình | 🟡 Trung bình | Release chậm, hotfix khó khăn |

---

## 2. Đề Xuất Tuyển Dụng: Team 3 → Team 6 (+3 Người)

### 2.1 Tổng Quan Team Mới

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         TEAM MỚI: 6 NGƯỜI                                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │                    Tech Lead (kiêm nhiệm)                           │     │
│  │              Architect decisions + code review + mentoring           │     │
│  └──────────────────────────┬──────────────────────────────────────────┘     │
│                              │                                               │
│       ┌──────────────────────┼──────────────────────┐                       │
│       │                      │                      │                       │
│  ┌────┴─────────┐    ┌──────┴───────┐    ┌─────────┴──────┐               │
│  │  DESIGN POD   │    │  MOBILE POD   │    │  PLATFORM POD   │               │
│  │               │    │               │    │                 │               │
│  │ 👤 Sr. UI/UX  │    │ 👤 Sr. FE     │    │ 👤 BE Dev       │               │
│  │   Designer    │    │   (Mobile)    │    │   (hiện tại)    │               │
│  │  [hiện tại]   │    │  [hiện tại]   │    │                 │               │
│  │               │    │               │    │ 🆕 Jr/Mid DevOps│               │
│  │               │    │ 🆕 Mid FE     │    │   + QA          │               │
│  │               │    │   (Mobile)    │    │                 │               │
│  └───────────────┘    └───────────────┘    └─────────────────┘               │
│                                                                              │
│                       🆕 Mid QA Engineer                                     │
│                       (cross-team, report trực tiếp Tech Lead)              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Chi Tiết 3 Vị Trí Tuyển Mới

---

#### 🆕 Vị Trí 1: Mid-Level Flutter Developer (Mobile)

**Tại sao cần?**
- Senior FE hiện tại phải **một mình** build 20+ screens, component library, offline mode, E2E tests, performance optimization, và App Store submission trong 16 tuần — đây là workload cho **2 FE developers**.
- Senior FE mất thêm 2-3 tuần học Dart → chỉ còn 13 tuần productive.
- Section 5 (Delivery: 5 screens + Đặt Bàn: 3 screens) **chưa được assign cho ai**.

| Tiêu chí | Yêu cầu |
|----------|---------|
| **Kinh nghiệm** | 2-4 năm Flutter/Dart (KHÔNG cần học lại) |
| **Bắt buộc** | Đã ship ít nhất 1 app lên App Store / Play Store |
| **Kỹ năng chính** | Flutter Widget tree, Riverpod (hoặc Bloc), GoRouter, Dio, Drift (SQLite) |
| **Kỹ năng phụ** | Firebase (messaging, crashlytics), CI/CD mobile (Fastlane), Rive animations |
| **Nice to have** | Kinh nghiệm Supabase Flutter SDK, realtime subscriptions |
| **Tính cách** | Tự chủ, chịu áp lực sprint, code review constructive |
| **Hình thức** | Full-time, onsite hoặc hybrid |
| **Onboard** | Tuần 1-2 (song song Sprint 0) |

**Phân công sau khi tuyển:**

| Người | Screens & Features |
|-------|-------------------|
| **Senior FE** (hiện tại) | Core Loyalty: Home, Login/Onboarding, Check-in, Loyalty Dashboard, Profile. Component Library (lead). Offline mode. Performance optimization. |
| **🆕 Mid FE** | Delivery: Menu Browser, Cart, Checkout, Order Tracking, Driver Map. Đặt Bàn: Slot Picker, Reservation Form, Reservation Detail. Push Notification UI. |

**Impact:** Senior FE giảm workload ~45%, có thời gian focus quality + mentoring. Section 5 được cover đầy đủ.

---

#### 🆕 Vị Trí 2: QA Engineer (Mid-Level)

**Tại sao cần?**
- Team hiện tại **KHÔNG có ai chuyên trách QA**. Developer tự test → bias, bỏ sót edge cases.
- App loyalty có nhiều luồng nghiệp vụ phức tạp: tích điểm, nâng hạng, cashback, check-in anti-fraud, CRM sync, offline mode — mỗi luồng có 5-10 edge cases.
- **Bugs lọt vào production = mất tiền thật** (tích điểm sai, cashback sai, CRM data conflict).
- Load testing (1000 concurrent check-ins) cần người chuyên setup + analyze kết quả.
- App Store review reject vì bugs = trễ release 1-2 tuần/lần.

| Tiêu chí | Yêu cầu |
|----------|---------|
| **Kinh nghiệm** | 2-3 năm QA cho mobile app (iOS + Android) |
| **Bắt buộc** | Viết test cases, exploratory testing, regression testing |
| **Kỹ năng chính** | Mobile testing (real devices + emulators), API testing (Postman/Insomnia), bug reporting (Linear) |
| **Kỹ năng phụ** | Automation: Patrol (Flutter E2E) hoặc Appium/Maestro. Load testing: k6 hoặc Artillery |
| **Nice to have** | Kinh nghiệm test loyalty/fintech app (điểm, ví, giao dịch) |
| **Tính cách** | Tỉ mỉ, skeptical mindset ("cái này chắc sẽ lỗi"), communication rõ ràng |
| **Hình thức** | Full-time, onsite hoặc hybrid |
| **Onboard** | Tuần 3-4 (khi có screens đầu tiên để test) |

**Phân công:**

| Phase | QA Engineer làm gì |
|-------|-------------------|
| **Sprint 0-1** (Tuần 1-4) | Viết Test Plan tổng thể. Setup test devices (2 iOS + 3 Android tầm thấp-trung-cao). Viết test cases cho Auth + Home + Check-in flows. |
| **Sprint 2-3** (Tuần 5-8) | Test từng screen khi FE deliver. API testing song song với BE. Regression test mỗi sprint. Bug tracking trên Linear. |
| **Sprint 4-5** (Tuần 9-12) | Test Delivery + Đặt Bàn flows. Offline mode testing (airplane mode, flaky network). Push notification testing trên real devices. Setup automation cho happy paths (Patrol). |
| **Sprint 6-7** (Tuần 13-16) | Load testing: 1000 concurrent check-ins, 500 txn/min. Security testing: rate limiting, input validation. Full regression. UAT support với 10 nhân viên. App Store compliance check. |

**Impact:** Bug detection sớm hơn 2-4 tuần. Production quality tăng đáng kể. Load testing có người chuyên trách.

---

#### 🆕 Vị Trí 3: Junior/Mid DevOps Engineer

**Tại sao cần?**
- BE Dev hiện tại **kiêm 4 vai trò**: Backend logic + DevOps + DBA + Security. Đây là workload cho 1.5-2 người.
- CI/CD pipeline (GitHub Actions + Fastlane + Firebase App Distribution + Shorebird) cần setup và maintain liên tục.
- Database monitoring, connection pool tuning, RLS audit, backup strategy — cần chuyên trách.
- Security hardening (rate limiting, IP blocking, abuse detection) không nên là afterthought.
- Sentry + PostHog setup cần người integrate + tạo dashboards.

| Tiêu chí | Yêu cầu |
|----------|---------|
| **Kinh nghiệm** | 1-3 năm DevOps hoặc Platform Engineering |
| **Bắt buộc** | GitHub Actions CI/CD, Docker basics, PostgreSQL monitoring |
| **Kỹ năng chính** | CI/CD pipelines, infrastructure monitoring (Sentry, Grafana), database administration basics, secrets management |
| **Kỹ năng phụ** | Supabase platform, Edge Functions deployment, Fastlane (mobile CI/CD), Shorebird (OTA code push) |
| **Nice to have** | Firebase (App Distribution, Cloud Messaging), PostHog analytics, k6 load testing |
| **Tính cách** | Proactive ("tôi monitor trước khi nó crash"), documentation-oriented |
| **Hình thức** | Full-time, remote OK (DevOps ít cần sync real-time) |
| **Onboard** | Tuần 1-2 (setup CI/CD ngay từ đầu) |

**Phân công:**

| Phase | DevOps Engineer làm gì |
|-------|----------------------|
| **Sprint 0-1** (Tuần 1-4) | Setup CI/CD pipeline hoàn chỉnh: lint → test → build → distribute. Cấu hình Fastlane cho iOS + Android builds. Firebase App Distribution cho internal testing. Sentry integration (Flutter + Edge Functions). |
| **Sprint 2-3** (Tuần 5-8) | Database monitoring dashboards (query perf, connection pool). Secrets management (Supabase service keys, FCM keys). Staging environment setup. Automated Edge Function deployment pipeline. |
| **Sprint 4-5** (Tuần 9-12) | Shorebird (OTA code push) setup + test rollback scenarios. PostHog analytics integration. Security audit tooling. Push notification infrastructure (FCM/APNs). |
| **Sprint 6-7** (Tuần 13-16) | Load testing infrastructure (k6 scripts, results dashboards). Production readiness checklist: backup strategy, disaster recovery, runbook. App Store submission pipeline (auto-screenshot, metadata). Production monitoring + alerting (PagerDuty/Slack). |

**Impact:** BE Dev giảm workload ~40%, focus 100% vào business logic + CRM integration. CI/CD reliable từ ngày đầu. Monitoring proactive thay vì reactive.

---

## 3. So Sánh: Team 3 vs Team 6

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                    TEAM 3 NGƯỜI vs TEAM 6 NGƯỜI                                   │
│                                                                                   │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐           │
│  │       TEAM 3 (HIỆN TẠI)        │  │       TEAM 6 (ĐỀ XUẤT)        │           │
│  │                                │  │                                │           │
│  │  Timeline: 16 tuần             │  │  Timeline: 16 tuần             │           │
│  │  Scope: Core Loyalty only      │  │  Scope: FULL (Loyalty +        │           │
│  │  (Delivery/Đặt Bàn bị cắt)    │  │   Delivery + Đặt Bàn)          │           │
│  │                                │  │                                │           │
│  │  Quality: ⚠️ Medium             │  │  Quality: ✅ High               │           │
│  │  (no dedicated QA)             │  │  (QA chuyên trách)             │           │
│  │                                │  │                                │           │
│  │  Risk: 🔴 High                  │  │  Risk: 🟢 Low                   │           │
│  │  (single point of failure      │  │  (redundancy, specialization)  │           │
│  │   ở cả FE lẫn BE)             │  │                                │           │
│  │                                │  │                                │           │
│  │  CI/CD: ⚠️ Manual/fragile       │  │  CI/CD: ✅ Automated/robust     │           │
│  │                                │  │                                │           │
│  │  Burnout risk: 🔴 Very High     │  │  Burnout risk: 🟢 Low           │           │
│  │                                │  │                                │           │
│  │  Load testing: ❌ Skipped       │  │  Load testing: ✅ Full           │           │
│  │  Security audit: ❌ Minimal     │  │  Security audit: ✅ Proper       │           │
│  │                                │  │                                │           │
│  └────────────────────────────────┘  └────────────────────────────────┘           │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

| Tiêu chí | Team 3 | Team 6 |
|----------|--------|--------|
| **Tổng screens** | ~15 (cắt Delivery + Đặt Bàn) | ~25 (đầy đủ) |
| **E2E test coverage** | < 30% (FE tự viết khi rảnh) | > 70% (QA chuyên trách) |
| **CI/CD maturity** | Manual build + deploy | Fully automated pipeline |
| **Time to hotfix** | 2-4 giờ (build thủ công) | 30 phút (Shorebird OTA) |
| **Load testing** | Bỏ qua hoặc sơ sài | 1000 concurrent, stress test |
| **Monitoring** | Basic Sentry | Sentry + PostHog + custom dashboards |
| **CRM sync reliability** | Best effort | Monitored + auto-reconciliation |
| **Bus factor** | 1 (mất FE hoặc BE = dừng dự án) | 2 (có backup cho FE, BE được hỗ trợ) |

---

## 4. Task Delegation Mới — Team 6 Người

### 4.1 Sprint Overview (Giữ Nguyên 16 Tuần — Nhưng Scope Đầy Đủ)

```
Tuần 1-2:   ████████░░░░░░░░░░░░░░░░░░░░░░░░  Sprint 0: Setup & Research
Tuần 3-4:   ░░░░░░░░████████░░░░░░░░░░░░░░░░  Sprint 1: Foundation
Tuần 5-6:   ░░░░░░░░░░░░░░░░████████░░░░░░░░  Sprint 2: Core Features
Tuần 7-8:   ░░░░░░░░░░░░░░░░░░░░░░░░████████  Sprint 3: Core Features (tiếp)
Tuần 9-10:  ░░░░░░░░░░░░░░░░░░░░░░░░████████  Sprint 4: Advanced Features
Tuần 11-12: ░░░░░░░░░░░░░░░░░░░░░░░░████████  Sprint 5: Delivery & Đặt Bàn
Tuần 13-14: ░░░░░░░░░░░░░░░░░░░░░░░░████████  Sprint 6: Polish & Testing
Tuần 15-16: ░░░░░░░░░░░░░░░░░░░░░░░░████████  Sprint 7: Release
```

### 4.2 Responsibility Matrix (RACI-style)

| Công việc | Sr. Designer | Sr. FE (Mobile) | 🆕 Mid FE (Mobile) | BE Dev | 🆕 QA Engineer | 🆕 DevOps |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|
| **Design System & Figma** | **Own** | Review | Review | — | — | — |
| **Component Library (Flutter)** | Review | **Own** | Contribute | — | Test | — |
| **Core Screens (Home, Login, Check-in, Dashboard)** | Design | **Own** | — | API | **Test** | — |
| **Delivery Screens (Menu, Cart, Tracking)** | Design | Review | **Own** | API | **Test** | — |
| **Đặt Bàn Screens (Slots, Form, Detail)** | Design | Review | **Own** | API | **Test** | — |
| **Profile & Settings** | Design | **Own** | — | — | Test | — |
| **Offline Mode (Drift)** | — | **Own** | Support | Sync protocol | **Test** | — |
| **Push Notifications** | — | Integrate | Integrate | FCM setup | Test | **Infra** |
| **Database Schema + RLS** | — | — | — | **Own** | Verify | Monitor |
| **Edge Functions (Loyalty)** | — | — | — | **Own** | **API Test** | Deploy |
| **Edge Functions (Delivery + Đặt Bàn)** | — | — | — | **Own** | **API Test** | Deploy |
| **CRM Integration + Sync** | — | — | — | **Own** | Verify | Monitor |
| **CI/CD Pipeline** | — | — | — | — | — | **Own** |
| **Monitoring (Sentry, PostHog)** | — | — | — | — | — | **Own** |
| **Load Testing** | — | — | — | Support | **Own** | **Infra** |
| **Security Audit** | — | — | — | **Own** | Pentest | Support |
| **App Store Submission** | Assets | Metadata | — | — | Compliance | **Pipeline** |
| **E2E Test Automation (Patrol)** | — | Support | Support | — | **Own** | CI integration |

### 4.3 Senior Front-End Developer (Mobile) — Task Delegation MỚI

#### Phase 1: Project Setup & Component Library (Tuần 1-4)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| Học Dart + Flutter (Sprint 0) | Mini project, Dart syntax, Widget tree | Solo (🆕 Mid FE hỗ trợ/pair) |
| Khởi tạo Flutter project trong monorepo | `apps/mobile/` với Flutter 3.x, Dart strict mode | Solo |
| Thiết lập Design Token pipeline | Figma Variables → JSON export → `theme.dart` | Với Designer |
| Build Component Library (Atoms + Molecules) | Button, Input, Badge, Card, PointsDisplay, TierBadge... | Với Designer (review trên Widgetbook). 🆕 Mid FE pair-build |
| Thiết lập Widgetbook | Để Designer review components | Solo |
| Cấu hình Navigation (GoRouter) | Tab navigation, stack screens, deep linking | Solo |
| Tích hợp Supabase Flutter client | Auth flow, realtime subscription setup | Với BE Dev |

#### Phase 2: Core Screens (Tuần 5-8)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| Home Screen | Points summary, quick actions, promotions carousel | Với Designer + BE Dev (API) |
| Login / Onboarding Flow | Phone auth, OTP, first-time tutorial | Với BE Dev (auth API) |
| Check-in Screen | Camera QR scanner, geolocation fallback, celebration animation | Với Designer + BE Dev |
| Loyalty Dashboard | Tier progress bar, points history, tier benefits | Với Designer + BE Dev |
| Code Review cho 🆕 Mid FE | Review Delivery screens code quality | Với 🆕 Mid FE |

#### Phase 3: Advanced Features (Tuần 9-12)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| Cashback & Promotions | Active promotions list, cashback history, redeem flow | Với BE Dev |
| Profile & Settings | Profile edit, notification preferences | Solo |
| Offline Support (Lead) | Drift (SQLite) architecture, sync queue design | Với BE Dev (sync protocol). 🆕 Mid FE implement offline cho Delivery |
| Push Notifications integration | `firebase_messaging` client setup | Với 🆕 DevOps (FCM infra) |

#### Phase 4: Polish & Release (Tuần 13-16)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| Performance Optimization | ListView, image caching, tree shaking, bundle size | Solo |
| Accessibility | VoiceOver/TalkBack, contrast ratios | Với Designer |
| Bug fixing từ QA | Fix bugs từ QA report | Với 🆕 QA |
| App Store Preparation | Fastlane config, metadata | Với Designer + 🆕 DevOps |

### 4.4 🆕 Mid-Level Flutter Developer — Task Delegation

#### Phase 1: Onboard & Component Library (Tuần 1-4)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| Onboard: Hiểu project architecture | Đọc Design_Tech_Workflow.md, API_Contract.md | Với Sr. FE (mentor) |
| Pair-build Component Library | Build Organisms: Header, BottomTabBar, CheckinSheet, LoyaltyCard... | Với Sr. FE + Designer |
| Build Notification UI components | NotificationItem, NotificationList, empty states | Với Designer |
| Thiết lập test infrastructure (widget tests) | Test cho mỗi component trong library | Solo |

#### Phase 2: Delivery Screens (Tuần 5-8)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| Menu Browser Screen | Category tabs + search + item grid/list + popularity badge | Với Designer (hi-fi) + BE Dev (`get-menu` API) |
| Cart Sheet (Bottom Sheet) | Items list + quantity stepper + subtotal + delivery fee + total + checkout CTA | Với Designer |
| Checkout / Order Confirmation | Payment method picker, address selection, coupon input, order summary | Với BE Dev (`create-delivery-order` API) |
| Delivery Zone Check UI | Map view showing delivery zone, fee calculator | Với BE Dev (`check-delivery-zone` API) |

#### Phase 3: Delivery Tracking + Đặt Bàn (Tuần 9-12)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| Order Tracking Screen | Status timeline + map pin (driver location) + ETA | Với BE Dev (Realtime subscription) |
| Driver Location Map | google_maps_flutter + Realtime broadcast integration | Với BE Dev (`update-driver-location`) |
| Rating / Review Screen | Star rating, tags, comment, bonus points display | Với BE Dev (`rate-delivery` API) |
| Đặt Bàn: Slot Picker | Branch picker + date + horizontal scroll time slots | Với Designer + BE Dev (`get-available-slots`) |
| Đặt Bàn: Reservation Form | Party size, special requests, confirmation | Với BE Dev (`create-reservation`) |
| Đặt Bàn: Reservation Detail | Code display (QR), status badge, cancel button | Với BE Dev (`cancel-reservation`) |

#### Phase 4: Polish (Tuần 13-16)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| Bug fixing từ QA (Delivery + Đặt Bàn) | Fix bugs từ QA report | Với 🆕 QA |
| Offline mode cho Delivery | Cache menu data, offline cart, sync when online | Với Sr. FE (architecture guidance) |
| Delivery push notifications UI | Order status change notifications, deep link to tracking | Với 🆕 DevOps (push infra) |
| E2E test support | Patrol tests cho Delivery + Đặt Bàn flows | Với 🆕 QA |

### 4.5 Back-End Developer — Task Delegation MỚI (Giảm Tải)

#### Phase 1: API & Database Foundation (Tuần 1-4)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| Database Schema Migration | Tạo tables: loyalty + delivery + reservation | Solo |
| RLS Policies | Viết policies cho tất cả bảng | Solo |
| Edge Function: Auth Setup | JWT verification, tenant/branch context | Solo |
| Edge Function: `verify-checkin` | QR decode, HMAC verify, GPS check, fraud detection | Với Sr. FE (payload format) |
| Edge Function: `earn-points` | Tính điểm, balance update, tier check | Solo |
| API Documentation | OpenAPI spec cho tất cả Edge Functions | Với FE team (contract review) |

*~~DevOps tasks~~* → Chuyển cho 🆕 DevOps Engineer

#### Phase 2: Core Business Logic (Tuần 5-8)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| Edge Function: `process-cashback` | Cashback calculation, wallet write | Solo |
| Edge Function: `get-loyalty-dashboard` | Aggregate data cho dashboard | Với Sr. FE (response shape) |
| Edge Function: `get-promotions` | Active promotions, eligibility check | Solo |
| Dynamic QR Generator | QR rotation mỗi 30 giây | Solo |
| CRM Integration Layer | Outbox pattern, sync worker, retry logic | Solo |

#### Phase 3: Delivery & Đặt Bàn APIs + Infrastructure (Tuần 9-12)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| Edge Function: `check-delivery-zone` | Zone calculation, fee tiers, branch matching | Với 🆕 Mid FE |
| Edge Function: `create-delivery-order` | Order creation, coupon validation, total calculation | Với 🆕 Mid FE |
| Edge Function: `update-delivery-status` + `update-driver-location` | Status machine, Realtime broadcast | Với 🆕 Mid FE |
| Edge Function: `get-available-slots` + `create-reservation` + `cancel-reservation` | Slot management, overbooking prevention | Với 🆕 Mid FE |
| CRM Sync Worker | pg_cron job, exponential backoff | Solo |
| Offline Sync Protocol | Conflict resolution rules, batch sync endpoint | Với Sr. FE |
| Rate Limiting & Security | Per-user rate limits, abuse detection | Solo |

*~~Push notification infrastructure~~* → Phối hợp với 🆕 DevOps (FCM/APNs setup)
*~~Database monitoring~~* → Chuyển cho 🆕 DevOps

#### Phase 4: Monitoring & Release (Tuần 13-16)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| CRM Reconciliation Tool | Admin endpoint Supabase ↔ CRM comparison | Solo |
| Security hardening | Final audit: injection, RLS bypass, token rotation | Với 🆕 DevOps |
| Production Readiness | Disaster recovery plan, runbook | Toàn team |

*~~Load testing~~* → Chuyển cho 🆕 QA + 🆕 DevOps
*~~Database monitoring dashboards~~* → Chuyển cho 🆕 DevOps

### 4.6 🆕 QA Engineer — Task Delegation

| Phase | Nhiệm vụ | Chi tiết |
|-------|----------|---------|
| **Sprint 0-1** (Tuần 1-4) | Test Strategy & Plan | Viết master test plan. Setup test devices (2 iOS: SE + 15, 3 Android: budget/mid/flagship). Tạo test case template trên Linear. Viết test cases cho Auth + Home + Check-in. |
| **Sprint 2-3** (Tuần 5-8) | Functional Testing | Test mỗi screen khi FE deliver. API testing (Postman collections cho toàn bộ Edge Functions). Regression test cuối mỗi sprint. Bug tracking + severity classification. |
| **Sprint 4-5** (Tuần 9-12) | Advanced Testing | Test Delivery flows (happy path + edge cases: out of zone, branch closed, payment fail). Test Đặt Bàn (slot race condition, cancellation). Offline mode testing (airplane mode, flaky network simulation). Push notification testing (foreground/background/killed state). |
| **Sprint 6-7** (Tuần 13-16) | Release Testing | Load testing: k6 scripts cho 1000 concurrent check-ins, 500 txn/min. Security testing: rate limiting, SQL injection attempt, XSS on inputs. Full regression (manual + Patrol automation). UAT coordination: 10 nhân viên test trên real devices. App Store compliance checklist. Sign-off report. |

### 4.7 🆕 DevOps Engineer — Task Delegation

| Phase | Nhiệm vụ | Chi tiết |
|-------|----------|---------|
| **Sprint 0-1** (Tuần 1-4) | CI/CD Foundation | GitHub Actions pipeline: lint → analyze → test → build (iOS + Android). Fastlane setup: `fastlane ios beta`, `fastlane android beta`. Firebase App Distribution: auto-distribute mỗi merge vào `develop`. Sentry integration: Flutter SDK + Edge Functions. Secrets management: GitHub encrypted secrets, Supabase service keys. |
| **Sprint 2-3** (Tuần 5-8) | Infrastructure | Staging environment trên Supabase (branch database). Edge Function deployment pipeline (auto-deploy on push). Database monitoring: pg_stat_statements dashboard, connection pool tuning, slow query alerts. Supabase Storage CDN config (avatar, banner caching). |
| **Sprint 4-5** (Tuần 9-12) | Advanced Infra | Shorebird (OTA code push): setup, test rollback scenario, canary deployment. PostHog analytics: integration + custom event dashboards. FCM/APNs push infrastructure: certificate management, topic subscriptions. Automated database backup verification. |
| **Sprint 6-7** (Tuần 13-16) | Production Readiness | Load testing infrastructure: k6 Cloud hoặc self-hosted, results dashboards. Production monitoring: uptime checks, error rate alerts, Slack/PagerDuty integration. App Store submission pipeline: auto-screenshot (fastlane snapshot), metadata upload. Disaster recovery: backup restore drill, failover documentation. Runbook: common incidents + resolution steps. |

---

## 5. Ceremonies & Communication — Team 6 Người

### 5.1 Updated Ceremonies

| Ceremony | Tần suất | Thời lượng | Ai tham gia | Thay đổi |
|----------|---------|-----------|-------------|----------|
| **Daily Standup** | Hằng ngày (9:00 SA) | 15 phút | Toàn team (6 người) | +3 người, vẫn 15 phút (2.5 phút/người) |
| **Sprint Planning** | Mỗi 2 tuần (Thứ 2) | 1.5 giờ | Toàn team | +30 phút (thêm Delivery + QA planning) |
| **Design Review** | Mỗi tuần (Thứ 4) | 30 phút | Designer + 2 FE + QA | +QA tham gia review testability |
| **API Contract Review** | Mỗi 2 tuần | 45 phút | 2 FE + BE + QA | QA review error cases + edge cases |
| **QA Sync** | Mỗi tuần (Thứ 3) | 30 phút | QA + 2 FE + BE | **MỚI** — bug triage, test status |
| **DevOps Sync** | Mỗi 2 tuần (Thứ 5) | 30 phút | DevOps + BE + Tech Lead | **MỚI** — infra status, alerts review |
| **Sprint Review + Retro** | Mỗi 2 tuần (Thứ 6) | 1.5 giờ | Toàn team | +30 phút (demo Delivery + QA report) |

### 5.2 Updated Communication Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Designer    │     │  Sr. FE      │     │  Back-End    │
│              │     │  (Mobile)    │     │              │
│ Figma        │────►│ Widgetbook   │◄────│ API Docs     │
│ (Design)     │     │ (Lead)       │     │ (OpenAPI)    │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                     │
       │              ┌─────┴──────┐              │
       │              │ 🆕 Mid FE   │              │
       │              │ (Delivery   │              │
       │              │  + Đặt Bàn) │              │
       │              └─────┬──────┘              │
       │                    │                     │
       │  ┌─────────────────┼─────────────────────┤
       │  │                 │                     │
       │  │          ┌──────┴──────┐              │
       │  │          │ 🆕 QA        │              │
       │  │          │ Test Reports │              │
       │  │          │ Bug Tracking │              │
       │  │          └──────┬──────┘              │
       │  │                 │                     │
       └──┼─────────────────┼─────────────────────┘
          │                 │
          │          ┌──────┴──────┐
          │          │ 🆕 DevOps    │
          │          │ CI/CD       │
          │          │ Monitoring  │
          │          └──────┬──────┘
          │                 │
          └────────┬────────┘
                   │
            ┌──────┴──────┐
            │   GitHub     │
            │   Linear     │
            │   Slack      │
            └─────────────┘
```

---

## 6. Onboarding Timeline

```
Tuần 0 (trước Sprint 0):
│
├── 🆕 Mid FE Flutter: Ký hợp đồng, setup máy, đọc tài liệu
├── 🆕 DevOps: Ký hợp đồng, access Supabase + GitHub + Firebase
└── 🆕 QA: Ký hợp đồng, đọc PRD + API Contract

Tuần 1-2 (Sprint 0):
│
├── 🆕 Mid FE Flutter:
│   ├── Ngày 1-2: Đọc Design_Tech_Workflow.md + API_Contract.md
│   ├── Ngày 3-5: Pair programming với Sr. FE (build 2-3 components)
│   ├── Tuần 2: Build 5 components solo, Sr. FE review
│   └── Output: Hiểu project conventions, có first PR merged
│
├── 🆕 DevOps:
│   ├── Ngày 1-2: Audit existing Supabase project + GitHub repo
│   ├── Ngày 3-5: Setup GitHub Actions (lint + test + build)
│   ├── Tuần 2: Fastlane + Firebase App Distribution + Sentry
│   └── Output: CI/CD pipeline running, first auto-build successful
│
└── 🆕 QA:
    ├── Ngày 1-3: Đọc toàn bộ tài liệu, hiểu business logic
    ├── Ngày 4-5: Setup test devices, install tools (Postman, Linear)
    ├── Tuần 2: Viết Test Plan + test cases cho Sprint 1 (Auth + Home)
    └── Output: Test Plan v1 approved, test cases cho 2 modules đầu tiên
```

---

## 7. Tóm Tắt — Quyết Định

| # | Vị trí | Ưu tiên | Lý do #1 | Onboard lý tưởng |
|---|--------|---------|----------|-------------------|
| 1 | 🆕 **Mid Flutter Developer** | 🔴 CRITICAL | Không tuyển = cắt Delivery + Đặt Bàn, hoặc trễ 4-6 tuần | Tuần 1 |
| 2 | 🆕 **QA Engineer** | 🔴 CRITICAL | Không tuyển = bugs lọt production, mất khách hàng | Tuần 3 (khi có screens) |
| 3 | 🆕 **DevOps Engineer** | 🟡 HIGH | Không tuyển = BE kiêm nhiệm quá tải, CI/CD fragile | Tuần 1 |

> **Khuyến nghị của Tech Lead:** Tuyển cả 3 vị trí. Nếu budget chỉ cho phép 2, ưu tiên **Mid Flutter Dev** + **QA Engineer**. DevOps có thể để BE Dev kiêm thêm 1-2 sprint đầu rồi tuyển sau, nhưng sẽ tạo technical debt.

---

*Đề xuất v1.0 · Ngày tạo: 2026-03-08 · Tech Lead Review*
