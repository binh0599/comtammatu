# Cơm Tấm Má Tư — API Contract v1.0

> **Mục đích:** Tài liệu này là "hợp đồng" giữa Front-End (Flutter) và Back-End (Supabase Edge Functions),
> đảm bảo hai bên phát triển song song mà không phải chờ nhau.
>
> **Base URL:** `https://zrlriuednoaqrsvnjjyo.supabase.co/functions/v1`
>
> **Protocol:** HTTPS (REST) + WSS (Realtime subscriptions)

---

## 0. Quy Ước Chung (Conventions)

### 0.1 Authentication

Mọi request (trừ public endpoints) phải gửi kèm JWT trong header:

```
Authorization: Bearer <supabase_access_token>
```

| Auth Type | Mô tả | Sử dụng bởi |
|-----------|--------|-------------|
| `JWT (customer)` | Token của khách hàng đã đăng nhập | Mobile App |
| `JWT (cashier)` | Token của nhân viên thu ngân | POS / Cashier App |
| `JWT (staff)` | Token của nhân viên quản lý | Staff App |
| `JWT (driver)` | Token của tài xế giao hàng | Driver App |
| `Service key` | `apikey` header với service_role key | Internal cron jobs |

### 0.2 Request Format

```
Content-Type: application/json
Authorization: Bearer <token>
X-Idempotency-Key: <uuid-v7>      # Bắt buộc cho mọi POST/PUT/PATCH
X-Device-Fingerprint: <string>     # Bắt buộc cho check-in, earn-points
X-App-Version: <semver>            # VD: 1.2.0
X-Platform: <ios|android>
```

### 0.3 Response Envelope

**Mọi response** đều tuân theo cùng một envelope:

```typescript
// ✅ Success (HTTP 2xx)
{
  "success": true,
  "data": { ... },               // Payload chính
  "meta": {                       // Optional — dùng cho pagination
    "page": 1,
    "per_page": 20,
    "total": 150,
    "has_next": true
  }
}

// ❌ Error (HTTP 4xx / 5xx)
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_POINTS", // Machine-readable error code (UPPER_SNAKE_CASE)
    "message": "Bạn không đủ điểm để đổi phần thưởng này",  // Human-readable (Vietnamese)
    "details": { ... }            // Optional — thông tin debug bổ sung
  }
}
```

### 0.4 Error Codes Chung

| HTTP | Error Code | Mô tả |
|------|-----------|-------|
| 400 | `VALIDATION_ERROR` | Request body không hợp lệ (Zod validation fail) |
| 400 | `IDEMPOTENCY_KEY_REQUIRED` | Thiếu header `X-Idempotency-Key` |
| 401 | `UNAUTHORIZED` | Token hết hạn hoặc không hợp lệ |
| 403 | `FORBIDDEN` | Không đủ quyền (role không phù hợp) |
| 404 | `NOT_FOUND` | Resource không tồn tại |
| 409 | `DUPLICATE_REQUEST` | Idempotency key đã được xử lý |
| 409 | `VERSION_CONFLICT` | Optimistic lock fail — client cần fetch lại data |
| 422 | `BUSINESS_RULE_VIOLATION` | Vi phạm rule nghiệp vụ (VD: đổi điểm vượt quá balance) |
| 429 | `RATE_LIMITED` | Quá nhiều request — retry sau `Retry-After` header |
| 500 | `INTERNAL_ERROR` | Lỗi server không xác định |
| 503 | `SERVICE_UNAVAILABLE` | Service tạm ngưng (maintenance) |

### 0.5 Pagination

Dùng cursor-based pagination cho danh sách lớn:

```
GET /get-transactions?cursor=<last_id>&limit=20&sort=desc
```

```typescript
// Response
{
  "success": true,
  "data": { "transactions": [...] },
  "meta": {
    "cursor": "txn_1234",        // Dùng cho page tiếp theo
    "has_next": true,
    "limit": 20
  }
}
```

### 0.6 Timestamp Convention

- Mọi timestamp dùng **ISO 8601** format: `"2026-03-08T14:30:00.000Z"`
- Timezone: **UTC** (server lưu UTC, client chuyển sang local timezone khi hiển thị)
- Numeric amounts: Dùng `number` (không dùng string), đơn vị **VNĐ** cho tiền, **điểm** cho points

---

## 1. Auth — Xác Thực

### 1.1 `POST /auth/signup`

