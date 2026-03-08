# Bản Thiết Kế Công Nghệ & Quy Trình Phối Hợp — Cơm Tấm Má Tư Mobile App

> **Lead Technology Document**
> Đội ngũ: 1 Senior UI/UX Designer · 1 Senior Front-End Developer (Mobile) · 1 Back-End Developer
> Ngày tạo: 2026-03-08

---

## Mục Lục

1. [Architecture Design — Kiến Trúc Hệ Thống & Tích Hợp](#1-architecture-design--kiến-trúc-hệ-thống--tích-hợp)
2. [Tech Stack & Collaboration Tools — Công Nghệ & Công Cụ](#2-tech-stack--collaboration-tools--công-nghệ--công-cụ)
3. [Technical & UX Challenges — Thách Thức & Giải Pháp](#3-technical--ux-challenges--thách-thức--giải-pháp)
4. [Task Delegation & Workflow — Phân Bổ Công Việc & Quy Trình](#4-task-delegation--workflow--phân-bổ-công-việc--quy-trình)

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
*Phiên bản: 1.0 · Ngày tạo: 2026-03-08 · Lead Technology Review*
