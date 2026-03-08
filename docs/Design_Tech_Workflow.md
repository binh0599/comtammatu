# Bản Thiết Kế Công Nghệ & Quy Trình Phối Hợp — Cơm Tấm Má Tư Mobile App

> **Lead Technology Document**
> Đội ngũ: 1 Senior UI/UX Designer · 1 Senior Front-End Developer (Mobile) · 1 Back-End Developer
> Ngày tạo: 2026-03-08 · Cập nhật: 2026-03-08 (v1.1 — Framework Evaluation + Delivery & Đặt Bàn)

---

## Mục Lục

0. [Framework Evaluation — Đánh Giá Framework (Performance & UX Focus)](#0-framework-evaluation--đánh-giá-framework)
1. [Architecture Design — Kiến Trúc Hệ Thống & Tích Hợp](#1-architecture-design--kiến-trúc-hệ-thống--tích-hợp)
2. [Tech Stack & Collaboration Tools — Công Nghệ & Công Cụ](#2-tech-stack--collaboration-tools--công-nghệ--công-cụ)
3. [Technical & UX Challenges — Thách Thức & Giải Pháp](#3-technical--ux-challenges--thách-thức--giải-pháp)
4. [Task Delegation & Workflow — Phân Bổ Công Việc & Quy Trình](#4-task-delegation--workflow--phân-bổ-công-việc--quy-trình)
5. [Tính Năng Bổ Sung: Giao Hàng & Đặt Bàn](#5-tính-năng-bổ-sung-giao-hàng--đặt-bàn)

---

## 0. Framework Evaluation — Đánh Giá Framework

> **Tiêu chí đánh giá ưu tiên:** Hiệu năng (Performance) và Trải nghiệm người dùng (UX) là chính.
> Các yếu tố phụ: tốc độ phát triển, khả năng bảo trì, phù hợp team.

### 0.1 Các Khoảnh Khắc UX Quyết Định (Critical UX Moments)

Trước khi so sánh framework, cần xác định **chính xác chỗ nào** hiệu năng ảnh hưởng trực tiếp đến trải nghiệm người dùng trong app Cơm Tấm Má Tư:

| Khoảnh khắc UX | Yêu cầu hiệu năng | Tầm quan trọng |
|----------------|-------------------|----------------|
| **Cold Start** — Mở app để check-in/đặt hàng | < 1.5 giây từ tap icon → màn hình Home interactive | **Rất cao** — Khách hàng mở app khi đang xếp hàng |
| **Camera QR Launch** — Mở camera quét QR check-in | < 500ms từ tap nút → camera sẵn sàng | **Rất cao** — "Zero-friction" check-in |
| **Animations** — Check-in celebration, tier upgrade, point counter | 60fps nhất quán, không drop frame | **Cao** — Tạo cảm xúc thích thú, gamification |
| **Scroll Performance** — Danh sách giao dịch, menu món ăn, đơn giao hàng | 60fps, lazy loading, không jank | **Cao** — Dùng hằng ngày |
| **Map & Delivery Tracking** — Bản đồ giao hàng real-time | Smooth panning/zooming, marker updates mượt | **Cao** — Trải nghiệm giao hàng |
| **Haptic Feedback** — Phản hồi xúc giác khi check-in, thanh toán | Native-quality haptics, không delay | **Trung bình** — Tăng premium feel |
| **Background Geofencing** — Tự động check-in khi đến gần quán | Tiêu thụ pin thấp, trigger chính xác | **Trung bình** — Nice-to-have |
| **Push Notification** — Trạng thái đơn hàng, giao hàng, khuyến mãi | Đáng tin cậy, deep link chính xác | **Cao** — Giao hàng cần real-time updates |

### 0.2 Bốn Ứng Viên Framework

| # | Framework | Ngôn ngữ | Rendering |
|---|-----------|---------|-----------|
| A | **Flutter 3.x** (Impeller) | Dart | Skia/Impeller — tự vẽ mọi pixel |
| B | **React Native 0.79+** (New Architecture) | TypeScript/JSX | Native views qua Fabric + JSI |
| C | **Native** (Swift/SwiftUI + Kotlin/Compose) | Swift + Kotlin | Platform-native 100% |
| D | **Kotlin Multiplatform (KMP)** + Native UI | Kotlin (shared) + Swift (UI) | Platform-native UI |

### 0.3 Benchmark So Sánh — Các Chỉ Số Thực Tế

#### A. Cold Start Time (Thời gian khởi động lạnh)

```
Thời gian từ tap icon → màn hình đầu tiên interactive
Thiết bị test baseline: iPhone 13 / Samsung Galaxy S22

Native (SwiftUI)     ████████░░░░░░░░░░░░  ~350-500ms
Native (Compose)     █████████░░░░░░░░░░░  ~400-550ms
Flutter (Impeller)   ██████████░░░░░░░░░░  ~500-700ms   (+150-200ms Dart VM init)
React Native (New)   ███████████░░░░░░░░░  ~600-900ms   (+250-400ms JS engine init)
React Native (Expo)  ████████████░░░░░░░░  ~700-1100ms  (+100-200ms Expo runtime)

                     0ms       500ms      1000ms     1500ms
```

| Framework | iPhone 13 | Galaxy S22 | Budget Android (2GB RAM) | Ghi chú |
|-----------|-----------|-----------|--------------------------|---------|
| **Native** | ~400ms | ~500ms | ~800-1000ms | Baseline tốt nhất |
| **Flutter** | ~550ms | ~650ms | ~1000-1300ms | Dart VM init, nhưng ổn định |
| **React Native (New Arch)** | ~700ms | ~850ms | ~1300-1800ms | Hermes engine giúp giảm đáng kể |
| **React Native (Expo)** | ~800ms | ~1000ms | ~1500-2200ms | Expo runtime overhead |

**Kết luận Cold Start:** Trên flagship devices, cả 4 đều < 1.5 giây — chấp nhận được. Trên **budget Android** (phổ biến tại Việt Nam), React Native + Expo có thể vượt 2 giây — **đây là rủi ro thực tế**.

#### B. Camera QR Launch (Thời gian mở camera)

| Framework | Cách tiếp cận | Thời gian | Ghi chú |
|-----------|--------------|-----------|---------|
| **Native** | AVCaptureSession / CameraX trực tiếp | ~200-300ms | Nhanh nhất, control hoàn toàn |
| **Flutter** | `camera` plugin + `mobile_scanner` | ~300-500ms | Plugin gọi native, overhead nhỏ |
| **React Native** | `expo-camera` / `react-native-vision-camera` | ~400-700ms | JS bridge + native camera init |

**Ghi chú quan trọng:** `react-native-vision-camera` v4 (by Marc Rousavy) sử dụng JSI trực tiếp, gần như ngang native (~300-400ms). Nhưng **expo-camera** (managed) chậm hơn đáng kể (~500-700ms).

**Kỹ thuật Pre-warm Camera (áp dụng cho mọi framework):**
```
App vào foreground → init camera session ẩn → user tap "Quét QR" → camera đã sẵn sàng
Kết quả: Giảm perceived time xuống ~100-200ms cho mọi framework
```

#### C. Animation Performance (60fps Test)

| Loại animation | Native | Flutter | React Native |
|---------------|--------|---------|-------------|
| **Page transitions** | 60fps ✅ | 60fps ✅ | 60fps ✅ (Reanimated 3 trên UI thread) |
| **Scroll + header collapse** | 60fps ✅ | 60fps ✅ | 55-60fps ⚠️ (phụ thuộc implementation) |
| **Lottie animations** | 60fps ✅ | 60fps ✅ (rive tốt hơn) | 55-60fps ⚠️ (lottie-react-native qua bridge) |
| **Particle effects** (check-in celebration) | 60fps ✅ | 60fps ✅ (Impeller xuất sắc) | 40-55fps ⚠️ (cần Skia via react-native-skia) |
| **Animated counter** (điểm tăng) | 60fps ✅ | 60fps ✅ | 60fps ✅ (Reanimated shared values) |
| **Map marker animation** | 60fps ✅ | 55-60fps ⚠️ (platform view) | 55-60fps ⚠️ (native map view) |
| **Glassmorphism/Blur** | 60fps ✅ | 50-55fps ⚠️ (BackdropFilter tốn GPU) | 55-60fps ⚠️ |

**Kết luận Animation:**
- **Native** luôn 60fps — không bàn cãi
- **Flutter** 60fps hầu hết case, Impeller engine xử lý particle/complex animation tốt hơn RN
- **React Native** 60fps cho basic animations (Reanimated 3), nhưng **particle effects và complex compositions thường drop frame**

#### D. Binary Size (Kích thước cài đặt)

| Framework | Minimum app size | App Cơm Tấm Má Tư (ước tính) | Ghi chú |
|-----------|-----------------|-------------------------------|---------|
| **Native iOS** | ~3-5MB | ~15-25MB | Nhỏ nhất |
| **Native Android** | ~3-5MB | ~12-20MB | Nhỏ nhất |
| **Flutter** | ~15-18MB | ~30-45MB | Dart runtime + Skia engine |
| **React Native** | ~10-12MB | ~25-40MB | Hermes engine + native modules |
| **React Native + Expo** | ~15-20MB | ~35-55MB | Expo runtime + prebuild modules |

**Context Việt Nam:** Nhiều khách hàng dùng Android giá rẻ (32-64GB storage). App 50MB+ có thể bị cân nhắc trước khi cài. App < 30MB là lý tưởng.

#### E. Supabase SDK & Ecosystem

| Framework | SDK | Mức độ trưởng thành | Realtime | Auth |
|-----------|-----|---------------------|----------|------|
| **React Native** | `@supabase/supabase-js` (JS SDK) | ⭐⭐⭐⭐⭐ Rất trưởng thành | ✅ Đầy đủ | ✅ Token-based |
| **Flutter** | `supabase_flutter` (Dart SDK) | ⭐⭐⭐⭐ Trưởng thành, ít edge case hơn JS | ✅ Đầy đủ | ✅ Token-based |
| **Native iOS** | `supabase-swift` | ⭐⭐⭐ Đủ dùng, community nhỏ hơn | ✅ Có | ✅ Có |
| **Native Android** | `supabase-kt` | ⭐⭐⭐ Đủ dùng, community nhỏ hơn | ✅ Có | ✅ Có |

**Ghi chú:** Supabase JS SDK là SDK chính thức, có features đầy đủ nhất và được support tốt nhất. Dart SDK đứng thứ 2. Swift/Kotlin SDK ít mature hơn.

#### F. Khả Năng Tích Hợp Bản Đồ (Map — cho Delivery & Đặt Bàn)

| Framework | Map Library | Performance | Ghi chú |
|-----------|------------|-------------|---------|
| **Native** | Apple MapKit / Google Maps SDK | 60fps, tốt nhất | Full native API |
| **Flutter** | `google_maps_flutter` (platform view) | 50-60fps, occasional jank khi scroll | Platform view overhead |
| **React Native** | `react-native-maps` | 50-60fps, tương tự Flutter | Native map view qua bridge |

### 0.4 Ma Trận Đánh Giá Tổng Hợp

> Thang điểm: 1-10 (10 = tốt nhất). **Trọng số** phản ánh ưu tiên "hiệu năng & UX là chính".

| Tiêu chí | Trọng số | Native | Flutter | React Native (New Arch) | RN + Expo |
|----------|---------|--------|---------|------------------------|-----------|
| **Cold Start** | 15% | 10 | 8 | 7 | 6 |
| **Camera/QR Speed** | 15% | 10 | 8 | 7 (vision-camera) | 6 (expo-camera) |
| **Animation 60fps** | 15% | 10 | 9 | 7 | 7 |
| **Scroll Performance** | 10% | 10 | 9 | 8 | 8 |
| **Map/Delivery UX** | 10% | 10 | 7 | 7 | 7 |
| **Haptic Feedback** | 5% | 10 | 8 | 7 | 6 |
| **Binary Size** | 5% | 10 | 6 | 7 | 5 |
| **Platform Native Feel** | 10% | 10 | 7 | 8 | 8 |
| **Supabase SDK** | 5% | 7 | 8 | 10 | 10 |
| **1-dev cho 2 platform** | 5% | 2 | 9 | 9 | 10 |
| **Time-to-market** | 5% | 3 | 8 | 8 | 9 |
| | | | | | |
| **TỔNG (có trọng số)** | **100%** | **8.65** | **8.05** | **7.45** | **6.95** |

### 0.5 Phân Tích Ưu Nhược Điểm Từng Phương Án

#### Phương án A: Flutter 3.x + Impeller — ⭐ KHUYẾN NGHỊ CHO PERFORMANCE + UX

```
✅ ƯU ĐIỂM                              ❌ NHƯỢC ĐIỂM
─────────────────────────────            ─────────────────────────────
+ Impeller engine: animation             - Team phải học Dart (2-3 tuần)
  60fps nhất quán, particle                 nhưng cú pháp giống TS ~70%
  effects mượt mà
                                         - Supabase Dart SDK ít mature
+ 1 codebase, 2 platform                   hơn JS SDK (nhưng đủ dùng)
  (phù hợp team 1 FE dev)
                                         - Binary size lớn hơn native
+ Cold start tốt hơn RN                    (~35-45MB)
  (~550ms vs ~800ms trên flagship)
                                         - Map dùng Platform View
+ QR scanning nhanh                         (occasional jank khi
  (mobile_scanner ~300ms)                   embed map trong list)

+ Widget system mạnh:                    - Không OTA update JS bundle
  mọi pixel do Flutter render               (phải qua App Store/Play Store)
  → kiểm soát UX hoàn toàn                 Nhưng: Shorebird.dev hỗ trợ
                                            code push cho Flutter
+ Hot reload xuất sắc
  (nhanh hơn RN Fast Refresh)            - Ecosystem nhỏ hơn React

+ Rive animations (tốt hơn Lottie)      - Không share knowledge với
  cho check-in celebration                  web CRM (React/Next.js)
```

#### Phương án B: React Native 0.79+ (New Architecture, KHÔNG Expo) — Cân Bằng Tốt

```
✅ ƯU ĐIỂM                              ❌ NHƯỢC ĐIỂM
─────────────────────────────            ─────────────────────────────
+ React/TS ecosystem: team               - Animation phức tạp (particle)
  đã dùng React cho web CRM                có thể drop frame
  → share kiến thức, Zod schemas
                                         - Cold start chậm hơn Flutter
+ JSI (New Architecture):                   (~700ms vs ~550ms)
  bridge overhead gần như loại bỏ
                                         - Camera init chậm hơn
+ react-native-vision-camera v4:            (trừ khi dùng vision-camera
  QR scan gần bằng native                   thay vì expo-camera)

+ Supabase JS SDK: tốt nhất,            - Cấu hình native phức tạp hơn
  đầy đủ nhất                               Expo (nhưng kiểm soát tốt hơn)

+ OTA update qua CodePush               - Debugging đôi khi khó
  (update JS bundle không qua               (lỗi native + JS mixed)
   App Store → fix nhanh)

+ Reanimated 3: 60fps cho               - Binary vẫn lớn hơn native
  hầu hết animations                       (~25-40MB)

+ react-native-skia: Skia trực tiếp
  cho complex animations (particle)
```

#### Phương án C: Native (Swift + Kotlin) — Tốt Nhất Cho UX, Nhưng...

```
✅ ƯU ĐIỂM                              ❌ NHƯỢC ĐIỂM
─────────────────────────────            ─────────────────────────────
+ Hiệu năng tốt nhất mọi tiêu chí      - CẦN 2 DEVELOPER cho 2 platform
+ Native feel hoàn hảo                     (team hiện có 1 FE dev)
+ Binary size nhỏ nhất                   - 2x codebase, 2x maintenance
+ Camera, haptic, map: best-in-class     - 2x Design System implementation
+ Cold start nhanh nhất                  - Time-to-market chậm nhất
+ Apple/Google luôn support tốt nhất     - Supabase SDK ít mature nhất
```

**Kết luận Native:** Nếu ưu tiên tuyệt đối hiệu năng, native là king. Nhưng với **1 FE developer**, native cho cả iOS + Android là **không khả thi** trong timeline 16 tuần. Trừ khi: chỉ ship 1 platform trước (recommend iOS trước vì khách hàng Việt Nam chi tiêu F&B trên iOS thường cao hơn).

#### Phương án D: KMP (Kotlin Multiplatform) + Native UI

```
✅ ƯU ĐIỂM                              ❌ NHƯỢC ĐIỂM
─────────────────────────────            ─────────────────────────────
+ Share business logic (Kotlin)          - Vẫn cần viết UI riêng
  giữa iOS + Android                      (SwiftUI + Compose)
+ Native UI trên mỗi platform           - Team cần biết cả Kotlin + Swift
+ Kiểm soát hoàn toàn performance       - Tooling chưa mature bằng
+ Supabase-kt cho shared network           Flutter/RN (đặc biệt trên iOS)
                                         - IDE: cần cả Android Studio
                                            + Xcode
                                         - Hệ sinh thái nhỏ nhất
```

**Kết luận KMP:** Phù hợp nếu team có strong Kotlin background. Với team hiện tại (React/TS web), learning curve quá cao.

### 0.6 Khuyến Nghị Cuối Cùng — Theo Thứ Tự Ưu Tiên

#### 🥇 Khuyến Nghị #1: Flutter 3.x + Impeller (Nếu Ưu Tiên Performance + UX)

**Lý do cốt lõi:** Flutter cho hiệu năng gần native nhất trong các cross-platform framework, đặc biệt:
- Impeller engine: animation celebration khi check-in, tier upgrade sẽ **luôn 60fps**
- Cold start nhanh hơn RN ~200ms — quan trọng khi khách mở app tại quầy
- QR scanning nhanh hơn RN ~150ms
- Widget system cho phép custom UI pixel-perfect — Designer kiểm soát hoàn toàn
- Dart có null safety, type system mạnh, cú pháp gần TypeScript

**Trade-off chấp nhận được:**
- Team mất 2-3 tuần học Dart (nhưng Dart syntax ~70% giống TypeScript)
- Không share code trực tiếp với web CRM (nhưng share Design Tokens, API contracts)
- Binary size ~35-45MB (chấp nhận được cho loyalty app)

**Chiến lược giảm thiểu rủi ro:**
- Tuần 1-2: FE Developer tập trung học Dart + Flutter qua project nhỏ
- Dùng `supabase_flutter` SDK (đủ mature cho use case này)
- Dùng Rive thay Lottie (native Flutter, performance tốt hơn)

#### 🥈 Khuyến Nghị #2: React Native 0.79+ Bare (KHÔNG Expo) (Nếu Ưu Tiên Ecosystem + Tốc Độ Dev)

**Khi nào chọn RN thay Flutter:**
- FE Developer đã có kinh nghiệm React Native
- Muốn share Zod schemas, types, utilities với web CRM
- Cần OTA updates (CodePush) — rất hữu ích cho fix nhanh sau release
- Supabase JS SDK là critical requirement

**Bắt buộc nếu chọn RN (để đảm bảo perf):**
- ✅ Bật New Architecture (Fabric + JSI) — **không optional**
- ✅ Dùng `react-native-vision-camera` v4 (KHÔNG dùng expo-camera)
- ✅ Dùng `react-native-reanimated` v3 cho MỌI animation
- ✅ Dùng `react-native-skia` cho particle effects (check-in celebration)
- ✅ Dùng `FlashList` thay `FlatList` cho danh sách dài
- ✅ Dùng Hermes engine (đã default từ RN 0.79)
- ❌ KHÔNG dùng Expo managed workflow (overhead quá lớn cho perf-focused app)

#### ❌ Không Khuyến Nghị: React Native + Expo Managed

**Lý do loại bỏ (so với bản v1.0 trước đó):**

| Vấn đề | Chi tiết | Ảnh hưởng UX |
|--------|---------|-------------|
| Cold start | +200-400ms so với RN Bare | Khách chờ lâu hơn khi mở app tại quầy |
| Camera | expo-camera chậm hơn vision-camera ~200ms | Check-in không đạt "zero-friction" |
| Binary size | 35-55MB (Expo runtime overhead) | Budget Android e ngại cài đặt |
| Animation ceiling | Không access trực tiếp react-native-skia | Particle effects celebration kém |
| Native module control | Giới hạn bởi Expo SDK | Không custom được haptic patterns |

**Expo phù hợp cho:** MVP nhanh, prototype, app không yêu cầu performance cao. **Không phù hợp** khi "tối ưu hiệu năng và UX là chính".

### 0.7 Cập Nhật Tech Stack Theo Khuyến Nghị

#### Nếu Chọn Flutter (Khuyến Nghị #1):

| Thành phần | Lựa chọn | Thay thế cho |
|-----------|----------|-------------|
| **Framework** | Flutter 3.x + Impeller | React Native + Expo |
| **Navigation** | GoRouter (declarative) | Expo Router |
| **State Management** | Riverpod 2 + Dio | Zustand + TanStack Query |
| **UI Framework** | Material 3 + custom theme từ Design Tokens | NativeWind |
| **Offline Database** | Drift (SQLite wrapper cho Dart) | WatermelonDB |
| **Animations** | Rive + Flutter implicit/explicit animations | Reanimated 3 |
| **QR Scanner** | `mobile_scanner` | expo-camera |
| **Geolocation** | `geolocator` + `flutter_background_geolocation` | expo-location |
| **Map** | `google_maps_flutter` + `flutter_polyline_points` | react-native-maps |
| **Push** | `firebase_messaging` | expo-notifications |
| **Testing** | Flutter test + integration_test + Patrol (E2E) | Jest + Detox |
| **CI/CD** | Fastlane + GitHub Actions + Firebase App Distribution | EAS Build |
| **Code Push** | Shorebird.dev (OTA updates cho Flutter) | Expo OTA |

#### Nếu Chọn React Native Bare (Khuyến Nghị #2):

| Thành phần | Lựa chọn | Thay đổi so với v1.0 |
|-----------|----------|---------------------|
| **Framework** | React Native 0.79+ (New Arch ON) | Bỏ Expo managed |
| **Camera** | `react-native-vision-camera` v4 | Thay expo-camera |
| **Animation** | Reanimated 3 + `react-native-skia` | Thêm Skia cho particle |
| **List** | `@shopify/flash-list` | Thay FlatList |
| **Map** | `react-native-maps` + `@mapbox/polyline` | Mới (cho delivery) |
| **Code Push** | `react-native-code-push` (AppCenter) | Thay Expo OTA |
| **Build** | Fastlane + GitHub Actions | Thay EAS Build |
| Còn lại | Giữ nguyên (Zustand, TanStack Query, WatermelonDB) | — |

---

## 1. Architecture Design — Kiến Trúc Hệ Thống & Tích Hợp

### 1.1 Mô Hình Kiến Trúc Tổng Thể (High-Level Architecture)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MOBILE APP LAYER                             │
│  ┌──────────────────┐  ┌──────────────────┐                        │
│  │   iOS App         │  │   Android App     │                        │
│  │ React Native +    │  │ React Native +    │                        │
│  │ Expo              │  │ Expo              │                        │
│  │                   │  │                   │                        │
│  │ ┌───────────────┐ │  │ ┌───────────────┐ │                        │
│  │ │ UI Layer      │ │  │ │ UI Layer      │ │  ← Design System       │
│  │ │ (React Native │ │  │ │ (React Native │ │    Components          │
│  │ │  Components)  │ │  │ │  Components)  │ │                        │
│  │ ├───────────────┤ │  │ ├───────────────┤ │                        │
│  │ │ State Mgmt    │ │  │ │ State Mgmt    │ │  ← Zustand + React    │
│  │ │ (Zustand +    │ │  │ │ (Zustand +    │ │    Query               │
│  │ │  TanStack     │ │  │ │  TanStack     │ │                        │
│  │ │  Query)       │ │  │ │  Query)       │ │                        │
│  │ ├───────────────┤ │  │ ├───────────────┤ │                        │
│  │ │ Offline Layer │ │  │ │ Offline Layer │ │  ← WatermelonDB        │
│  │ │ (WatermelonDB)│ │  │ │ (WatermelonDB)│ │                        │
│  │ └───────────────┘ │  │ └───────────────┘ │                        │
│  └────────┬─────────┘  └────────┬─────────┘                        │
│           │                      │                                   │
│           └──────────┬───────────┘                                   │
│                      │                                               │
└──────────────────────┼───────────────────────────────────────────────┘
                       │ HTTPS / WSS
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     BACKEND / API LAYER                               │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │              Supabase Platform                               │     │
│  │                                                             │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │     │
│  │  │  Supabase     │  │  Edge         │  │  Realtime        │   │     │
│  │  │  Auth (JWT)   │  │  Functions    │  │  (WebSocket)     │   │     │
│  │  │              │  │  (Deno/TS)    │  │                  │   │     │
│  │  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │     │
│  │         │                  │                    │             │     │
│  │         ▼                  ▼                    ▼             │     │
│  │  ┌──────────────────────────────────────────────────────┐    │     │
│  │  │            PostgreSQL + RLS Policies                  │    │     │
│  │  │     (project: zrlriuednoaqrsvnjjyo)                   │    │     │
│  │  └──────────────────────┬───────────────────────────────┘    │     │
│  │                         │                                    │     │
│  └─────────────────────────┼────────────────────────────────────┘     │
│                            │                                          │
└────────────────────────────┼──────────────────────────────────────────┘
                             │ Database Webhooks / Edge Functions
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    CRM INTEGRATION LAYER                              │
│                                                                      │
│  ┌──────────────────────┐       ┌──────────────────────────────┐     │
│  │  Cơm Tấm Má Tư CRM  │◄─────│  Sync Service                 │     │
│  │  (Hệ thống hiện có)  │      │  (Edge Function: crm-sync)    │     │
│  │                      │─────►│  - Webhook listener            │     │
│  │  - Khách hàng        │      │  - Event queue (pg_notify)     │     │
│  │  - Giao dịch         │      │  - Retry with backoff          │     │
│  │  - Điểm thưởng       │      │  - Conflict resolution         │     │
│  │  - Hạng thành viên   │      │                                │     │
│  └──────────────────────┘       └──────────────────────────────┘     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.2 Luồng Dữ Liệu (Data Flow)

#### A. Luồng Tích Điểm Khi Mua Hàng (Point Accumulation Flow)

```
Khách hàng thanh toán tại quầy
        │
        ▼
┌─────────────────────┐
│ Cashier App / POS    │  ① Tạo giao dịch thanh toán
│ (processPayment)     │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Edge Function:       │  ② Xác thực giao dịch + tính điểm
│ process-payment      │     points = floor(amount / 10000)
│                      │  ③ Ghi đồng thời:
│ BEGIN TRANSACTION    │     - payment_transactions
│   INSERT payment     │     - loyalty_points (credit)
│   INSERT points      │     - loyalty_balance (update)
│   UPDATE member tier │  ④ Kiểm tra nâng hạng
│ COMMIT               │
└────────┬────────────┘
         │
         ├──── pg_notify('point_earned') ────► Realtime → Mobile App cập nhật UI
         │
         └──── Database Webhook ────► Edge Function: crm-sync
                                              │
                                              ▼
                                     ┌──────────────────┐
                                     │ CRM API           │
                                     │ POST /points      │
                                     │ POST /transactions │
                                     └──────────────────┘
```

#### B. Luồng Check-in Tại Quán (Check-in Flow)

```
Khách hàng mở App
        │
        ▼
┌─────────────────────┐
│ Mobile App           │  ① Quét QR code tại quán HOẶC
│ Check-in Screen      │     Phát hiện vị trí (Geofencing)
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Edge Function:       │  ② Xác thực check-in:
│ verify-checkin       │     - Decode QR → branch_id + timestamp + HMAC
│                      │     - HOẶC: Verify GPS within 100m radius
│                      │     - Anti-fraud: throttle 1 check-in/branch/day
│                      │     - Anti-fraud: device fingerprint check
│                      │  ③ Ghi checkin record + thưởng điểm
└────────┬────────────┘
         │
         ├──── Realtime → Mobile App hiển thị "Check-in thành công! +X điểm"
         │
         └──── crm-sync → CRM cập nhật lịch sử check-in
```

#### C. Luồng Cashback (Cashback Flow)

```
Khách hàng đủ điều kiện khuyến mãi
        │
        ▼
┌─────────────────────┐
│ Edge Function:       │  ① Sau khi thanh toán, kiểm tra chương trình
│ process-cashback     │     cashback đang hoạt động
│                      │  ② Tính cashback theo rule:
│                      │     - % theo hạng thành viên
│                      │     - Tối đa theo chương trình
│                      │  ③ Ghi vào ví điểm (wallet_balance)
└────────┬────────────┘
         │
         ├──── Push notification → "Bạn được hoàn X điểm!"
         │
         └──── crm-sync → CRM ghi nhận cashback
```

### 1.3 Xử Lý Tính Nhất Quán Dữ Liệu (Data Consistency)

| Chiến lược | Áp dụng cho | Chi tiết |
|------------|-------------|----------|
| **Database Transaction** | Tích điểm, thanh toán, cashback | Dùng `BEGIN...COMMIT` trong Edge Function. Nếu bất kỳ bước nào thất bại → rollback toàn bộ |
| **Eventual Consistency** | Đồng bộ CRM | App → Supabase DB (source of truth) → async sync → CRM. CRM không bao giờ là source of truth cho mobile data |
| **Idempotency Keys** | Mọi write operation | Mỗi request mang `idempotency_key` (UUID v7). Edge Function check trùng trước khi xử lý. Tránh duplicate khi retry |
| **Optimistic Locking** | Cập nhật điểm, ví | Dùng `version` column. `UPDATE ... WHERE version = $expected_version`. Nếu conflict → client retry với data mới |
| **Outbox Pattern** | CRM sync | Ghi event vào bảng `sync_outbox` cùng transaction chính. Background worker đọc outbox → gửi CRM → mark processed |

#### Quy tắc Source of Truth

```
                    Source of Truth
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
    ▼                    ▼                    ▼
Supabase DB         Supabase DB          CRM (chỉ đọc)
(Điểm thưởng)      (Giao dịch)          (Báo cáo tổng hợp)
    │                    │                    ▲
    │                    │                    │
    └────────────────────┴──── sync ──────────┘
```

**Nguyên tắc:** Supabase PostgreSQL là nguồn sự thật duy nhất (Single Source of Truth). CRM nhận dữ liệu qua sync và chỉ dùng cho mục đích báo cáo/phân tích. Nếu có conflict → Supabase wins.

---

## 2. Tech Stack & Collaboration Tools — Công Nghệ & Công Cụ

### 2.1 Design & Handoff — Quy Trình Thiết Kế Đến Code

| Công cụ | Mục đích | Lý do chọn |
|---------|---------|-------------|
| **Figma** | UI/UX Design chính | Industry standard, real-time collaboration, Dev Mode cho handoff |
| **Figma Variables** | Design Tokens (colors, spacing, typography) | Đồng bộ trực tiếp với code tokens, single source of truth cho visual design |
| **Figma Auto Layout** | Responsive design | Map 1:1 với Flexbox trong React Native |
| **Storybook (React Native Web)** | Component Library documentation | Designer review components trực tiếp trên browser, đảm bảo design-code parity |

#### Quy trình Design-to-Code (Design Handoff Pipeline)

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│  1. DESIGN   │     │  2. TOKENS    │     │  3. BUILD      │     │  4. REVIEW    │
│              │     │              │     │               │     │              │
│ Figma        │────►│ Figma        │────►│ Front-End     │────►│ Designer     │
│ Components   │     │ Variables    │     │ implements    │     │ reviews on   │
│ + Prototype  │     │ exported as  │     │ components    │     │ Storybook +  │
│              │     │ JSON tokens  │     │ in React      │     │ Device       │
│              │     │              │     │ Native        │     │              │
└─────────────┘     └──────────────┘     └───────────────┘     └──────────────┘
       │                    │                     │                     │
       │                    │                     │                     │
       ▼                    ▼                     ▼                     ▼
  Figma File           tokens.json          Component         Approved ✓
  (Auto Layout,        (colors,             Library           hoặc
   Components,          spacing,             (Storybook)       Feedback →
   Variants)            typography,                            Iterate
                        border-radius)
```

#### Design Tokens — Cấu Trúc

```json
{
  "colors": {
    "primary": {
      "50": "#FFF8E1",
      "100": "#FFECB3",
      "500": "#FF9800",
      "600": "#FB8C00",
      "700": "#F57C00",
      "900": "#E65100"
    },
    "loyalty": {
      "bronze": "#CD7F32",
      "silver": "#C0C0C0",
      "gold": "#FFD700",
      "diamond": "#B9F2FF"
    },
    "semantic": {
      "success": "#4CAF50",
      "warning": "#FF9800",
      "error": "#F44336",
      "info": "#2196F3"
    }
  },
  "spacing": {
    "xs": 4,
    "sm": 8,
    "md": 16,
    "lg": 24,
    "xl": 32,
    "2xl": 48
  },
  "typography": {
    "heading1": { "fontSize": 28, "fontWeight": "700", "lineHeight": 36 },
    "heading2": { "fontSize": 22, "fontWeight": "600", "lineHeight": 28 },
    "body": { "fontSize": 16, "fontWeight": "400", "lineHeight": 24 },
    "caption": { "fontSize": 12, "fontWeight": "400", "lineHeight": 16 }
  },
  "borderRadius": {
    "sm": 4,
    "md": 8,
    "lg": 12,
    "xl": 16,
    "full": 9999
  }
}
```

### 2.2 Front-End (Mobile)

| Thành phần | Lựa chọn | Lý do |
|-----------|----------|-------|
| **Framework** | **React Native 0.79 + Expo SDK 52** | 1 codebase cho iOS + Android, phù hợp team có 1 Senior FE. Expo giảm cấu hình native. Hệ sinh thái React quen thuộc nếu team đã dùng React web |
| **Navigation** | Expo Router (file-based) | Tương tự Next.js App Router mà team đã quen |
| **State Management** | Zustand + TanStack Query v5 | Zustand cho client state, TanStack Query cho server state + caching |
| **UI Framework** | Tamagui hoặc NativeWind (Tailwind cho RN) | Đồng bộ Design Tokens dễ dàng. NativeWind nếu team thích Tailwind (đã dùng trong web) |
| **Offline Database** | WatermelonDB | Hiệu suất cao cho offline-first, lazy loading, sync primitives tích hợp |
| **Animations** | React Native Reanimated 3 | Animations mượt chạy trên UI thread (check-in celebration, tier upgrade) |
| **QR Scanner** | expo-camera + expo-barcode-scanner | Tích hợp sẵn trong Expo, không cần native module bên ngoài |
| **Geolocation** | expo-location | Geofencing cho check-in tại quán |
| **Push Notifications** | expo-notifications + FCM/APNs | Managed workflow, Expo Push Service đơn giản hóa setup |
| **Testing** | Jest + React Native Testing Library + Detox (E2E) | Đầy đủ unit → integration → E2E |

#### Lý Do Chọn React Native Thay Vì Native (Swift/Kotlin)

Dựa trên team composition (1 Senior FE developer cho cả 2 platform):

| Tiêu chí | React Native + Expo | Native (Swift + Kotlin) |
|----------|--------------------|-----------------------|
| Số lượng developer cần | 1 | Tối thiểu 2 (1 iOS + 1 Android) |
| Code sharing | ~85-90% shared | 0% (ngoại trừ backend) |
| Design System implementation | 1 lần | 2 lần |
| Time-to-market | Nhanh hơn ~40% | Chậm hơn |
| Performance | Đủ tốt cho loyalty app | Tối ưu nhất |
| Offline support | WatermelonDB (tốt) | Core Data/Room (tốt nhất) |

**Kết luận:** Với đội 3 người và 1 FE developer, React Native + Expo là lựa chọn tối ưu. App loyalty không yêu cầu performance cực cao (không phải game hay video editing).

### 2.3 Back-End & Database

| Thành phần | Lựa chọn | Lý do |
|-----------|----------|-------|
| **Backend Platform** | **Supabase** (project hiện có: `zrlriuednoaqrsvnjjyo`) | Đã là nền tảng của CRM web, tận dụng toàn bộ infrastructure hiện có |
| **API Layer** | Supabase Edge Functions (Deno/TypeScript) | Business logic phức tạp, reuse Zod schemas từ `@comtammatu/shared` |
| **Database** | PostgreSQL (Supabase managed) | Đã có schema, RLS policies, migrations sẵn |
| **Auth** | Supabase Auth (JWT-based cho mobile) | Token-based thay vì cookie-based (mobile-friendly) |
| **Realtime** | Supabase Realtime (WebSocket) | postgres_changes cho live updates (điểm, hạng, check-in) |
| **File Storage** | Supabase Storage | Avatar, QR codes, promotional banners |
| **Caching** | Supabase Edge Function + CDN headers | Cache menu data, promotion banners |
| **Queue/Background Jobs** | pg_cron + pg_notify + Edge Functions | CRM sync, push notifications, batch processing |

#### Database Schema Bổ Sung Cho Mobile App

```sql
-- Bảng hạng thành viên (Loyalty Tiers)
CREATE TABLE loyalty_tiers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,                          -- 'Đồng', 'Bạc', 'Vàng', 'Kim Cương'
  tier_code TEXT NOT NULL,                     -- 'bronze', 'silver', 'gold', 'diamond'
  min_points NUMERIC(14,2) NOT NULL DEFAULT 0, -- Điểm tối thiểu để đạt hạng
  point_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,  -- Hệ số nhân điểm
  cashback_percent NUMERIC(4,2) NOT NULL DEFAULT 0,    -- % cashback
  benefits JSONB NOT NULL DEFAULT '[]',        -- Mảng đặc quyền
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, tier_code)
);

-- Bảng thành viên loyalty
CREATE TABLE loyalty_members (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  profile_id BIGINT NOT NULL REFERENCES profiles(id),
  tier_id BIGINT NOT NULL REFERENCES loyalty_tiers(id),
  total_points NUMERIC(14,2) NOT NULL DEFAULT 0,
  available_points NUMERIC(14,2) NOT NULL DEFAULT 0,
  lifetime_points NUMERIC(14,2) NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 1,              -- Optimistic locking
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tier_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, profile_id)
);

-- Bảng giao dịch điểm
CREATE TABLE point_transactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  member_id BIGINT NOT NULL REFERENCES loyalty_members(id),
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'expire', 'adjust', 'cashback', 'checkin_bonus')),
  points NUMERIC(14,2) NOT NULL,               -- Dương = cộng, âm = trừ
  balance_after NUMERIC(14,2) NOT NULL,
  reference_type TEXT,                          -- 'order', 'checkin', 'promotion', 'manual'
  reference_id BIGINT,
  description TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,         -- Tránh duplicate
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bảng check-in
CREATE TABLE checkins (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  member_id BIGINT NOT NULL REFERENCES loyalty_members(id),
  branch_id BIGINT NOT NULL REFERENCES branches(id),
  method TEXT NOT NULL CHECK (method IN ('qr_code', 'geolocation')),
  device_fingerprint TEXT NOT NULL,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  points_earned NUMERIC(14,2) NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Chống gian lận: 1 check-in/branch/ngày
  UNIQUE(member_id, branch_id, (created_at::DATE))
);

-- Bảng chương trình cashback
CREATE TABLE cashback_programs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  cashback_type TEXT NOT NULL CHECK (cashback_type IN ('percent', 'fixed')),
  cashback_value NUMERIC(12,2) NOT NULL,
  max_cashback NUMERIC(12,2),                  -- Giới hạn tối đa
  min_order_amount NUMERIC(12,2) DEFAULT 0,
  eligible_tiers TEXT[] NOT NULL DEFAULT '{}', -- Hạng được tham gia
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bảng CRM sync outbox
CREATE TABLE sync_outbox (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type TEXT NOT NULL,                    -- 'point_earned', 'checkin', 'tier_change', etc.
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS cho tất cả bảng mới
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_outbox ENABLE ROW LEVEL SECURITY;
```

### 2.4 Infrastructure / DevOps

| Thành phần | Lựa chọn | Chi tiết |
|-----------|----------|---------|
| **Cloud** | Supabase (managed) + Expo EAS | Supabase cho backend, EAS cho build & distribute mobile |
| **CI/CD** | GitHub Actions | Đã có sẵn trong monorepo hiện tại |
| **Mobile Build** | EAS Build | Cloud builds cho iOS + Android, không cần local Xcode/Android Studio |
| **Mobile Deploy** | EAS Submit + OTA Updates | App Store/Play Store submit + over-the-air JS bundle updates |
| **Monitoring** | Sentry (React Native) | Crash reporting, performance monitoring, release tracking |
| **Analytics** | PostHog (self-hosted hoặc cloud) | Product analytics, feature flags, session replay |

#### CI/CD Pipeline

```
┌─────────┐     ┌───────────┐     ┌────────────┐     ┌───────────┐
│  Push    │────►│  Lint +    │────►│  Unit +     │────►│  EAS       │
│  to PR   │     │  TypeCheck │     │  Integration│     │  Build     │
│          │     │            │     │  Tests      │     │  (Preview) │
└─────────┘     └───────────┘     └────────────┘     └─────┬─────┘
                                                           │
                                                           ▼
┌─────────┐     ┌───────────┐     ┌────────────┐     ┌───────────┐
│  Release │◄───│  Store     │◄───│  E2E Tests  │◄───│  Internal  │
│  to      │     │  Submit    │     │  (Detox)    │     │  TestFlight│
│  Public  │     │  (EAS)     │     │             │     │  / Firebase│
└─────────┘     └───────────┘     └────────────┘     └───────────┘
```

---

## 3. Technical & UX Challenges — Thách Thức & Giải Pháp

### 3.1 UX Challenge: Check-in Tại Quán Nhanh Chóng, Không Gây Ách Tắc

#### Vấn đề
Khách hàng đến quán, xếp hàng order, nếu phải mở app → đăng nhập → tìm nút check-in → quét QR → chờ xác thực thì sẽ gây ách tắc tại quầy và trải nghiệm kém.

#### Giải pháp UX: "Check-in Không Cần Suy Nghĩ" (Zero-Friction Check-in)

**Phương án 1: QR Code Nhanh (Primary — 3 giây)**

```
┌──────────────────────────────────────────┐
│  Màn hình Home App (đã đăng nhập)        │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │  [📷 QUÉT CHECK-IN]              │    │  ← Nút lớn, nổi bật nhất
│  │  Nhấn để quét QR tại quán        │    │     trên màn hình Home
│  └──────────────────────────────────┘    │
│                                          │
│  Điểm: 2,450 pts    Hạng: Vàng ★       │
│  ────────────────────────────────────    │
│  [Ưu đãi hôm nay]  [Lịch sử]  [Ví]    │
└──────────────────────────────────────────┘
         │
         │ Nhấn nút
         ▼
┌──────────────────────────────────────────┐
│  Camera mở NGAY LẬP TỨC                 │
│  (Pre-warm camera khi app vào foreground)│
│                                          │
│  ┌──────────────────────────────────┐    │
│  │                                  │    │
│  │      [Camera viewfinder]         │    │
│  │      Đưa QR vào khung            │    │
│  │                                  │    │
│  └──────────────────────────────────┘    │
│                                          │
│  Hoặc: [Dùng vị trí check-in] ← fallback│
└──────────────────────────────────────────┘
         │
         │ Quét thành công (< 1 giây)
         ▼
┌──────────────────────────────────────────┐
│  ✅ CHECK-IN THÀNH CÔNG!                 │
│                                          │
│  🎉 +50 điểm                            │
│                                          │
│  Cơm Tấm Má Tư — Chi nhánh Quận 1      │
│  10:32 SA · Hôm nay                     │
│                                          │
│  Tổng điểm: 2,500 pts                   │
│  ────────────────────────────────────    │
│  [Xem ưu đãi hôm nay →]                 │
│                                          │
│  (Tự động đóng sau 3 giây)              │
└──────────────────────────────────────────┘
```

**Phương án 2: Geofencing Tự Động (Secondary — 0 giây)**
- Khi khách hàng đến gần quán (trong bán kính 100m), app gửi silent notification: "Bạn đang ở gần Cơm Tấm Má Tư. Nhấn để check-in!"
- Nhấn notification → xác thực GPS → check-in hoàn tất
- **Ưu điểm:** Không cần mở app chủ động
- **Hạn chế:** Yêu cầu quyền location "Always" (nhiều user từ chối)

**Phương án 3: NFC Tap (Future Enhancement)**
- Đặt NFC tag tại quầy thu ngân
- Khách chạm điện thoại → check-in tự động
- Nhanh nhất nhưng yêu cầu đầu tư hardware

#### Design Principles Cho Check-in Flow
1. **Tối đa 2 tap** từ Home → Check-in thành công
2. **Pre-warm camera** khi app vào foreground (giảm thời gian chờ mở camera)
3. **Haptic feedback** + animation celebration khi check-in thành công
4. **Auto-dismiss** sau 3 giây, không cần nhấn "Đóng"
5. **Offline queue**: Nếu mất mạng sau khi quét QR → lưu local, sync khi có mạng

### 3.2 Technical Challenge: Chống Gian Lận Check-in

#### Các vector tấn công và giải pháp

| Vector tấn công | Mức độ rủi ro | Giải pháp |
|-----------------|---------------|-----------|
| **Fake GPS (GPS Spoofing)** | Cao | Multi-layer verification (xem chi tiết bên dưới) |
| **Chụp lại/Chia sẻ QR** | Trung bình | Dynamic QR codes (thay đổi mỗi 30 giây) |
| **Emulator/Rooted device** | Trung bình | Device integrity check |
| **Replay attack** | Thấp | QR chứa timestamp + HMAC, hết hạn sau 60 giây |
| **Multiple accounts** | Thấp | Device fingerprint binding |

#### Chi tiết kỹ thuật chống gian lận

**A. Dynamic QR Code (Chống chụp lại/chia sẻ)**

```
QR tại quán (hiển thị trên tablet/TV):

Payload = base64url(JSON.stringify({
  branch_id: 1,
  timestamp: 1709856000,        // Unix timestamp (30-second window)
  nonce: "a1b2c3d4",            // Random, thay đổi mỗi 30 giây
  hmac: HMAC-SHA256(secret, branch_id + timestamp + nonce)
}))

Mỗi 30 giây: QR code thay đổi → screenshot cũ không dùng được
```

**B. GPS Spoofing Detection (Multi-layer)**

```typescript
// Edge Function: verify-checkin
async function verifyCheckin(request: CheckinRequest): Promise<CheckinResult> {
  // Layer 1: Kiểm tra timestamp QR (phải trong 60 giây gần nhất)
  if (Date.now() - request.qr_timestamp > 60_000) {
    return { verified: false, reason: 'QR_EXPIRED' };
  }

  // Layer 2: Verify HMAC
  const expectedHmac = hmacSha256(SECRET, `${request.branch_id}:${request.timestamp}:${request.nonce}`);
  if (request.hmac !== expectedHmac) {
    return { verified: false, reason: 'INVALID_QR' };
  }

  // Layer 3: GPS consistency check (nếu dùng geolocation)
  if (request.method === 'geolocation') {
    const branch = await getBranch(request.branch_id);
    const distance = haversineDistance(
      request.latitude, request.longitude,
      branch.latitude, branch.longitude
    );
    if (distance > 100) { // meters
      return { verified: false, reason: 'TOO_FAR' };
    }
  }

  // Layer 4: Rate limiting (1 check-in/branch/ngày)
  const existingCheckin = await db.query(`
    SELECT id FROM checkins
    WHERE member_id = $1 AND branch_id = $2
    AND created_at::DATE = CURRENT_DATE
  `, [request.member_id, request.branch_id]);

  if (existingCheckin.rows.length > 0) {
    return { verified: false, reason: 'ALREADY_CHECKED_IN' };
  }

  // Layer 5: Device fingerprint (1 device = 1 account)
  const suspiciousDevice = await db.query(`
    SELECT id FROM checkins
    WHERE device_fingerprint = $1
    AND member_id != $2
    AND created_at > now() - interval '24 hours'
  `, [request.device_fingerprint, request.member_id]);

  if (suspiciousDevice.rows.length > 0) {
    // Flag cho admin review, không block ngay
    await flagSuspiciousActivity(request);
  }

  // Tất cả pass → check-in hợp lệ
  return { verified: true };
}
```

**C. Device Integrity (Phát hiện Emulator/Root)**

```typescript
// Client-side (React Native)
import { isEmulator } from 'react-native-device-info';
import { attestKey } from 'expo-attestation'; // iOS App Attest / Android Play Integrity

async function getDeviceIntegrity(): Promise<DeviceAttestation> {
  return {
    is_emulator: await isEmulator(),
    attestation_token: await attestKey(), // Server verify token
    device_id: await getUniqueId(),
  };
}
```

### 3.3 Technical Challenge: Xử Lý Khi CRM Bị Down

#### Chiến lược: Outbox Pattern + Graceful Degradation

```
┌─────────────────────────────────────────────────────────────────┐
│                    NORMAL FLOW (CRM Online)                      │
│                                                                 │
│  App → Edge Function → DB Transaction → sync_outbox → CRM      │
│                         (source of truth)   (async)    (sync)   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    DEGRADED FLOW (CRM Down)                      │
│                                                                 │
│  App → Edge Function → DB Transaction → sync_outbox → ❌ CRM    │
│                         (vẫn ghi OK)      (queued)    (retry)   │
│                                                                 │
│  App hoạt động BÌNH THƯỜNG. User không biết CRM down.          │
│                                                                 │
│  Background worker:                                              │
│    1. Đọc sync_outbox WHERE status = 'failed'                   │
│    2. Retry với exponential backoff: 30s → 1m → 2m → 5m → 15m  │
│    3. Sau 5 lần fail → alert admin qua Slack/Email              │
│    4. Khi CRM online lại → process toàn bộ queue theo thứ tự   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Logic Tích Điểm Khi CRM Down

```typescript
// Edge Function: process-payment (simplified)
async function processPayment(order: Order, member: LoyaltyMember) {
  // Transaction trong Supabase DB — LUÔN THÀNH CÔNG (không phụ thuộc CRM)
  const result = await db.transaction(async (tx) => {
    // 1. Ghi thanh toán
    const payment = await tx.insert('payment_transactions', { ... });

    // 2. Tính và cộng điểm
    const points = calculatePoints(order.total, member.tier);
    const newBalance = member.available_points + points;

    await tx.insert('point_transactions', {
      member_id: member.id,
      type: 'earn',
      points: points,
      balance_after: newBalance,
      idempotency_key: `payment-${payment.id}`,
    });

    await tx.update('loyalty_members', {
      available_points: newBalance,
      total_points: member.total_points + points,
      lifetime_points: member.lifetime_points + points,
      version: member.version + 1,
    }).where({ id: member.id, version: member.version }); // Optimistic lock

    // 3. Kiểm tra nâng hạng
    const newTier = await evaluateTierUpgrade(member, newBalance);

    // 4. Ghi vào sync_outbox (CRM sẽ nhận sau)
    await tx.insert('sync_outbox', {
      event_type: 'point_earned',
      payload: { member_id: member.id, points, payment_id: payment.id, new_tier: newTier },
      status: 'pending',
    });

    return { payment, points, newTier };
  });

  // 5. Gửi CRM async (không block response)
  //    Nếu CRM down → outbox worker sẽ retry
  EdgeFunction.invoke('crm-sync', { background: true });

  return result; // Trả về ngay cho App
}
```

#### CRM Sync Worker

```typescript
// Edge Function: crm-sync-worker (chạy bởi pg_cron mỗi 30 giây)
async function processSyncOutbox() {
  const pendingEvents = await db.query(`
    SELECT * FROM sync_outbox
    WHERE status IN ('pending', 'failed')
    AND (next_retry_at IS NULL OR next_retry_at <= now())
    AND retry_count < max_retries
    ORDER BY created_at ASC
    LIMIT 50
    FOR UPDATE SKIP LOCKED  -- Tránh race condition giữa các workers
  `);

  for (const event of pendingEvents.rows) {
    try {
      await sendToCRM(event.event_type, event.payload);
      await db.update('sync_outbox', {
        status: 'completed',
        processed_at: new Date(),
      }).where({ id: event.id });
    } catch (error) {
      const nextRetry = calculateBackoff(event.retry_count); // 30s, 1m, 2m, 5m, 15m
      await db.update('sync_outbox', {
        status: 'failed',
        retry_count: event.retry_count + 1,
        next_retry_at: nextRetry,
        error_message: error.message,
      }).where({ id: event.id });

      if (event.retry_count + 1 >= event.max_retries) {
        await alertAdmin(`CRM sync failed permanently: ${event.event_type} #${event.id}`);
      }
    }
  }
}
```

#### Tóm Tắt: App Không Bao Giờ Down Vì CRM

| Tình huống | Hành vi App | Hành vi CRM Sync |
|-----------|-------------|-------------------|
| CRM online | Bình thường | Sync gần real-time (< 5 giây) |
| CRM down < 1 giờ | **Bình thường** (user không biết) | Queue trong outbox, sync khi CRM up |
| CRM down > 1 giờ | **Bình thường** | Alert admin, tiếp tục queue |
| CRM down > 24 giờ | **Bình thường** | Escalate, manual reconciliation nếu cần |

---

## 4. Task Delegation & Workflow — Phân Bổ Công Việc & Quy Trình

### 4.1 Sprint Overview (16 Tuần)

```
Tuần 1-2:   ████████░░░░░░░░░░░░░░░░░░░░░░░░  Sprint 0: Setup & Research
Tuần 3-4:   ░░░░░░░░████████░░░░░░░░░░░░░░░░  Sprint 1: Foundation
Tuần 5-6:   ░░░░░░░░░░░░░░░░████████░░░░░░░░  Sprint 2: Core Features
Tuần 7-8:   ░░░░░░░░░░░░░░░░░░░░░░░░████████  Sprint 3: Core Features (tiếp)
Tuần 9-10:  ░░░░░░░░░░░░░░░░░░░░░░░░████████  Sprint 4: Loyalty & Check-in
Tuần 11-12: ░░░░░░░░░░░░░░░░░░░░░░░░████████  Sprint 5: Cashback & CRM Sync
Tuần 13-14: ░░░░░░░░░░░░░░░░░░░░░░░░████████  Sprint 6: Polish & Testing
Tuần 15-16: ░░░░░░░░░░░░░░░░░░░░░░░░████████  Sprint 7: Release
```

### 4.2 Senior UI/UX Designer — Trọng Tâm Công Việc

#### Phase 1: Research & Strategy (Tuần 1-2)

| Nhiệm vụ | Output | Deadline |
|----------|--------|----------|
| User Research: Phỏng vấn 5-10 khách hàng thường xuyên | Research Report (insights, pain points, jobs-to-be-done) | Tuần 1 |
| Competitive Analysis: Phân tích 5 loyalty apps phổ biến tại Việt Nam (The Coffee House, Phúc Long, GrabFood, ShopeeFood, MoMo) | Competitive Matrix + Key Takeaways | Tuần 1 |
| User Persona & Journey Map: Tạo 3 personas (Khách mới, Khách trung thành, Khách VIP) | Persona Cards + Journey Maps trên Figma | Tuần 2 |
| Information Architecture: Sơ đồ cấu trúc app, luồng navigation | IA Diagram + User Flows | Tuần 2 |

#### Phase 2: Design System & Wireframes (Tuần 3-4)

| Nhiệm vụ | Output | Deadline |
|----------|--------|----------|
| Xây dựng Design Tokens trên Figma Variables | Color, Typography, Spacing, Border Radius tokens | Tuần 3 |
| Component Library trên Figma | Atoms: Button, Input, Badge, Card, Icon... Molecules: ListItem, TabBar, Header, PointsDisplay... | Tuần 3-4 |
| Wireframes cho tất cả màn hình chính | Low-fi wireframes (15-20 screens) | Tuần 3 |
| Hi-fi Design cho Sprint 1 screens | Home, Login, Check-in Flow, Profile | Tuần 4 |

#### Phase 3: Ongoing Design Support (Tuần 5-16)

| Nhiệm vụ | Tần suất | Chi tiết |
|----------|---------|---------|
| Sprint Design Review | Mỗi 2 tuần | Review components đã build trên Storybook, feedback |
| Thiết kế màn hình cho sprint tiếp theo | Liên tục | Luôn đi trước FE 1 sprint |
| Micro-interactions & Animations | Khi cần | Check-in celebration, tier upgrade animation, point counter |
| Usability Testing | Tuần 10, 14 | Test với 3-5 khách hàng thật, iterate |
| App Store Assets | Tuần 15 | Screenshots, app icon, feature graphic |

#### Design System — Cấu Trúc Figma

```
📁 Cơm Tấm Má Tư — Mobile Design System
├── 📄 Cover & Guidelines
├── 📄 Design Tokens
│   ├── Colors (Primary, Neutral, Semantic, Loyalty Tiers)
│   ├── Typography (Vietnamese-optimized: Be Vietnam Pro font)
│   ├── Spacing Scale (4px base grid)
│   ├── Border Radius
│   └── Shadows & Elevation
├── 📄 Components
│   ├── Atoms (Button, Input, Badge, Chip, Avatar, Icon)
│   ├── Molecules (Card, ListItem, PointsBadge, TierBadge, TabBar)
│   ├── Organisms (Header, CheckinSheet, LoyaltyCard, TransactionList)
│   └── Templates (HomeScreen, ProfileScreen, CheckinScreen)
├── 📄 Screens — Customer App
│   ├── Onboarding (3 slides)
│   ├── Home (points summary, quick actions, promotions)
│   ├── Check-in (QR scanner, success state)
│   ├── Loyalty Dashboard (tier progress, history)
│   ├── Cashback & Promotions
│   ├── Profile & Settings
│   └── Notifications
├── 📄 Prototypes
│   ├── Check-in Flow (Happy path + Error states)
│   ├── Onboarding Flow
│   └── Tier Upgrade Celebration
└── 📄 Handoff Notes
    └── Per-screen annotations cho developer