Đăng ký tài khoản mới bằng số điện thoại.

**Auth:** Public (không cần token)

```typescript
// Request
{
  "phone": "+84901234567",         // E.164 format, bắt buộc
  "password": "secureP@ss123",     // Min 8 ký tự
  "full_name": "Nguyễn Văn A",
  "referral_code": "REF-ABC123"    // Optional — mã giới thiệu
}

// Response 201
{
  "success": true,
  "data": {
    "user_id": "uuid-...",
    "phone": "+84901234567",
    "confirmation_sent": true       // OTP đã gửi qua SMS
  }
}
```

### 1.2 `POST /auth/verify-otp`

Xác thực OTP sau đăng ký hoặc đăng nhập.

**Auth:** Public

```typescript
// Request
{
  "phone": "+84901234567",
  "otp": "123456",                  // 6 chữ số
  "type": "signup"                  // "signup" | "login" | "password_reset"
}

// Response 200
{
  "success": true,
  "data": {
    "access_token": "eyJhbG...",
    "refresh_token": "v1.MR...",
    "expires_in": 3600,             // Seconds
    "token_type": "bearer",
    "user": {
      "id": "uuid-...",
      "phone": "+84901234567",
      "full_name": "Nguyễn Văn A",
      "role": "customer"
    }
  }
}
```

### 1.3 `POST /auth/login`

Đăng nhập bằng SĐT + mật khẩu. Trả về JWT pair.

**Auth:** Public

```typescript
// Request
{
  "phone": "+84901234567",
  "password": "secureP@ss123"
}

// Response 200 — giống verify-otp response
```

### 1.4 `POST /auth/refresh`

Làm mới token khi access_token hết hạn.

**Auth:** Public (gửi refresh_token)

```typescript
// Request
{
  "refresh_token": "v1.MR..."
}

// Response 200
{
  "success": true,
  "data": {
    "access_token": "eyJhbG...(mới)",
    "refresh_token": "v1.MR...(mới)",
    "expires_in": 3600
  }
}
```

---

## 2. Loyalty — Tích Điểm & Hạng Thành Viên

### 2.1 `GET /get-loyalty-dashboard`

Lấy toàn bộ thông tin loyalty của member hiện tại. **Đây là API chính của Home Screen.**

**Auth:** JWT (customer)

```typescript
// Request: GET (no body, member inferred from JWT)

// Response 200
{
  "success": true,
  "data": {
    "member": {
      "id": 1001,
      "full_name": "Nguyễn Văn A",
      "phone": "+84901234567",
      "avatar_url": "https://...supabase.co/storage/v1/avatars/1001.jpg",
      "total_points": 2450,
      "available_points": 1850,     // Điểm có thể dùng (trừ đã đổi + hết hạn)
      "lifetime_points": 15200,     // Tổng điểm tích được từ trước đến nay
      "version": 42                 // Optimistic lock version
    },
    "tier": {
      "id": 3,
      "name": "Vàng",
      "tier_code": "gold",
      "point_multiplier": 1.5,
      "cashback_percent": 3.0,
      "benefits": [
        "Tích điểm x1.5",
        "Cashback 3%",
        "Ưu tiên đặt bàn",
        "Quà sinh nhật"
      ],
      "next_tier": {
        "name": "Kim Cương",
        "tier_code": "diamond",
        "min_points": 20000,
        "points_needed": 4800,      // 20000 - 15200
        "progress_percent": 76.0    // 15200/20000 * 100
      }
    },
    "recent_transactions": [
      {
        "id": 5001,
        "type": "earn",
        "points": 22,
        "balance_after": 1850,
        "description": "Tích điểm đơn #ORD-2026-0308",
        "reference_type": "order",
        "reference_id": 3456,
        "created_at": "2026-03-08T11:30:00.000Z"
      },
      {
        "id": 5000,
        "type": "checkin_bonus",
        "points": 5,
        "balance_after": 1828,
        "description": "Check-in chi nhánh Nguyễn Trãi",
        "reference_type": "checkin",
        "reference_id": 789,
        "created_at": "2026-03-08T08:15:00.000Z"
      }
    ],
    "active_promotions": [
      {
        "id": 101,
        "name": "Thứ 3 Vui Vẻ — Cashback x2",
        "description": "Hoàn điểm gấp đôi cho mọi đơn hàng vào thứ 3",
        "image_url": "https://...supabase.co/storage/v1/promotions/tues-2x.jpg",
        "cashback_type": "percent",
        "cashback_value": 6.0,      // 3% base × 2
        "start_date": "2026-03-01T00:00:00.000Z",
        "end_date": "2026-03-31T23:59:59.000Z",
        "eligible": true
      }
    ],
    "stats": {
      "total_checkins_this_month": 8,
      "total_orders_this_month": 5,
      "streak_days": 3              // Check-in liên tục
    }
  }
}
```