```

### 4.3 Senior Front-End Developer (Mobile) — Trọng Tâm Công Việc

#### Phase 1: Project Setup & Component Library (Tuần 1-4)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| Khởi tạo Expo project trong monorepo | `apps/mobile/` với Expo SDK 52, TypeScript strict | Solo |
| Thiết lập Design Token pipeline | Figma Variables → JSON export → `theme.ts` trong RN | Với Designer |
| Build Component Library (Atoms) | Button, Input, Badge, Card... theo Design System | Với Designer (review trên Storybook) |
| Thiết lập Storybook React Native Web | Để Designer review components trên browser | Solo |
| Cấu hình Navigation (Expo Router) | Tab navigation, stack screens, deep linking | Solo |
| Tích hợp Supabase client | Auth flow, realtime subscription setup | Với Back-End |

#### Phase 2: Core Screens (Tuần 5-8)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| Home Screen | Points summary, quick actions, promotions carousel | Với Designer (hi-fi design) |
| Login / Onboarding Flow | Phone/email auth, OTP, first-time tutorial | Với Back-End (auth API) |
| Check-in Screen | Camera QR scanner, geolocation fallback, success animation | Với Designer (micro-interactions) + Back-End (verify-checkin API) |
| Loyalty Dashboard | Tier progress bar, points history, tier benefits | Với Designer + Back-End (loyalty APIs) |

#### Phase 3: Advanced Features (Tuần 9-12)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| Cashback & Promotions | Active promotions list, cashback history, redeem flow | Với Back-End (cashback APIs) |
| Profile & Settings | Profile edit, notification preferences, privacy | Solo |
| Offline Support | WatermelonDB setup, sync queue, offline check-in | Với Back-End (sync protocol) |
| Push Notifications | expo-notifications setup, notification center UI | Với Back-End (push infra) |

#### Phase 4: Polish & Release (Tuần 13-16)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| Performance Optimization | FlatList optimization, image caching, bundle size | Solo |
| Accessibility | VoiceOver/TalkBack support, contrast ratios | Với Designer |
| E2E Tests (Detox) | Happy paths: onboarding, check-in, view points | Solo |
| App Store Preparation | EAS Submit config, app metadata, screenshots | Với Designer (assets) |

#### Quy Trình Phối Hợp FE ↔ Designer (Component Library Build)

```
Designer                           Front-End Developer
   │                                      │
   │  1. Thiết kế Component trên Figma    │
   │  (với variants, states, tokens)      │
   │─────────────────────────────────────►│
   │                                      │  2. Build component trong RN
   │                                      │     theo Design Tokens
   │                                      │  3. Publish lên Storybook
   │  4. Review trên Storybook            │◄─────────────────────────────
   │     (pixel-perfect check)            │
   │                                      │
   │  ┌─ Approved ✅ ──────────────────── │ → Merge vào Component Library
   │  │                                   │
   │  └─ Feedback 🔄 ─────────────────── │ → Iterate (max 2 rounds)
   │     "Spacing cần tăng 4px"           │
   │     "Border radius chưa đúng"        │
   │                                      │