### 2.2 `POST /earn-points`

Tích điểm khi thanh toán. **Gọi bởi Cashier App / POS.**

**Auth:** JWT (cashier)

```typescript
// Request
{
  "member_id": 1001,                // ID member (quét QR thẻ hoặc SĐT lookup)
  "order_id": 3456,
  "amount": 150000,                 // Tổng tiền thanh toán (VNĐ)
  "idempotency_key": "01965abc-..."  // UUID v7
}

// Response 200
{
  "success": true,
  "data": {
    "points_earned": 22,            // floor(150000/10000) × 1.5 (Gold)
    "new_balance": 1872,
    "total_points": 2472,
    "tier_change": {                // null nếu không thay đổi hạng
      "from": { "name": "Vàng", "tier_code": "gold" },
      "to": { "name": "Kim Cương", "tier_code": "diamond" },
      "upgraded_at": "2026-03-08T11:30:00.000Z"
    },
    "transaction_id": 5002,
    "version": 43                   // New version sau update
  }
}
```

**Error cases:**

| HTTP | Code | Khi nào |
|------|------|---------|
| 404 | `MEMBER_NOT_FOUND` | `member_id` không tồn tại |
| 409 | `DUPLICATE_REQUEST` | `idempotency_key` đã xử lý |
| 409 | `VERSION_CONFLICT` | Concurrent update — POS retry |
| 422 | `INVALID_AMOUNT` | `amount <= 0` |

### 2.3 `POST /redeem-points`

Đổi điểm lấy phần thưởng.

**Auth:** JWT (customer)

```typescript
// Request
{
  "reward_id": 201,                 // ID phần thưởng muốn đổi
  "points": 500,                    // Điểm cần trừ
  "idempotency_key": "01965def-..."
}

// Response 200
{
  "success": true,
  "data": {
    "redemption_id": 6001,
    "reward": {
      "id": 201,
      "name": "Cơm tấm sườn bì chả miễn phí",
      "description": "Đổi 500 điểm lấy 1 phần cơm tấm sườn bì chả",
      "points_required": 500,
      "voucher_code": "RDM-2026-6001",  // Mã voucher cho cashier verify
      "expires_at": "2026-03-15T23:59:59.000Z"
    },
    "points_deducted": 500,
    "new_balance": 1372,
    "version": 44
  }
}
```

**Error cases:**

| HTTP | Code | Khi nào |
|------|------|---------|
| 422 | `INSUFFICIENT_POINTS` | `available_points < points` |
| 422 | `REWARD_UNAVAILABLE` | Phần thưởng hết hạn hoặc hết hàng |
| 422 | `REWARD_TIER_RESTRICTED` | Hạng hiện tại không đủ điều kiện |

### 2.4 `GET /get-promotions`

Lấy danh sách chương trình khuyến mãi đang hoạt động.

**Auth:** JWT (customer)

```typescript
// Request: GET /get-promotions?branch_id=5

// Response 200
{
  "success": true,
  "data": {
    "promotions": [
      {
        "id": 101,
        "name": "Thứ 3 Vui Vẻ — Cashback x2",
        "description": "Hoàn điểm gấp đôi mọi đơn vào thứ 3",
        "image_url": "https://...promotions/tues-2x.jpg",
        "cashback_type": "percent",   // "percent" | "fixed"
        "cashback_value": 6.0,
        "max_cashback": 50,           // Tối đa 50 điểm
        "min_order_amount": 50000,    // Đơn tối thiểu 50k
        "eligible_tiers": ["gold", "diamond"],
        "eligible": true,             // Đã check với tier hiện tại của user
        "start_date": "2026-03-01T00:00:00.000Z",
        "end_date": "2026-03-31T23:59:59.000Z"
      }
    ]
  }
}
```

### 2.5 `POST /process-cashback`

Áp dụng cashback sau thanh toán. **Gọi tự động bởi system sau khi earn-points thành công.**

**Auth:** JWT (system)

```typescript
// Request
{
  "member_id": 1001,
  "order_id": 3456,
  "program_id": 101                 // Chương trình cashback áp dụng
}

// Response 200
{
  "success": true,
  "data": {
    "cashback_amount": 9,           // floor(150000 × 6% / 10000) = 9 điểm
    "program_name": "Thứ 3 Vui Vẻ — Cashback x2",
    "new_balance": 1881,
    "transaction_id": 5003
  }
}
```

---

## 3. Check-in — Điểm Danh Tại Quán

### 3.1 `POST /verify-checkin`

Xác thực check-in bằng QR code hoặc geolocation.

**Auth:** JWT (customer)

```typescript
// Request — QR Code method
{
  "qr_payload": "eyJicmFuY2hfaW...",  // Base64url encoded QR payload
  "device_fingerprint": "fp_abc123def",
  "latitude": 10.7769,                 // Optional nhưng khuyến khích
  "longitude": 106.7009
}

// Request — Geolocation method
{
  "method": "geolocation",
  "branch_id": 5,
  "device_fingerprint": "fp_abc123def",
  "latitude": 10.7769,                 // Bắt buộc cho geo method
  "longitude": 106.7009
}

// Response 200
{
  "success": true,
  "data": {
    "checkin_id": 789,
    "branch": {
      "id": 5,
      "name": "Chi nhánh Nguyễn Trãi",
      "address": "123 Nguyễn Trãi, Q.5, TP.HCM"
    },
    "points_earned": 5,
    "new_balance": 1886,
    "streak": {
      "current": 4,                  // 4 ngày liên tiếp
      "bonus": 0,                    // Bonus thêm nếu đạt streak milestone
      "next_milestone": 7,           // Streak 7 ngày = bonus đặc biệt
      "next_milestone_bonus": 20
    },
    "checked_in_at": "2026-03-08T08:15:00.000Z"
  }
}
```

**Error cases:**

| HTTP | Code | Khi nào |
|------|------|---------|
| 400 | `INVALID_QR` | QR payload không decode được hoặc HMAC sai |
| 400 | `QR_EXPIRED` | QR quá hạn (> 60 giây) |
| 400 | `INVALID_LOCATION` | GPS cách quán > 100m |
| 409 | `ALREADY_CHECKED_IN` | Đã check-in chi nhánh này hôm nay |
| 422 | `SUSPICIOUS_DEVICE` | Device fingerprint bị flag fraud |

### 3.2 `GET /generate-qr`

Tạo mã QR động cho chi nhánh (rotate mỗi 30 giây).

**Auth:** JWT (staff)

```typescript
// Request: GET /generate-qr?branch_id=5

// Response 200
{
  "success": true,
  "data": {
    "qr_payload": "eyJicmFuY2hfaW...",  // Base64url(JSON({ branch_id, timestamp, nonce, hmac }))
    "expires_at": "2026-03-08T08:15:30.000Z",  // +30 giây
    "branch_id": 5,
    "rotation_interval_ms": 30000
  }
}
```

---

## 4. Delivery — Giao Hàng

### 4.1 `POST /check-delivery-zone`

Kiểm tra địa chỉ có nằm trong vùng giao hàng không.

**Auth:** JWT (customer)

```typescript
// Request
{
  "latitude": 10.7769,
  "longitude": 106.7009,
  "branch_id": 5                    // Optional — nếu không gửi, tìm chi nhánh gần nhất
}

// Response 200
{
  "success": true,
  "data": {
    "available": true,
    "branch": {
      "id": 5,
      "name": "Chi nhánh Nguyễn Trãi",
      "distance_km": 2.3
    },
    "zone": "zone_b",               // zone_a: 0-3km, zone_b: 3-5km, zone_c: 5-8km
    "delivery_fee": 20000,           // VNĐ
    "estimated_minutes": 25,
    "free_delivery_threshold": 200000  // Miễn phí ship nếu đơn >= 200k
  }
}
```

**Error cases:**

| HTTP | Code | Khi nào |
|------|------|---------|
| 422 | `OUT_OF_DELIVERY_ZONE` | Địa chỉ ngoài vùng giao hàng (> 8km) |
| 422 | `BRANCH_CLOSED` | Chi nhánh đã đóng cửa |

### 4.2 `POST /create-delivery-order`

Tạo đơn giao hàng.

**Auth:** JWT (customer)