```

**Quy tắc:** Designer review trên Storybook trước khi component được dùng trong màn hình thật. Tối đa 2 vòng feedback per component.

### 4.4 Back-End Developer — Trọng Tâm Công Việc

#### Phase 1: API & Database Foundation (Tuần 1-4)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| Database Schema Migration | Tạo tables: loyalty_tiers, loyalty_members, point_transactions, checkins, cashback_programs, sync_outbox | Solo |
| RLS Policies | Viết policies cho tất cả bảng mới | Solo |
| Edge Function: Auth Setup | JWT verification, tenant/branch context extraction | Solo |
| Edge Function: `verify-checkin` | QR decode, HMAC verify, GPS check, rate limit, fraud detection | Với FE (payload format) |
| Edge Function: `earn-points` | Tính điểm, cập nhật balance, kiểm tra nâng hạng | Solo |
| API Documentation | OpenAPI spec cho tất cả Edge Functions | Với FE (contract agreement) |

#### Phase 2: Core Business Logic (Tuần 5-8)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| Edge Function: `process-cashback` | Tính cashback theo chương trình, ghi vào ví | Solo |
| Edge Function: `get-loyalty-dashboard` | Aggregate data cho dashboard (tier, points, history) | Với FE (response shape) |
| Edge Function: `get-promotions` | Active promotions, eligibility check theo tier | Solo |
| Dynamic QR Generator | QR rotation mỗi 30 giây cho tablet tại quán | Solo |
| CRM Integration Layer | Outbox pattern, sync worker, retry logic | Solo |

#### Phase 3: Infrastructure (Tuần 9-12)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| CRM Sync Worker | pg_cron job, exponential backoff, alert on persistent failure | Solo |
| Push Notification Infra | FCM/APNs setup, Edge Function triggers, token management | Với FE (device token registration) |
| Offline Sync Protocol | Define sync handshake, conflict resolution rules, batch sync endpoint | Với FE (WatermelonDB sync) |
| Rate Limiting & Security | Per-user rate limits, abuse detection, IP blocking | Solo |

#### Phase 4: Monitoring & Release (Tuần 13-16)

| Nhiệm vụ | Chi tiết | Phối hợp |
|----------|---------|----------|
| Database Monitoring | Query performance, connection pool, RLS audit | Solo |
| Load Testing | Simulate 1000 concurrent check-ins, 500 point transactions/min | Solo |
| CRM Reconciliation Tool | Admin endpoint để so sánh Supabase ↔ CRM data, fix discrepancies | Solo |
| Production Readiness | Backup strategy, disaster recovery plan, runbook | Toàn team |

### 4.5 Quy Trình Làm Việc Hằng Ngày (Daily Workflow)

#### Ceremonies

| Ceremony | Tần suất | Thời lượng | Ai tham gia |
|----------|---------|-----------|-------------|
| **Daily Standup** | Hằng ngày (9:00 SA) | 15 phút | Toàn team (3 người) |
| **Sprint Planning** | Mỗi 2 tuần (Thứ 2) | 1 giờ | Toàn team |
| **Design Review** | Mỗi tuần (Thứ 4) | 30 phút | Designer + FE |
| **API Contract Review** | Khi cần | 30 phút | FE + Back-End |
| **Sprint Review + Retro** | Mỗi 2 tuần (Thứ 6) | 1 giờ | Toàn team |

#### Communication Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Designer    │     │  Front-End   │     │  Back-End    │
│              │     │              │     │              │
│ Figma        │────►│ Storybook    │◄────│ API Docs     │
│ (Design)     │     │ (Components) │     │ (OpenAPI)    │
│              │     │              │     │              │
│ Figjam       │────►│              │     │              │
│ (Wireframes) │     │              │     │              │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                     │
       └────────────────────┼─────────────────────┘
                            │
                     ┌──────┴──────┐
                     │   GitHub     │
                     │ (Code + PRs) │
                     │   Linear     │
                     │ (Tasks)      │
                     │   Slack      │
                     │ (Chat)       │
                     └─────────────┘
```