```typescript
// Request
{
  "items": [
    { "menu_item_id": 10, "quantity": 2, "note": "Không hành" },
    { "menu_item_id": 15, "quantity": 1, "note": "" }
  ],
  "address_id": 301,               // Địa chỉ đã lưu, hoặc:
  "address": {                      // Địa chỉ mới (1 trong 2)
    "label": "Nhà",
    "full_address": "456 Lê Lợi, Q.1, TP.HCM",
    "latitude": 10.7730,
    "longitude": 106.7030,
    "phone": "+84901234567",
    "note": "Tầng 3, phòng 302"
  },
  "payment_method": "cod",         // "cod" | "momo" | "zalopay" | "bank_transfer"
  "coupon_code": "GIAM20K",        // Optional
  "note": "Giao trước 12h",        // Optional — ghi chú cho tài xế
  "idempotency_key": "01965ghi-..."
}

// Response 201
{
  "success": true,
  "data": {
    "order_id": 3457,
    "delivery_order_id": 7001,
    "status": "pending",            // pending → confirmed → preparing → picked_up → delivering → delivered
    "items": [
      { "menu_item_id": 10, "name": "Cơm tấm sườn bì chả", "quantity": 2, "unit_price": 55000, "subtotal": 110000 },
      { "menu_item_id": 15, "name": "Nước mía", "quantity": 1, "unit_price": 15000, "subtotal": 15000 }
    ],
    "subtotal": 125000,
    "delivery_fee": 20000,
    "discount": 20000,              // Từ coupon GIAM20K
    "total": 125000,                // 125000 + 20000 - 20000
    "estimated_delivery_at": "2026-03-08T12:00:00.000Z",
    "points_will_earn": 12,         // floor(125000/10000) × multiplier
    "created_at": "2026-03-08T11:35:00.000Z"
  }
}
```

### 4.3 `POST /update-delivery-status`

Cập nhật trạng thái đơn giao.

**Auth:** JWT (staff / driver)

```typescript
// Request
{
  "delivery_order_id": 7001,
  "status": "delivering",          // confirmed | preparing | picked_up | delivering | delivered | cancelled
  "latitude": 10.7750,             // Optional — vị trí tài xế
  "longitude": 106.7020
}

// Response 200
{
  "success": true,
  "data": {
    "delivery_order_id": 7001,
    "new_status": "delivering",
    "updated_at": "2026-03-08T11:50:00.000Z"
  }
}
// → Triggers Realtime push → Mobile App cập nhật tracking UI
// → Triggers push notification → "Tài xế đang trên đường giao hàng"
```

**Status Flow:**

```
pending → confirmed → preparing → picked_up → delivering → delivered
                                                    ↘
                                                  cancelled (bất kỳ lúc nào trước delivered)
```

### 4.4 `POST /update-driver-location`

Cập nhật vị trí realtime của tài xế (gọi mỗi 5-10 giây khi đang delivering).

**Auth:** JWT (driver)

```typescript
// Request
{
  "delivery_order_id": 7001,
  "latitude": 10.7755,
  "longitude": 106.7025
}

// Response 200
{
  "success": true,
  "data": { "recorded": true }
}
// → Realtime broadcast → Customer app hiển thị map pin di chuyển
```

### 4.5 `POST /rate-delivery`

Đánh giá đơn giao hàng sau khi nhận.

**Auth:** JWT (customer)

```typescript
// Request
{
  "delivery_order_id": 7001,
  "rating": 5,                     // 1-5 sao
  "tags": ["fast", "polite"],      // Optional — tags nhanh
  "comment": "Giao nhanh lắm!"     // Optional
}

// Response 200
{
  "success": true,
  "data": {
    "rating_id": 8001,
    "bonus_points": 2,              // Thưởng điểm khi đánh giá
    "new_balance": 1888
  }
}
```

---

## 5. Reservation — Đặt Bàn

### 5.1 `GET /get-available-slots`

Lấy danh sách khung giờ còn trống.

**Auth:** JWT (customer)