#### Công Cụ Quản Lý Dự Án

| Công cụ | Mục đích |
|---------|---------|
| **Linear** | Task management, sprint tracking, backlog |
| **GitHub** | Code repository, PRs, CI/CD |
| **Slack** | Daily communication, alerts, integrations |
| **Figma** | Design files, prototypes, handoff |
| **Notion** | Documentation, meeting notes, decisions log |

### 4.6 Milestone & Deliverables

| Milestone | Tuần | Deliverable | Acceptance Criteria |
|-----------|------|-------------|---------------------|
| **M0: Setup Complete** | 2 | Repo setup, Design System v0, API contracts drafted | App builds, Storybook runs, Figma file structured |
| **M1: Đăng Nhập + Home** | 4 | User login, home screen với mock data | Đăng nhập bằng phone/email, hiển thị points + tier |
| **M2: Check-in MVP** | 6 | QR check-in hoạt động end-to-end | Quét QR → verify → cộng điểm → hiển thị thành công |
| **M3: Loyalty Full** | 8 | Tier system, points history, tier upgrade | Xem hạng, lịch sử điểm, nâng hạng khi đủ điểm |
| **M4: Cashback + CRM** | 10 | Cashback flow, CRM sync | Hoàn điểm sau thanh toán, data sync to CRM |
| **M5: Notifications + Offline** | 12 | Push notifications, offline check-in | Nhận notification, check-in offline rồi sync |
| **M6: Beta Release** | 14 | Internal beta (TestFlight + Firebase) | 10 nhân viên test, 0 critical bugs |
| **M7: Production Release** | 16 | App Store + Play Store | Published, 50 khách hàng đầu tiên onboard |