```typescript
// Request: GET /get-available-slots?branch_id=5&date=2026-03-10&party_size=4

// Response 200
{
  "success": true,
  "data": {
    "branch": {
      "id": 5,
      "name": "Chi nhánh Nguyễn Trãi",
      "address": "123 Nguyễn Trãi, Q.5, TP.HCM",
      "max_capacity": 60,
      "opens_at": "06:00",
      "closes_at": "22:00"
    },
    "date": "2026-03-10",
    "party_size": 4,
    "slots": [
      { "time": "11:00", "available": true,  "tables_left": 3 },
      { "time": "11:30", "available": true,  "tables_left": 2 },
      { "time": "12:00", "available": false, "tables_left": 0 },
      { "time": "12:30", "available": false, "tables_left": 0 },
      { "time": "13:00", "available": true,  "tables_left": 5 },
      { "time": "18:00", "available": true,  "tables_left": 4 },
      { "time": "18:30", "available": true,  "tables_left": 3 },
      { "time": "19:00", "available": true,  "tables_left": 1 },
      { "time": "19:30", "available": true,  "tables_left": 2 }
    ]
  }
}
```

### 5.2 `POST /create-reservation`

Đặt bàn.

**Auth:** JWT (customer)

```typescript
// Request
{
  "branch_id": 5,
  "date": "2026-03-10",
  "time": "18:30",
  "party_size": 4,
  "special_requests": "Bàn gần cửa sổ, có ghế trẻ em",  // Optional
  "idempotency_key": "01965jkl-..."
}

// Response 201
{
  "success": true,
  "data": {
    "reservation_id": 9001,
    "code": "RSV-20260310-9001",    // Mã đặt bàn — show cho staff khi đến
    "branch": {
      "id": 5,
      "name": "Chi nhánh Nguyễn Trãi",
      "address": "123 Nguyễn Trãi, Q.5, TP.HCM"
    },
    "date": "2026-03-10",
    "time": "18:30",
    "party_size": 4,
    "special_requests": "Bàn gần cửa sổ, có ghế trẻ em",
    "status": "confirmed",          // confirmed | cancelled | completed | no_show
    "points_earned": 3,             // Thưởng điểm khi đặt bàn
    "new_balance": 1891,
    "reminder_at": "2026-03-10T17:30:00.000Z"  // Push notification 1h trước
  }
}
```

**Error cases:**

| HTTP | Code | Khi nào |
|------|------|---------|
| 409 | `SLOT_UNAVAILABLE` | Khung giờ đã hết chỗ (race condition) |
| 422 | `INVALID_PARTY_SIZE` | `party_size` vượt quá giới hạn |
| 422 | `BRANCH_CLOSED_ON_DATE` | Chi nhánh nghỉ ngày đó |
| 422 | `TOO_MANY_ACTIVE_RESERVATIONS` | Member đã có >= 3 reservation chưa hoàn thành |

### 5.3 `POST /cancel-reservation`

Hủy đặt bàn.

**Auth:** JWT (customer)

```typescript
// Request
{
  "reservation_id": 9001,
  "reason": "Thay đổi kế hoạch"    // Optional
}

// Response 200
{
  "success": true,
  "data": {
    "reservation_id": 9001,
    "status": "cancelled",
    "points_deducted": 3,           // Trừ lại điểm đặt bàn (nếu có)
    "new_balance": 1888,
    "cancelled_at": "2026-03-09T10:00:00.000Z"
  }
}
```

**Error cases:**

| HTTP | Code | Khi nào |
|------|------|---------|
| 422 | `CANCELLATION_TOO_LATE` | Hủy trong vòng 1 giờ trước giờ đặt |
| 422 | `ALREADY_CANCELLED` | Đã hủy rồi |
| 422 | `ALREADY_COMPLETED` | Reservation đã hoàn thành |

---

## 6. CRM Sync — Đồng Bộ Nội Bộ

### 6.1 `POST /crm-sync-worker`

Worker xử lý sync_outbox queue. **Gọi bởi pg_cron mỗi 30 giây.**

**Auth:** Service key (internal)

```typescript
// Request: POST (no body — worker tự query outbox)

// Response 200
{
  "success": true,
  "data": {
    "processed": 12,               // Events sync thành công
    "failed": 1,                    // Events fail (sẽ retry)
    "pending": 3,                   // Events đang chờ (next_retry_at chưa đến)
    "total_in_queue": 16
  }
}
```

---

## 7. Realtime Subscriptions (WebSocket)

Front-End subscribe các channels sau qua Supabase Realtime:

### 7.1 Point & Tier Updates

```dart
// Flutter — Riverpod + Supabase Realtime
final pointUpdatesProvider = StreamProvider<PointUpdate>((ref) {
  final supabase = ref.watch(supabaseProvider);
  final memberId = ref.watch(currentMemberIdProvider);

  return supabase
    .from('point_transactions')
    .stream(primaryKey: ['id'])
    .eq('member_id', memberId)
    .order('created_at', ascending: false)
    .limit(1)
    .map((rows) => PointUpdate.fromJson(rows.first));
});
```