---

## 5. Tính Năng Bổ Sung: Giao Hàng & Đặt Bàn

### 5.1 Giao Hàng (Delivery)

#### A. Tổng Quan Luồng Đặt Hàng Giao Tận Nơi

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  1. BROWSE    │───►│  2. CART      │───►│  3. CHECKOUT  │───►│  4. TRACKING  │
│              │    │              │    │              │    │              │
│ Xem menu     │    │ Chọn món,    │    │ Địa chỉ giao │    │ Real-time     │
│ (cached,     │    │ ghi chú,     │    │ Phương thức   │    │ tracking      │
│  offline OK) │    │ số lượng     │    │ thanh toán    │    │ trên bản đồ  │
│              │    │              │    │ Mã giảm giá   │    │              │
│              │    │ Kiểm tra     │    │ Xác nhận      │    │ Trạng thái   │
│              │    │ delivery zone│    │              │    │ đơn hàng     │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │  KITCHEN/POS  │
                                        │              │
                                        │ Đơn hàng vào │
                                        │ KDS (tag:     │
                                        │ "Giao hàng") │
                                        │              │
                                        │ Nhân viên    │
                                        │ giao hàng    │
                                        │ nhận đơn     │
                                        └──────────────┘
```

#### B. Database Schema Cho Delivery

```sql
-- Địa chỉ giao hàng của khách
CREATE TABLE delivery_addresses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  profile_id BIGINT NOT NULL REFERENCES profiles(id),
  label TEXT NOT NULL DEFAULT 'Nhà',           -- 'Nhà', 'Công ty', 'Khác'
  full_address TEXT NOT NULL,
  ward TEXT,                                    -- Phường/Xã
  district TEXT,                                -- Quận/Huyện
  city TEXT NOT NULL DEFAULT 'Hồ Chí Minh',
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  phone_number TEXT NOT NULL,
  receiver_name TEXT NOT NULL,
  note TEXT,                                    -- "Hẻm nhỏ, gọi trước khi đến"
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Delivery zones (vùng giao hàng theo chi nhánh)
CREATE TABLE delivery_zones (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  branch_id BIGINT NOT NULL REFERENCES branches(id),
  zone_name TEXT NOT NULL,                     -- 'Quận 1', 'Quận 3', ...
  max_distance_km NUMERIC(5,2) NOT NULL,       -- Bán kính giao hàng tối đa
  delivery_fee NUMERIC(12,2) NOT NULL,         -- Phí giao hàng
  min_order_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  estimated_minutes INT NOT NULL DEFAULT 30,   -- Thời gian giao dự kiến
  is_active BOOLEAN NOT NULL DEFAULT true,
  polygon JSONB,                               -- GeoJSON polygon cho vùng phức tạp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Đơn hàng giao hàng
CREATE TABLE delivery_orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  order_id BIGINT NOT NULL REFERENCES orders(id),
  branch_id BIGINT NOT NULL REFERENCES branches(id),
  address_id BIGINT NOT NULL REFERENCES delivery_addresses(id),
  delivery_zone_id BIGINT REFERENCES delivery_zones(id),
  driver_id BIGINT REFERENCES profiles(id),    -- Nhân viên giao hàng
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',          -- Chờ xác nhận
      'confirmed',        -- Quán đã xác nhận
      'preparing',        -- Đang chuẩn bị
      'ready_for_pickup', -- Sẵn sàng giao
      'picked_up',        -- Tài xế đã lấy hàng
      'delivering',       -- Đang giao
      'delivered',        -- Đã giao thành công
      'cancelled'         -- Đã hủy
    )),
  delivery_fee NUMERIC(12,2) NOT NULL,
  estimated_delivery_at TIMESTAMPTZ,
  actual_delivery_at TIMESTAMPTZ,
  driver_latitude NUMERIC(10,7),               -- Vị trí real-time tài xế
  driver_longitude NUMERIC(10,7),
  driver_location_updated_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  rating_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE delivery_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
```

#### C. Luồng Dữ Liệu Giao Hàng

```
Khách đặt hàng trên App
        │
        ▼
┌─────────────────────┐
│ Edge Function:       │  ① Validate: delivery zone, min order, available items
│ create-delivery-     │  ② Tính phí giao hàng theo khoảng cách
│ order                │  ③ Tạo order + delivery_order trong 1 transaction
│                      │  ④ Estimate thời gian giao
└────────┬────────────┘
         │
         ├──── Realtime → KDS nhận đơn (tag: "🛵 Giao hàng — Quận 1")
         │
         ├──── Push → Khách: "Đơn hàng #123 đã được tiếp nhận"
         │
         ▼
┌─────────────────────┐
│ Quán xác nhận       │  Cashier/Manager confirm trên POS
│ (POS/Web CRM)       │  status: pending → confirmed → preparing
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ KDS hoàn thành      │  Chef bump → ready_for_pickup
│ ready_for_pickup    │  Push → Driver: "Đơn #123 sẵn sàng lấy"
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Driver App           │  ⑤ Tài xế lấy hàng → picked_up
│ (phần mở rộng       │  ⑥ Cập nhật GPS mỗi 15 giây
│  của staff module)   │     → Realtime broadcast → Customer map
│                      │  ⑦ Giao xong → delivered
└────────┬────────────┘
         │
         ├──── Push → Khách: "Đơn hàng đang trên đường giao. ETA: 12 phút"
         ├──── Push → Khách: "Đơn hàng đã giao! Chấm điểm nhé ⭐"
         │
         └──── Points earned + CRM sync (như flow tích điểm hiện có)