**Event payload (từ pg_notify):**

```typescript
// Channel: "point_earned"
{
  "member_id": 1001,
  "type": "earn",                   // earn | redeem | cashback | checkin_bonus
  "points": 22,
  "new_balance": 1872,
  "tier_changed": true,
  "new_tier": "diamond"
}
```

### 7.2 Delivery Tracking

```dart
// Flutter — subscribe delivery status changes
final deliveryTrackingProvider = StreamProvider.family<DeliveryStatus, int>(
  (ref, deliveryOrderId) {
    final supabase = ref.watch(supabaseProvider);

    return supabase
      .from('delivery_orders')
      .stream(primaryKey: ['id'])
      .eq('id', deliveryOrderId)
      .map((rows) => DeliveryStatus.fromJson(rows.first));
  },
);
```

**Event payload:**

```typescript
// Broadcast channel: "delivery:{delivery_order_id}"
{
  "delivery_order_id": 7001,
  "status": "delivering",
  "driver": {
    "name": "Trần Văn B",
    "phone": "+84909876543",
    "avatar_url": "https://..."
  },
  "location": {                     // Cập nhật mỗi 5-10 giây
    "latitude": 10.7755,
    "longitude": 106.7025
  },
  "estimated_arrival_minutes": 8
}
```

---

## 8. Shared Types — TypeScript (Backend) & Dart (Frontend)

### 8.1 Enums

```typescript
// === BACKEND (TypeScript / Zod) ===

export const PointTransactionType = z.enum([
  'earn', 'redeem', 'expire', 'adjust', 'cashback', 'checkin_bonus'
]);

export const TierCode = z.enum(['bronze', 'silver', 'gold', 'diamond']);

export const CheckinMethod = z.enum(['qr_code', 'geolocation']);

export const DeliveryStatus = z.enum([
  'pending', 'confirmed', 'preparing', 'picked_up', 'delivering', 'delivered', 'cancelled'
]);

export const PaymentMethod = z.enum(['cod', 'momo', 'zalopay', 'bank_transfer']);

export const ReservationStatus = z.enum(['confirmed', 'cancelled', 'completed', 'no_show']);

export const SyncOutboxStatus = z.enum(['pending', 'processing', 'completed', 'failed']);

export const CashbackType = z.enum(['percent', 'fixed']);
```

```dart
// === FRONTEND (Dart) ===

enum PointTransactionType { earn, redeem, expire, adjust, cashback, checkinBonus }

enum TierCode { bronze, silver, gold, diamond }

enum CheckinMethod { qrCode, geolocation }

enum DeliveryStatus { pending, confirmed, preparing, pickedUp, delivering, delivered, cancelled }

enum PaymentMethod { cod, momo, zalopay, bankTransfer }

enum ReservationStatus { confirmed, cancelled, completed, noShow }
```

### 8.2 Core Models (Dart — Frontend)