```

#### D. UX Design Cho Delivery

**Màn hình chính:**

```
┌──────────────────────────────────────────┐
│  📍 Giao đến: 123 Nguyễn Huệ, Q.1  [▼] │  ← Tap để đổi địa chỉ
│─────────────────────────────────────────│
│                                          │
│  🔥 Phổ biến                             │
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │ Cơm tấm│ │ Cơm tấm│ │ Cơm tấm│       │
│  │ sườn   │ │ bì chả │ │ đặc    │       │
│  │ 55.000đ│ │ 60.000đ│ │ biệt   │       │
│  │ [Thêm] │ │ [Thêm] │ │ 75.000đ│       │
│  └────────┘ └────────┘ │ [Thêm] │       │
│                         └────────┘       │
│  Tất cả món ăn                           │
│  ┌──────────────────────────────────┐    │
│  │ 🍖 Cơm tấm sườn nướng    55.000đ│    │
│  │ ⭐ Bán chạy                [+]  │    │
│  ├──────────────────────────────────┤    │
│  │ 🍖 Cơm tấm bì chả        60.000đ│    │
│  │                            [+]  │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 🛒 2 món · 115.000đ    [Xem giỏ]│    │  ← Floating cart bar
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

**Màn hình Tracking:**

```
┌──────────────────────────────────────────┐
│  Đơn hàng #123                           │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │                                  │    │
│  │         [    BẢN ĐỒ           ] │    │
│  │         [ Vị trí tài xế 🛵    ] │    │
│  │         [ → Nhà bạn 📍        ] │    │
│  │                                  │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ── Trạng thái ──────────────────────    │
│  ✅ Đã tiếp nhận          10:30         │
│  ✅ Đang chuẩn bị         10:32         │
│  ✅ Tài xế đã lấy hàng    10:45         │
│  🔵 Đang giao hàng        10:47         │  ← Active
│  ○  Giao thành công        ~10:58       │  ← ETA
│                                          │
│  Tài xế: Minh · ☎ 0901.xxx.xxx          │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │  💬 Nhắn tài xế    📞 Gọi       │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

#### E. Edge Functions Mới Cho Delivery

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/check-delivery-zone` | POST | `{ latitude, longitude, branch_id? }` | `{ available, branch_id, zone, fee, estimated_minutes }` |
| `/create-delivery-order` | POST | `{ items[], address_id, payment_method, coupon_code?, note? }` | `{ order_id, delivery_order_id, total, fee, estimated_at }` |
| `/update-delivery-status` | POST | `{ delivery_order_id, status, latitude?, longitude? }` | `{ success, new_status }` |
| `/update-driver-location` | POST | `{ delivery_order_id, latitude, longitude }` | `{ success }` (broadcast to customer) |
| `/rate-delivery` | POST | `{ delivery_order_id, rating, comment? }` | `{ success }` |
| `/get-delivery-history` | GET | `{ page, limit }` | `{ orders[], total, has_more }` |

### 5.2 Đặt Bàn (Table Reservation)

#### A. Tổng Quan Luồng Đặt Bàn

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  1. CHỌN      │───►│  2. XÁC NHẬN  │───►│  3. NHẮC NHỞ  │───►│  4. CHECK-IN  │
│              │    │              │    │              │    │              │
│ Chi nhánh    │    │ Tóm tắt      │    │ Push trước   │    │ Đến quán     │
│ Ngày/Giờ     │    │ đặt bàn      │    │ 1 giờ:       │    │ Check-in     │
│ Số khách     │    │              │    │ "Nhắc nhở    │    │ bằng QR      │
│ Yêu cầu đặc │    │ Chính sách   │    │  đặt bàn     │    │              │
│ biệt         │    │ hủy          │    │  lúc 18:30"  │    │ Tự động      │
│              │    │              │    │              │    │ liên kết     │
│ Xem sơ đồ   │    │ Xác nhận     │    │ Quán confirm │    │ loyalty      │
│ bàn trống    │    │ booking      │    │ bàn cụ thể   │    │ points       │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

#### B. Database Schema Cho Đặt Bàn

```sql
-- Cấu hình đặt bàn theo chi nhánh
CREATE TABLE reservation_settings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  branch_id BIGINT NOT NULL REFERENCES branches(id),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  max_party_size INT NOT NULL DEFAULT 20,       -- Số khách tối đa / booking
  min_advance_hours INT NOT NULL DEFAULT 1,     -- Đặt trước ít nhất X giờ
  max_advance_days INT NOT NULL DEFAULT 30,     -- Đặt trước tối đa X ngày
  slot_duration_minutes INT NOT NULL DEFAULT 90, -- Mỗi booking giữ bàn 90 phút
  auto_cancel_minutes INT NOT NULL DEFAULT 15,  -- Tự hủy nếu không đến sau 15 phút
  cancellation_deadline_hours INT NOT NULL DEFAULT 2, -- Hủy miễn phí trước 2 giờ
  operating_hours JSONB NOT NULL,               -- {"mon": {"open": "10:00", "close": "22:00"}, ...}
  blocked_dates JSONB NOT NULL DEFAULT '[]',    -- Ngày không nhận đặt bàn
  UNIQUE(tenant_id, branch_id)
);

-- Đặt bàn
CREATE TABLE reservations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  branch_id BIGINT NOT NULL REFERENCES branches(id),
  profile_id BIGINT NOT NULL REFERENCES profiles(id),
  table_id BIGINT REFERENCES tables(id),        -- Null khi chưa assign bàn cụ thể
  reservation_code TEXT NOT NULL UNIQUE,         -- "CTM-20260315-001"
  party_size INT NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  end_time TIME NOT NULL,                        -- = reservation_time + slot_duration
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',          -- Chờ quán xác nhận
      'confirmed',        -- Quán đã xác nhận (assign bàn)
      'reminded',         -- Đã gửi nhắc nhở
      'seated',           -- Khách đã đến, ngồi vào bàn
      'completed',        -- Hoàn thành (khách đã rời)
      'no_show',          -- Khách không đến
      'cancelled_by_customer',
      'cancelled_by_restaurant'
    )),
  special_requests TEXT,                         -- "Bàn gần cửa sổ, có ghế em bé"
  cancellation_reason TEXT,
  checked_in_at TIMESTAMPTZ,                     -- Thời điểm check-in thực tế
  points_earned NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Chống double booking
  EXCLUDE USING gist (
    table_id WITH =,
    tsrange(
      (reservation_date + reservation_time)::TIMESTAMPTZ,
      (reservation_date + end_time)::TIMESTAMPTZ
    ) WITH &&
  ) WHERE (table_id IS NOT NULL AND status NOT IN ('cancelled_by_customer', 'cancelled_by_restaurant', 'no_show'))
);

ALTER TABLE reservation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
```

#### C. UX Design Cho Đặt Bàn

**Màn hình Đặt Bàn:**

```
┌──────────────────────────────────────────┐
│  ← Đặt bàn                              │
│                                          │
│  Chi nhánh                               │
│  ┌──────────────────────────────────┐    │
│  │ 📍 Cơm Tấm Má Tư — Quận 1      │ ▼  │
│  └──────────────────────────────────┘    │
│                                          │
│  Ngày          Giờ           Số khách    │
│  ┌─────────┐  ┌─────────┐  ┌────────┐   │
│  │ T7,15/03│  │  18:30  │  │  4 👤  │   │
│  └─────────┘  └─────────┘  └────────┘   │
│                                          │
│  ── Bàn trống ──────────────────────     │
│                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │
│  │ 18:00│ │ 18:30│ │ 19:00│ │ 19:30│    │
│  │  ✓   │ │  ✓   │ │  ✓   │ │  ✓   │    │
│  └──────┘ └──────┘ └──────┘ └──────┘    │
│  ┌──────┐ ┌──────┐                       │
│  │ 20:00│ │ 20:30│  (Xám = hết bàn)     │
│  │  ✓   │ │  ✗   │                       │
│  └──────┘ └──────┘                       │
│                                          │
│  Yêu cầu đặc biệt (tùy chọn)           │
│  ┌──────────────────────────────────┐    │
│  │ Bàn gần cửa sổ, có ghế em bé    │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │        ✅ XÁC NHẬN ĐẶT BÀN       │    │
│  └──────────────────────────────────┘    │
│                                          │
│  Chính sách hủy: Miễn phí trước 2 giờ   │
└──────────────────────────────────────────┘
```

**Màn hình Xác Nhận:**

```
┌──────────────────────────────────────────┐
│                                          │
│          🎉 Đặt bàn thành công!          │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │  Mã đặt bàn: CTM-20260315-001   │    │
│  │                                  │    │
│  │  📍 Cơm Tấm Má Tư — Quận 1     │    │
│  │  📅 Thứ Bảy, 15/03/2026         │    │
│  │  🕡 18:30 — 20:00               │    │
│  │  👥 4 khách                      │    │
│  │                                  │    │
│  │  ┌────────────────────────────┐  │    │
│  │  │      [QR CODE ĐẶT BÀN]    │  │    │
│  │  │  Đưa QR cho nhân viên     │  │    │
│  │  │  khi đến quán             │  │    │
│  │  └────────────────────────────┘  │    │
│  └──────────────────────────────────┘    │
│                                          │
│  📌 Thêm vào lịch    📤 Chia sẻ         │
│                                          │
│  ⚠️ Đến muộn 15 phút sẽ tự động hủy    │
│                                          │
│  [Về trang chủ]    [Xem đặt bàn của tôi]│
└──────────────────────────────────────────┘
```

#### D. Luồng Thông Báo Đặt Bàn

```
Thời điểm                 Hành động
──────────────────────────────────────────────────
Đặt bàn xong             Push: "Đặt bàn thành công! CTM-20260315-001"
                          + Calendar event (optional)

Quán confirm bàn cụ thể  Push: "Bàn số 5 (gần cửa sổ) đã được giữ cho bạn"

1 giờ trước               Push: "Nhắc nhở: Bạn có đặt bàn lúc 18:30 tại Quận 1"

Khách đến, quét QR        Auto check-in + loyalty points
                          Table status → "occupied" trên POS

15 phút sau giờ hẹn       Nếu chưa check-in → Push: "Bạn ơi, bàn sẽ bị hủy sau 5 phút nữa"
(auto_cancel_minutes)

20 phút sau               status → 'no_show', table freed
                          Push: "Đặt bàn đã bị hủy do không đến"
```

#### E. Tích Hợp Check-in + Đặt Bàn + Loyalty

```
Khách đã đặt bàn đến quán
        │
        ▼
┌─────────────────────────┐
│ Quét QR check-in        │  QR tại quán (dynamic, như flow hiện tại)
│ (flow hiện có)          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Edge Function:           │  ① Check: khách có reservation hôm nay?
│ verify-checkin           │  ② Nếu CÓ → auto-link reservation
│ (mở rộng)               │     - reservation.status → 'seated'
│                          │     - reservation.checked_in_at = now()
│                          │     - table.status → 'occupied'
│                          │  ③ Cộng điểm: check-in bonus + reservation bonus
│                          │  ④ Nếu KHÔNG có reservation → check-in bình thường
└────────┬────────────────┘
         │
         ▼
  App hiển thị:
  "✅ Check-in + Đặt bàn thành công!
   Bàn số 5 · +50 điểm check-in · +20 điểm đặt bàn"
```

#### F. Edge Functions Mới Cho Đặt Bàn

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/get-available-slots` | GET | `{ branch_id, date, party_size }` | `{ slots[], branch_info }` |
| `/create-reservation` | POST | `{ branch_id, date, time, party_size, special_requests? }` | `{ reservation_id, code, status }` |
| `/cancel-reservation` | POST | `{ reservation_id, reason? }` | `{ success, refund_policy }` |
| `/get-my-reservations` | GET | `{ status?, page, limit }` | `{ reservations[], total }` |
| `/confirm-reservation` | POST | `{ reservation_id, table_id }` | `{ success }` (Staff only) |
| `/process-no-shows` | POST | — (pg_cron trigger) | `{ processed_count }` |

### 5.3 Cập Nhật Kiến Trúc Tổng Thể

#### Core Features Mở Rộng (6 tính năng)

| # | Tính năng | Complexity | Ảnh hưởng UX |
|---|-----------|-----------|-------------|
| 1 | Loyalty Program (Hạng thành viên) | Trung bình | Cao — Gamification |
| 2 | Point System (Tích điểm) | Trung bình | Cao — Motivation |
| 3 | Check-in (QR/Location) | Cao | Rất cao — Zero-friction |
| 4 | Cashback (Hoàn điểm) | Trung bình | Cao — Perceived value |
| 5 | **Delivery (Giao hàng)** | **Cao** | **Rất cao — Revenue driver** |
| 6 | **Table Reservation (Đặt bàn)** | **Trung bình** | **Cao — Convenience** |

#### Cập Nhật Timeline (18 tuần → 22 tuần)

| Milestone | Tuần | Deliverable |
|-----------|------|-------------|
| M0: Setup Complete | 2 | Repo, Design System v0, API contracts |
| M1: Đăng Nhập + Home | 4 | Login, home screen, address management |
| M2: Check-in MVP | 6 | QR check-in end-to-end |
| M3: Loyalty Full | 8 | Tier system, points history |
| M4: Cashback + CRM | 10 | Cashback flow, CRM sync |
| **M5: Menu + Cart** | **12** | **Menu browsing, cart, delivery zone check** |
| **M6: Delivery Full** | **14** | **Đặt hàng giao tận nơi, tracking real-time** |
| **M7: Đặt Bàn** | **16** | **Reservation flow, auto check-in link** |
| M8: Notifications + Offline | 18 | Push, offline check-in, delivery notifications |
| M9: Beta Release | 20 | Internal beta, 10 nhân viên test |
| M10: Production Release | 22 | App Store + Play Store |

#### Cập Nhật Component Library

**Thêm vào Molecules:**
- [ ] MenuItem (image + name + price + add button + popularity badge)
- [ ] CartItem (image + name + quantity stepper + price + remove)
- [ ] DeliveryStatusStep (icon + label + time + active/completed/pending state)
- [ ] AddressCard (label + full address + phone + edit/delete)
- [ ] TimeSlotPicker (horizontal scroll, available/unavailable states)
- [ ] ReservationCard (code + branch + date + time + party size + status badge)

**Thêm vào Organisms:**
- [ ] MenuBrowser (category tabs + search + item grid/list)
- [ ] CartSheet (bottom sheet: items + subtotal + delivery fee + total + checkout CTA)
- [ ] DeliveryTracker (map + status timeline + driver info + contact buttons)
- [ ] ReservationForm (branch picker + date + time slots + party size + special requests)
- [ ] OrderConfirmation (summary + payment method + address + place order CTA)

---

## Phụ Lục A: Edge Functions API Reference

| Endpoint | Method | Auth | Input | Output |
|----------|--------|------|-------|--------|
| `/verify-checkin` | POST | JWT (customer) | `{ qr_payload, device_fingerprint, latitude?, longitude? }` | `{ success, points_earned, new_balance }` |
| `/earn-points` | POST | JWT (cashier) | `{ member_id, order_id, amount, idempotency_key }` | `{ points_earned, new_balance, tier_change? }` |
| `/process-cashback` | POST | JWT (system) | `{ member_id, order_id, program_id }` | `{ cashback_amount, new_balance }` |
| `/get-loyalty-dashboard` | GET | JWT (customer) | — | `{ member, tier, recent_transactions, promotions }` |
| `/get-promotions` | GET | JWT (customer) | `{ branch_id? }` | `{ active_promotions[] }` |
| `/redeem-points` | POST | JWT (customer) | `{ points, reward_id, idempotency_key }` | `{ success, new_balance }` |
| `/crm-sync-worker` | POST | Service key | — | `{ processed, failed, pending }` |
| `/generate-qr` | GET | JWT (staff) | `{ branch_id }` | `{ qr_payload, expires_at }` |
| `/check-delivery-zone` | POST | JWT (customer) | `{ latitude, longitude, branch_id? }` | `{ available, branch_id, zone, fee, estimated_minutes }` |
| `/create-delivery-order` | POST | JWT (customer) | `{ items[], address_id, payment_method, coupon_code?, note? }` | `{ order_id, delivery_order_id, total, fee, estimated_at }` |
| `/update-delivery-status` | POST | JWT (staff/driver) | `{ delivery_order_id, status, latitude?, longitude? }` | `{ success, new_status }` |
| `/update-driver-location` | POST | JWT (driver) | `{ delivery_order_id, latitude, longitude }` | `{ success }` |
| `/rate-delivery` | POST | JWT (customer) | `{ delivery_order_id, rating, comment? }` | `{ success }` |
| `/get-available-slots` | GET | JWT (customer) | `{ branch_id, date, party_size }` | `{ slots[], branch_info }` |
| `/create-reservation` | POST | JWT (customer) | `{ branch_id, date, time, party_size, special_requests? }` | `{ reservation_id, code, status }` |
| `/cancel-reservation` | POST | JWT (customer) | `{ reservation_id, reason? }` | `{ success }` |

## Phụ Lục B: Thư Viện Component (Component Library Checklist)

### Atoms
- [ ] Button (primary, secondary, ghost, danger — 4 sizes)
- [ ] TextInput (default, error, disabled, with icon)
- [ ] Badge (loyalty tiers: Đồng, Bạc, Vàng, Kim Cương)
- [ ] Chip (selectable, dismissible)
- [ ] Avatar (image, initials, with tier border)
- [ ] Icon (Lucide icon set — consistent with web CRM)
- [ ] Divider
- [ ] Skeleton (loading state)

### Molecules
- [ ] PointsDisplay (animated counter + tier badge)
- [ ] TransactionItem (icon + description + points + date)
- [ ] PromotionCard (image + title + cashback info + CTA)
- [ ] TierProgressBar (current tier → next tier with progress %)
- [ ] CheckinButton (large, prominent, with pulse animation)
- [ ] NotificationItem (icon + message + timestamp + read state)
- [ ] ListItem (icon + label + value + chevron)
- [ ] BottomSheet (reusable modal sheet)

### Organisms
- [ ] AppHeader (back button + title + optional right action)
- [ ] BottomTabBar (Home, Check-in, Rewards, Profile)
- [ ] LoyaltyCard (glass-morphism card showing tier + points + QR)
- [ ] TransactionList (FlatList with date grouping)
- [ ] QRScanner (camera view + overlay + instructions)
- [ ] CheckinSuccessSheet (animation + points earned + CTA)

---

*Tài liệu này là living document, sẽ được cập nhật theo tiến trình dự án.*
*Phiên bản: 1.1 · Ngày tạo: 2026-03-08 · Cập nhật: 2026-03-08 · Lead Technology Review*
*Thay đổi v1.1: Thêm Section 0 (Framework Evaluation), Section 5 (Delivery & Đặt Bàn), cập nhật timeline 16→22 tuần*