```dart
// lib/models/loyalty_member.dart
@freezed
class LoyaltyMember with _$LoyaltyMember {
  const factory LoyaltyMember({
    required int id,
    required String fullName,
    required String phone,
    String? avatarUrl,
    required double totalPoints,
    required double availablePoints,
    required double lifetimePoints,
    required int version,
  }) = _LoyaltyMember;

  factory LoyaltyMember.fromJson(Map<String, dynamic> json) =>
      _$LoyaltyMemberFromJson(json);
}

// lib/models/tier.dart
@freezed
class Tier with _$Tier {
  const factory Tier({
    required int id,
    required String name,
    required TierCode tierCode,
    required double pointMultiplier,
    required double cashbackPercent,
    required List<String> benefits,
    TierProgress? nextTier,
  }) = _Tier;

  factory Tier.fromJson(Map<String, dynamic> json) => _$TierFromJson(json);
}

@freezed
class TierProgress with _$TierProgress {
  const factory TierProgress({
    required String name,
    required TierCode tierCode,
    required double minPoints,
    required double pointsNeeded,
    required double progressPercent,
  }) = _TierProgress;

  factory TierProgress.fromJson(Map<String, dynamic> json) =>
      _$TierProgressFromJson(json);
}

// lib/models/point_transaction.dart
@freezed
class PointTransaction with _$PointTransaction {
  const factory PointTransaction({
    required int id,
    required PointTransactionType type,
    required double points,
    required double balanceAfter,
    required String description,
    String? referenceType,
    int? referenceId,
    required DateTime createdAt,
  }) = _PointTransaction;

  factory PointTransaction.fromJson(Map<String, dynamic> json) =>
      _$PointTransactionFromJson(json);
}

// lib/models/checkin_result.dart
@freezed
class CheckinResult with _$CheckinResult {
  const factory CheckinResult({
    required int checkinId,
    required Branch branch,
    required double pointsEarned,
    required double newBalance,
    required CheckinStreak streak,
    required DateTime checkedInAt,
  }) = _CheckinResult;

  factory CheckinResult.fromJson(Map<String, dynamic> json) =>
      _$CheckinResultFromJson(json);
}

@freezed
class CheckinStreak with _$CheckinStreak {
  const factory CheckinStreak({
    required int current,
    required int bonus,
    required int nextMilestone,
    required int nextMilestoneBonus,
  }) = _CheckinStreak;

  factory CheckinStreak.fromJson(Map<String, dynamic> json) =>
      _$CheckinStreakFromJson(json);
}

// lib/models/delivery_order.dart
@freezed
class DeliveryOrder with _$DeliveryOrder {
  const factory DeliveryOrder({
    required int orderId,
    required int deliveryOrderId,
    required DeliveryStatus status,
    required List<OrderItem> items,
    required double subtotal,
    required double deliveryFee,
    required double discount,
    required double total,
    required DateTime estimatedDeliveryAt,
    required int pointsWillEarn,
    required DateTime createdAt,
  }) = _DeliveryOrder;

  factory DeliveryOrder.fromJson(Map<String, dynamic> json) =>
      _$DeliveryOrderFromJson(json);
}

// lib/models/reservation.dart
@freezed
class Reservation with _$Reservation {
  const factory Reservation({
    required int reservationId,
    required String code,
    required Branch branch,
    required String date,
    required String time,
    required int partySize,
    String? specialRequests,
    required ReservationStatus status,
    required DateTime reminderAt,
  }) = _Reservation;

  factory Reservation.fromJson(Map<String, dynamic> json) =>
      _$ReservationFromJson(json);
}
```

---

## 9. API Summary Table

| # | Endpoint | Method | Auth | Mô tả |
|---|----------|--------|------|--------|
| 1 | `/auth/signup` | POST | Public | Đăng ký bằng SĐT |
| 2 | `/auth/verify-otp` | POST | Public | Xác thực OTP |
| 3 | `/auth/login` | POST | Public | Đăng nhập SĐT + mật khẩu |
| 4 | `/auth/refresh` | POST | Public | Làm mới token |
| 5 | `/get-loyalty-dashboard` | GET | Customer | Home screen data |
| 6 | `/earn-points` | POST | Cashier | Tích điểm khi thanh toán |
| 7 | `/redeem-points` | POST | Customer | Đổi điểm lấy phần thưởng |
| 8 | `/get-promotions` | GET | Customer | Danh sách khuyến mãi |
| 9 | `/process-cashback` | POST | System | Áp dụng cashback |
| 10 | `/verify-checkin` | POST | Customer | Check-in tại quán |
| 11 | `/generate-qr` | GET | Staff | Tạo QR check-in cho chi nhánh |
| 12 | `/check-delivery-zone` | POST | Customer | Kiểm tra vùng giao hàng |
| 13 | `/create-delivery-order` | POST | Customer | Tạo đơn giao hàng |
| 14 | `/update-delivery-status` | POST | Staff/Driver | Cập nhật trạng thái giao |
| 15 | `/update-driver-location` | POST | Driver | Vị trí tài xế realtime |
| 16 | `/rate-delivery` | POST | Customer | Đánh giá giao hàng |
| 17 | `/get-available-slots` | GET | Customer | Khung giờ đặt bàn |
| 18 | `/create-reservation` | POST | Customer | Đặt bàn |
| 19 | `/cancel-reservation` | POST | Customer | Hủy đặt bàn |
| 20 | `/crm-sync-worker` | POST | Service key | Worker sync CRM |

---

*API Contract v1.0 · Ngày tạo: 2026-03-08*
*Dùng chung cho: Flutter Mobile App ↔ Supabase Edge Functions*
*Mọi thay đổi phải được cả FE & BE review trước khi merge.*
