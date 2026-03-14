# API Documentation — Cơm tấm Má Tư F&B CRM

> Tài liệu mô tả toàn bộ HTTP API endpoints và Server Actions của hệ thống.
> Cập nhật: 2026-03-07

---

## Mục lục

1. [HTTP API Routes](#1-http-api-routes)
   - [Health Check](#11-health-check)
   - [Auth Callback](#12-auth-callback)
   - [Webhooks](#13-webhooks)
   - [Cron Jobs](#14-cron-jobs)
   - [Privacy (GDPR/DSAR)](#15-privacy-gdprdsar)
   - [Push Notifications](#16-push-notifications)
2. [Server Actions — Xác thực (Auth)](#2-server-actions--xác-thực-auth)
3. [Server Actions — POS (Điểm bán hàng)](#3-server-actions--pos-điểm-bán-hàng)
   - [Đơn hàng (Orders)](#31-đơn-hàng-orders)
   - [Thu ngân (Cashier)](#32-thu-ngân-cashier)
   - [Ca làm việc (Sessions)](#33-ca-làm-việc-sessions)
   - [Máy in (Printer)](#34-máy-in-printer)
   - [Thông báo POS](#35-thông-báo-pos)
4. [Server Actions — KDS (Bếp)](#4-server-actions--kds-bếp)
5. [Server Actions — Admin](#5-server-actions--admin)
   - [Dashboard](#51-dashboard)
   - [Quản lý thực đơn (Menu)](#52-quản-lý-thực-đơn-menu)
   - [Quản lý đơn hàng](#53-quản-lý-đơn-hàng)
   - [Quản lý kho (Inventory)](#54-quản-lý-kho-inventory)
   - [Nhân sự (HR)](#55-nhân-sự-hr)
   - [CRM (Khách hàng & Voucher)](#56-crm-khách-hàng--voucher)
   - [Thiết bị & Terminal](#57-thiết-bị--terminal)
   - [Trạm KDS](#58-trạm-kds)
   - [Thanh toán](#59-thanh-toán)
   - [Bàn ăn (Tables)](#510-bàn-ăn-tables)
   - [Cài đặt (Settings)](#511-cài-đặt-settings)
   - [Báo cáo (Reports)](#512-báo-cáo-reports)
   - [Bảo mật (Security)](#513-bảo-mật-security)
   - [Thông báo kho](#514-thông-báo-kho)
   - [Chiến dịch (Campaigns)](#515-chiến-dịch-campaigns)
6. [Server Actions — Nhân viên (Employee)](#6-server-actions--nhân-viên-employee)
7. [Server Actions — Khách hàng (Customer PWA)](#7-server-actions--khách-hàng-customer-pwa)
8. [Xác thực & Phân quyền](#8-xác-thực--phân-quyền)
9. [Mã lỗi chung](#9-mã-lỗi-chung)
10. [Rate Limiting](#10-rate-limiting)

---

## 1. HTTP API Routes

### 1.1 Health Check

```
GET /api/health
```

**Xác thực:** Không yêu cầu (public)

**Mô tả:** Kiểm tra trạng thái hệ thống và kết nối database.

**Response 200:**

```json
{
  "status": "healthy",
  "timestamp": "2026-03-07T10:00:00.000Z",
  "checks": {
    "database": {
      "status": "healthy",
      "latency_ms": 12
    }
  },
  "version": "1.0.0"
}
```

**Response 503:** Database không khả dụng (cùng cấu trúc, `status: "unhealthy"`).

**Headers:** `Cache-Control: no-store`

---

### 1.2 Auth Callback

```
GET /api/auth/callback
```

**Xác thực:** Không yêu cầu (Supabase OAuth flow)

**Query params:**
| Param | Kiểu | Bắt buộc | Mô tả |
|-------|-------|----------|-------|
| `code` | string | Có | Mã xác thực từ Supabase |
| `next` | string | Không | Đường dẫn redirect sau đăng nhập (mặc định `/`) |

**Hành vi:** Đổi `code` lấy session, redirect đến `next`. Nếu thất bại → redirect `/login?error=auth_callback_failed`.

---

### 1.3 Webhooks

#### POST /api/webhooks/momo

**Xác thực:** HMAC SHA256 signature verification

**Rate limit:** 1000 req/phút (theo IP)

**Mô tả:** Nhận IPN (Instant Payment Notification) từ Momo sau khi khách thanh toán.

**Request Body (MomoIPNPayload):**
| Field | Kiểu | Mô tả |
|-------|-------|-------|
| `requestId` | string | ID giao dịch (dùng làm idempotency key) |
| `transId` | number | Mã giao dịch Momo |
| `resultCode` | number | `0` = thành công |
| `amount` | number | Số tiền (VNĐ) |
| `signature` | string | Chữ ký HMAC |
| `responseTime` | number | Unix timestamp (ms) |

**Bảo mật:**

- Xác minh HMAC signature với `MOMO_SECRET_KEY`
- Từ chối webhook cũ hơn 1 giờ
- Ghi log `security_events` khi HMAC thất bại

**Response:**

```json
{ "resultCode": 0, "message": "ok" }
```

**Lỗi:** `400` (signature/request không hợp lệ), `429` (rate limit), `500` (lỗi xử lý)

---

### 1.4 Cron Jobs

> Tất cả cron jobs yêu cầu header `Authorization: Bearer <CRON_SECRET>`.

#### GET /api/cron/process-deletions

**Lịch chạy:** Hàng ngày lúc 3:00 UTC

**Mô tả:** Xử lý các yêu cầu xóa dữ liệu GDPR đã quá hạn 30 ngày.

**Hành vi:**

1. Tìm `deletion_requests` có `status=pending` và `scheduled_deletion_at <= NOW()`
2. Ẩn danh hóa PII khách hàng (`full_name` → `[Đã xóa]`, `phone` → `[Đã xóa]`)
3. Null hóa `customer_id` trên đơn hàng (giữ dữ liệu kế toán)
4. Xóa `loyalty_transactions` và `customer_feedback`
5. Ghi `security_events` cho compliance tracking

**Response:**

```json
{
  "message": "Processed 3 deletion requests",
  "processed": 3,
  "total": 3,
  "errors": []
}
```

---

#### GET /api/cron/inventory-alerts

**Lịch chạy:** Hàng ngày lúc 5:00 UTC

**Mô tả:** Kiểm tra tồn kho thấp và nguyên liệu sắp hết hạn cho tất cả chi nhánh.

**Hành vi:**

- Kiểm tra `stock_levels.quantity <= ingredients.min_stock` → cảnh báo tồn kho thấp
- Kiểm tra `stock_batches.expiry_date` trong vòng 3 ngày → cảnh báo hết hạn
- Tự động loại trùng (mỗi cảnh báo chỉ tạo 1 lần/ngày)
- Gửi push notification cho vai trò `owner`, `manager`, `inventory`

**Response:**

```json
{
  "message": "Created 5 alerts across 2 branches",
  "alerts_created": 5,
  "branches_checked": 2
}
```

---

#### GET /api/cron/upgrade-tiers

**Lịch chạy:** Hàng ngày lúc 4:00 UTC

**Mô tả:** Tự động nâng hạng loyalty cho khách hàng dựa trên điểm tích lũy.

**Response:**

```json
{
  "message": "Checked 150 customers, upgraded 3",
  "checked": 150,
  "upgraded": 3
}
```

---

### 1.5 Privacy (GDPR/DSAR)

#### GET /api/privacy/data-export

**Xác thực:** Customer session (cookie-based)

**Rate limit:** Theo customer ID

**Mô tả:** Xuất toàn bộ dữ liệu cá nhân của khách hàng (DSAR compliance).

**Response:** JSON file download (`Content-Disposition: attachment`) chứa:

- Thông tin khách hàng
- Lịch sử giao dịch loyalty
- Phản hồi/đánh giá
- Lịch sử đơn hàng (bao gồm chi tiết món)

---

#### GET /api/privacy/deletion-request

**Xác thực:** Customer session

**Mô tả:** Kiểm tra trạng thái yêu cầu xóa dữ liệu mới nhất.

**Response:**

```json
{
  "deletion_request": {
    "id": 1,
    "status": "pending",
    "reason": "...",
    "scheduled_deletion_at": "2026-04-06T...",
    "created_at": "2026-03-07T...",
    "completed_at": null
  }
}
```

---

#### POST /api/privacy/deletion-request

**Xác thực:** Customer session

**Rate limit:** Theo customer ID

**Mô tả:** Tạo yêu cầu xóa dữ liệu với thời gian chờ 30 ngày (grace period).

**Request Body:**
| Field | Kiểu | Bắt buộc | Mô tả |
|-------|-------|----------|-------|
| `reason` | string | Không | Lý do yêu cầu xóa |

**Validation Schema:** `deletionRequestSchema` (Zod)

**Response 201:**

```json
{
  "deletion_request": {
    "id": 1,
    "status": "pending",
    "scheduled_deletion_at": "2026-04-06T...",
    "created_at": "2026-03-07T..."
  }
}
```

**Lỗi:** `409` nếu đã có yêu cầu pending.

---

### 1.6 Push Notifications

#### POST /api/push/subscribe

**Xác thực:** Authenticated user (bất kỳ vai trò)

**Rate limit:** Theo user ID

**Mô tả:** Đăng ký push subscription cho người dùng.

**Request Body:**
| Field | Kiểu | Bắt buộc | Mô tả |
|-------|-------|----------|-------|
| `endpoint` | string | Có | Push subscription endpoint |
| `keys.p256dh` | string | Có | Public key |
| `keys.auth` | string | Có | Auth secret |
| `notification_types` | string[] | Không | Loại thông báo muốn nhận |

**Validation Schema:** `subscribePushSchema` (Zod)

**Response:** `{ "ok": true }`

---

#### DELETE /api/push/subscribe

**Xác thực:** Authenticated user

**Mô tả:** Hủy đăng ký push subscription.

**Request Body:**
| Field | Kiểu | Bắt buộc | Mô tả |
|-------|-------|----------|-------|
| `endpoint` | string | Có | Push subscription endpoint cần hủy |

**Validation Schema:** `unsubscribePushSchema` (Zod)

**Response:** `{ "ok": true }`

---

## 2. Server Actions — Xác thực (Auth)

> File: `apps/web/app/login/actions.ts`

### login(formData: FormData)

**Mô tả:** Đăng nhập bằng email/password. Hỗ trợ device fingerprinting cho nhân viên (waiter, cashier, chef).

**Rate limit:** 5 req/15 phút (theo IP)

**Input (FormData):**
| Field | Kiểu | Bắt buộc | Mô tả |
|-------|-------|----------|-------|
| `email` | string | Có | Email đăng nhập |
| `password` | string | Có | Mật khẩu (tối thiểu 6 ký tự) |
| `device_fingerprint` | string | Không* | Fingerprint thiết bị (*bắt buộc cho waiter/cashier/chef) |
| `device_name` | string | Không | Tên thiết bị |

**Hành vi:**

- Owner/Manager/HR/Customer → redirect thẳng theo vai trò
- Waiter/Cashier/Chef → kiểm tra device fingerprint:
  - Thiết bị đã approved → redirect
  - Thiết bị pending → trả về `pendingApproval: true` + `approvalCode`
  - Thiết bị mới → đăng ký, trả về pending

**Redirect theo vai trò:**
| Vai trò | Đường dẫn |
|---------|-----------|
| owner, manager | `/admin` |
| cashier, waiter | `/pos` |
| chef | `/kds` |
| hr | `/admin/hr` |
| customer | `/customer` |

---

### checkDeviceStatus(deviceId: number)

**Mô tả:** Kiểm tra trạng thái phê duyệt thiết bị (polling từ trang chờ).

**Return:** `{ status: "pending" | "approved" | "rejected" }`

---

### logout()

**Mô tả:** Đăng xuất và redirect về `/login`.

---

## 3. Server Actions — POS (Điểm bán hàng)

### 3.1 Đơn hàng (Orders)

> File: `apps/web/app/(pos)/pos/orders/order-mutations.ts`, `order-queries.ts`

#### createOrder(data)

**Vai trò:** Authenticated POS user
**Validation:** `createOrderSchema`

**Input:**
| Field | Kiểu | Bắt buộc | Mô tả |
|-------|-------|----------|-------|
| `table_id` | number \| null | Không* | ID bàn (*bắt buộc nếu `type=dine_in`) |
| `type` | string | Có | `dine_in`, `takeaway`, `delivery` |
| `notes` | string | Không | Ghi chú đơn hàng |
| `guest_count` | number \| null | Không | Số khách (kiểm tra sức chứa bàn) |
| `terminal_id` | number | Có | ID terminal POS |
| `items` | array | Có | Danh sách món (tối thiểu 1) |
| `items[].menu_item_id` | number | Có | ID món ăn |
| `items[].variant_id` | number \| null | Không | ID biến thể |
| `items[].quantity` | number | Có | Số lượng |
| `items[].modifiers` | array | Không | Modifier `{ name, price }` |
| `items[].notes` | string | Không | Ghi chú món |
| `items[].side_items` | array | Không | Món kèm `{ menu_item_id, quantity, notes }` |

**Hành vi:**

- Kiểm tra terminal thuộc chi nhánh, đã approved, đúng loại (mobile_order/cashier_station)
- Kiểm tra tồn kho ở cấp global và branch (86'd items)
- Kiểm tra side items phải nằm trong danh sách cho phép
- Tự động tính tổng (subtotal + tax + service charge)
- Đánh dấu bàn `occupied` nếu dine-in

**Return:**

```json
{
  "error": null,
  "orderId": 123,
  "orderNumber": "B1-001"
}
```

---

#### confirmOrder(orderId: number)

**Mô tả:** Xác nhận đơn hàng (chuyển trạng thái `draft → confirmed`). Wrapper cho `updateOrderStatus`.

---

#### updateOrderStatus(data)

**Validation:** `updateOrderStatusSchema`

**Input:**
| Field | Kiểu | Bắt buộc | Mô tả |
|-------|-------|----------|-------|
| `order_id` | number | Có | ID đơn hàng |
| `status` | string | Có | Trạng thái mới |

**State Machine (Order):**

```
draft → confirmed → preparing → ready → served → completed
                                                 ↘ cancelled
draft → cancelled
confirmed → cancelled
```

**Hành vi:**

- Kiểm tra quyền chi nhánh
- Validate state transition
- Broadcast realtime notification
- Gửi push notification theo vai trò
- Giải phóng bàn khi completed/cancelled (chỉ khi không còn đơn active khác)

---

#### addOrderItems(data)

**Validation:** `addOrderItemsSchema`

**Input:**
| Field | Kiểu | Bắt buộc | Mô tả |
|-------|-------|----------|-------|
| `order_id` | number | Có | ID đơn hàng (chưa completed/cancelled) |
| `items` | array | Có | Danh sách món mới (cấu trúc giống `createOrder`) |

**Hành vi:**

- Từ chối nếu đơn đã completed/cancelled
- Tính giá tự động (base + variant + modifiers)
- Cập nhật tổng đơn hàng

---

#### getOrders(filters?)

**Input (optional):**
| Field | Kiểu | Mô tả |
|-------|-------|-------|
| `status` | string | Lọc theo trạng thái |
| `type` | string | Lọc theo loại đơn |

**Return:** 50 đơn hàng mới nhất, bao gồm thông tin bàn và chi tiết món.

---

#### getOrderDetail(orderId: number)

**Return:** Chi tiết đầy đủ của đơn hàng: món ăn, thanh toán, lịch sử trạng thái, thông tin bàn.

---

#### getTables()

**Return:** Danh sách bàn của chi nhánh hiện tại (kèm tên zone).

---

#### getTablesWithActiveOrders()

**Return:** Tất cả bàn kèm danh sách đơn active trên mỗi bàn. Hỗ trợ multi-order-per-table.

---

#### getMenuItems()

**Return:** Danh sách món khả dụng (lọc cả global + branch 86'd), kèm variants, categories, available side IDs.

---

#### getMenuCategories()

**Return:** Danh sách danh mục menu theo thứ tự sắp xếp.

---

### 3.2 Thu ngân (Cashier)

> File: `apps/web/app/(pos)/pos/cashier/`

#### processPayment(data)

**Vai trò:** `cashier`, `owner`, `manager`
**Validation:** `processPaymentSchema`

**Input:**
| Field | Kiểu | Bắt buộc | Mô tả |
|-------|-------|----------|-------|
| `order_id` | number | Có | ID đơn hàng |
| `method` | `"cash"` \| `"qr"` | Có | Phương thức thanh toán |
| `amount_tendered` | number | Không* | Số tiền khách đưa (*bắt buộc nếu `cash`) |
| `tip` | number | Không | Tiền tip (mặc định 0) |

**Bắt buộc:** Phải có ca mở (`pos_sessions.status=open`) trên terminal `cashier_station`.

**Hành vi:**

- Cash: hoàn thành ngay, tính tiền thừa, giải phóng bàn, tăng `voucher.used_count` nếu có
- QR: tạo payment pending, chờ webhook IPN

**Return:**

```json
{
  "error": null,
  "change": 5000,
  "paymentAmount": 150000,
  "tip": 0,
  "idempotencyKey": "uuid",
  "method": "cash"
}
```

---

#### createMomoPayment(orderId: number)

**Vai trò:** Cashier roles

**Mô tả:** Tạo yêu cầu thanh toán Momo, trả về QR code URL.

**Return:**

```json
{
  "error": null,
  "qrCodeUrl": "https://...",
  "payUrl": "https://...",
  "paymentId": 1,
  "idempotencyKey": "uuid"
}
```

---

#### checkPaymentStatus(paymentId: number)

**Vai trò:** Cashier roles

**Return:**

```json
{
  "error": null,
  "status": "completed",
  "reference_no": "...",
  "paid_at": "2026-03-07T..."
}
```

---

#### validateVoucher(data)

**Validation:** `validateVoucherSchema`

**Input:**
| Field | Kiểu | Bắt buộc | Mô tả |
|-------|-------|----------|-------|
| `code` | string | Có | Mã voucher |
| `branch_id` | number | Có | ID chi nhánh |
| `subtotal` | number | Có | Subtotal đơn hàng |

**Kiểm tra:** Hạn sử dụng, lượt dùng, chi nhánh áp dụng, đơn tối thiểu.

**Return:**

```json
{
  "error": null,
  "voucher_id": 1,
  "code": "SALE10",
  "type": "percent",
  "value": 10,
  "discount_amount": 15000
}
```

---

#### applyVoucherToOrder(data)

**Validation:** `applyVoucherSchema`

**Input:**
| Field | Kiểu | Bắt buộc | Mô tả |
|-------|-------|----------|-------|
| `order_id` | number | Có | ID đơn hàng |
| `voucher_code` | string | Có | Mã voucher |

**Hành vi:** Validate voucher → tạo `order_discounts` → tính lại tổng đơn hàng → audit log.

---

#### removeVoucherFromOrder(orderId: number)

**Mô tả:** Xóa voucher khỏi đơn hàng và tính lại tổng.

---

#### getCashierOrders()

**Return:** Đơn hàng có trạng thái `confirmed`, `preparing`, `ready`, `served` (sẵn sàng thanh toán).

---

### 3.3 Ca làm việc (Sessions)

> File: `apps/web/app/(pos)/pos/session/actions.ts`

#### getActiveSession()

**Vai trò:** Cashier roles

**Return:** Ca đang mở của cashier hiện tại (bao gồm thông tin terminal).

---

#### getUserLinkedTerminal()

**Return:** Terminal liên kết với thiết bị đã approved của user (cashier_station, active).

---

#### getTerminalsForSession()

**Return:** Danh sách terminal cashier_station đã approved của chi nhánh.

---

#### openSession(formData: FormData)

**Validation:** `openSessionSchema`

**Input (FormData):**
| Field | Kiểu | Bắt buộc | Mô tả |
|-------|-------|----------|-------|
| `terminal_id` | number | Có | ID terminal (phải là `cashier_station`) |
| `opening_amount` | number | Có | Số tiền đầu ca |

**Kiểm tra:**

- Terminal phải là `cashier_station`, active, approved, cùng chi nhánh
- Cashier chưa có ca mở
- Terminal chưa có ca mở bởi người khác

---

#### closeSession(formData: FormData)

**Validation:** `closeSessionSchema`

**Input (FormData):**
| Field | Kiểu | Bắt buộc | Mô tả |
|-------|-------|----------|-------|
| `session_id` | number | Có | ID ca làm việc |
| `closing_amount` | number | Có | Số tiền cuối ca |
| `notes` | string | Không | Ghi chú |

**Hành vi:** Tính `expected_amount` (opening + cash payments), `difference = closing - expected`.

---

#### getSessionSummary(sessionId: number)

**Return:**

```json
{
  "totalPayments": 1500000,
  "cashTotal": 800000,
  "transactionCount": 12
}
```

---

### 3.4 Máy in (Printer)

> File: `apps/web/app/(pos)/pos/printer/actions.ts`

**Vai trò:** POS roles

| Action                               | Mô tả                                                     |
| ------------------------------------ | --------------------------------------------------------- |
| `getCurrentTerminal()`               | Lấy terminal hiện tại từ ca đang mở                       |
| `getPrintersForTerminal(terminalId)` | Danh sách máy in gán cho terminal                         |
| `getPrintersForBranch()`             | Danh sách máy in của chi nhánh                            |
| `getTerminalsForBranch()`            | Danh sách terminal đã approved                            |
| `getKdsStationsForBranch()`          | Danh sách trạm KDS active                                 |
| `createPrinter(formData)`            | Tạo cấu hình máy in (schema: `createPrinterConfigSchema`) |
| `updatePrinter(formData)`            | Cập nhật máy in (schema: `updatePrinterConfigSchema`)     |
| `deletePrinter(formData)`            | Xóa máy in                                                |

---

### 3.5 Thông báo POS

> File: `apps/web/app/(pos)/pos/notifications/actions.ts`

| Action                     | Mô tả                          |
| -------------------------- | ------------------------------ |
| `getNotifications()`       | 20 thông báo mới nhất của user |
| `getUnreadCount()`         | Số thông báo chưa đọc          |
| `markNotificationRead(id)` | Đánh dấu đã đọc                |
| `markAllRead()`            | Đánh dấu tất cả đã đọc         |

---

## 4. Server Actions — KDS (Bếp)

> File: `apps/web/app/(kds)/kds/[stationId]/actions.ts`

**Vai trò:** `chef`, `owner`, `manager`

#### getStationTickets(stationId: number)

**Mô tả:** Lấy ticket đang active (`pending`, `preparing`) của trạm KDS, kèm thông tin đơn hàng và bàn.

---

#### getStationInfo(stationId: number)

**Return:** Thông tin trạm KDS (id, name, branch_id, is_active).

---

#### getTimingRules(stationId: number)

**Return:** Quy tắc thời gian chế biến theo danh mục (prep_time, warning, critical).

---

#### bumpTicket(ticketId: number, newStatus: "preparing" | "ready")

**Validation:** `bumpTicketSchema`

**State Machine (KDS Ticket):**

```
pending → preparing → ready
pending → ready (nhảy cóc)
```

**Hành vi:**

- Cập nhật `accepted_at` khi bắt đầu chế biến
- Cập nhật `completed_at` khi hoàn thành
- Broadcast notification `order_ready` đến POS clients khi `ready`

---

#### KDS Printer Actions

> File: `apps/web/app/(kds)/kds/printer/actions.ts`

Tương tự POS Printer nhưng scoped cho KDS roles và `assigned_to_type=kds_station`.

---

## 5. Server Actions — Admin

### 5.1 Dashboard

> File: `apps/web/app/(admin)/admin/actions.ts`

**Vai trò:** `owner`, `manager`

| Action                                    | Input        | Mô tả                                                    |
| ----------------------------------------- | ------------ | -------------------------------------------------------- |
| `getDashboardStats()`                     | —            | Doanh thu hôm nay/tuần/tháng, số đơn, giá trị trung bình |
| `getRecentOrders(limit?)`                 | limit: 1-50  | N đơn hàng gần nhất (mặc định 10)                        |
| `getTopSellingItems(limit?)`              | limit: 1-50  | Top món bán chạy 30 ngày qua                             |
| `getOrderStatusCounts()`                  | —            | Số đơn theo trạng thái (hôm nay)                         |
| `getRevenueTrend(days?)`                  | days: 1-90   | Doanh thu & đơn theo ngày (mặc định 7)                   |
| `getHourlyOrderVolume()`                  | —            | Biểu đồ đơn hàng theo giờ (6h-23h, hôm nay)              |
| `getOrderStatusDistribution()`            | —            | Phân bố trạng thái đơn (cho pie chart)                   |
| `getBranchComparison(startDate, endDate)` | `YYYY-MM-DD` | So sánh doanh thu/đơn giữa các chi nhánh                 |

---

### 5.2 Quản lý thực đơn (Menu)

> File: `apps/web/app/(admin)/admin/menu/actions.ts`

**Vai trò:** Admin (owner/manager)

#### Menu CRUD

| Action                     | Input                 | Validation   | Mô tả                                         |
| -------------------------- | --------------------- | ------------ | --------------------------------------------- |
| `getMenus()`               | —                     | —            | Danh sách thực đơn                            |
| `createMenu(formData)`     | name, type, is_active | `menuSchema` | Tạo thực đơn                                  |
| `updateMenu(id, formData)` | name, type, is_active | `menuSchema` | Cập nhật thực đơn                             |
| `deleteMenu(id)`           | —                     | —            | Xóa thực đơn (chặn nếu có đơn hàng liên quan) |

#### Category CRUD

| Action                     | Input                           | Validation           | Mô tả              |
| -------------------------- | ------------------------------- | -------------------- | ------------------ |
| `getCategories(menuId)`    | —                               | —                    | Danh mục theo menu |
| `createCategory(formData)` | menu_id, name, sort_order, type | `menuCategorySchema` | Tạo danh mục       |
| `deleteCategory(id)`       | —                               | —                    | Xóa danh mục       |

**Loại danh mục (`type`):** `main_dish`, `side_dish`

#### Menu Item CRUD

| Action                         | Input                                                    | Validation       | Mô tả                                          |
| ------------------------------ | -------------------------------------------------------- | ---------------- | ---------------------------------------------- |
| `getMenuItems(categoryId)`     | —                                                        | —                | Món ăn theo danh mục (kèm variants, modifiers) |
| `createMenuItem(formData)`     | category_id, name, description, base_price, is_available | `menuItemSchema` | Tạo món ăn                                     |
| `updateMenuItem(id, formData)` | —                                                        | `menuItemSchema` | Cập nhật món ăn                                |
| `deleteMenuItem(id)`           | —                                                        | —                | Xóa món ăn (chặn nếu có đơn hàng liên quan)    |

#### Side Items Management

| Action                                                  | Input | Mô tả                               |
| ------------------------------------------------------- | ----- | ----------------------------------- |
| `getAvailableSides(menuItemId)`                         | —     | Danh sách món kèm cho phép          |
| `getSideItems(menuId)`                                  | —     | Tất cả side_dish items trong menu   |
| `updateAvailableSides({ menu_item_id, side_item_ids })` | —     | Cập nhật danh sách món kèm cho phép |

---

### 5.3 Quản lý đơn hàng

> File: `apps/web/app/(admin)/admin/orders/actions.ts`

| Action             | Mô tả                                                                    |
| ------------------ | ------------------------------------------------------------------------ |
| `getBranches()`    | Danh sách chi nhánh                                                      |
| `getAdminOrders()` | 500 đơn hàng mới nhất (tất cả chi nhánh), kèm chi tiết món và thanh toán |

---

### 5.4 Quản lý kho (Inventory)

> File: `apps/web/app/(admin)/admin/inventory/actions.ts` (barrel)

#### Nguyên liệu (Ingredients)

| Action                           | Mô tả                 |
| -------------------------------- | --------------------- |
| `getIngredients()`               | Danh sách nguyên liệu |
| `createIngredient(formData)`     | Tạo nguyên liệu       |
| `updateIngredient(id, formData)` | Cập nhật nguyên liệu  |
| `deleteIngredient(id)`           | Xóa nguyên liệu       |

#### Tồn kho (Stock)

| Action                                      | Mô tả                      |
| ------------------------------------------- | -------------------------- |
| `getStockLevels(branchId?)`                 | Mức tồn kho theo chi nhánh |
| `initStockLevel(data)`                      | Khởi tạo mức tồn kho       |
| `getStockMovements(ingredientId, branchId)` | Lịch sử nhập/xuất kho      |
| `createStockMovement(data)`                 | Tạo phiếu nhập/xuất kho    |

#### Công thức (Recipes)

| Action                    | Mô tả                     |
| ------------------------- | ------------------------- |
| `getRecipes()`            | Danh sách công thức       |
| `getMenuItemsForRecipe()` | Món ăn cho chọn công thức |
| `createRecipe(data)`      | Tạo công thức             |
| `deleteRecipe(id)`        | Xóa công thức             |

#### Nhà cung cấp (Suppliers)

| Action                     | Mô tả         |
| -------------------------- | ------------- |
| `getSuppliers()`           | Danh sách NCC |
| `createSupplier(data)`     | Tạo NCC       |
| `updateSupplier(id, data)` | Cập nhật NCC  |
| `deleteSupplier(id)`       | Xóa NCC       |

#### Đơn đặt hàng (Purchase Orders)

| Action                           | Mô tả             |
| -------------------------------- | ----------------- |
| `getPurchaseOrders()`            | Danh sách PO      |
| `createPurchaseOrder(data)`      | Tạo PO            |
| `sendPurchaseOrder(id)`          | Gửi PO            |
| `receivePurchaseOrder(id, data)` | Nhận hàng theo PO |
| `cancelPurchaseOrder(id)`        | Hủy PO            |

#### Vận hành kho (Inventory Ops)

| Action                   | Mô tả                          |
| ------------------------ | ------------------------------ |
| `getPrepList()`          | Danh sách chuẩn bị nguyên liệu |
| `getFoodCostReport()`    | Báo cáo chi phí nguyên liệu    |
| `getStockCounts()`       | Danh sách kiểm kê              |
| `createStockCount(data)` | Tạo phiên kiểm kê              |
| `approveStockCount(id)`  | Duyệt kiểm kê                  |
| `getExpiringBatches()`   | Lô hàng sắp hết hạn            |
| `getPriceAnomalies()`    | Phát hiện biến động giá        |

---

### 5.5 Nhân sự (HR)

> File: `apps/web/app/(admin)/admin/hr/actions.ts`

**Vai trò:** `owner`, `manager`, `hr`

#### Nhân viên

| Action                     | Validation                 | Mô tả                                               |
| -------------------------- | -------------------------- | --------------------------------------------------- |
| `getEmployees(branchId?)`  | —                          | Danh sách nhân viên (tối đa 50)                     |
| `getCreatableRoles()`      | —                          | Vai trò được phép tạo theo quyền hiện tại           |
| `createStaffAccount(data)` | `createStaffAccountSchema` | Tạo tài khoản + employee record (kèm Supabase Auth) |
| `createEmployee(data)`     | `createEmployeeSchema`     | Tạo employee cho profile có sẵn                     |
| `updateEmployee(id, data)` | `updateEmployeeSchema`     | Cập nhật thông tin nhân viên                        |
| `getBranchesForHr()`       | —                          | Danh sách chi nhánh                                 |

**Quyền tạo tài khoản:**
| Vai trò | Có thể tạo |
|---------|-----------|
| owner | manager, hr, cashier, waiter, chef |
| manager | cashier, waiter, chef |
| hr | cashier, waiter, chef |

#### Ca làm việc (Shifts)

| Action                  | Validation          | Mô tả                                                                    |
| ----------------------- | ------------------- | ------------------------------------------------------------------------ |
| `getShifts()`           | —                   | Danh sách ca làm việc                                                    |
| `createShift(formData)` | `createShiftSchema` | Tạo ca (branch_id, name, start_time, end_time, break_min, max_employees) |
| `deleteShift(id)`       | —                   | Xóa ca                                                                   |

#### Phân ca (Shift Assignments)

| Action                                    | Validation                    | Mô tả                              |
| ----------------------------------------- | ----------------------------- | ---------------------------------- |
| `getShiftAssignments(startDate, endDate)` | —                             | Lịch phân ca theo khoảng thời gian |
| `createShiftAssignment(data)`             | `createShiftAssignmentSchema` | Phân ca cho nhân viên              |

#### Chấm công

| Action                       | Mô tả                    |
| ---------------------------- | ------------------------ |
| `getAttendanceRecords(date)` | Bảng chấm công theo ngày |

#### Nghỉ phép

| Action                      | Validation                  | Mô tả                       |
| --------------------------- | --------------------------- | --------------------------- |
| `getLeaveRequests()`        | —                           | Danh sách yêu cầu nghỉ phép |
| `createLeaveRequest(data)`  | `createLeaveRequestSchema`  | Tạo yêu cầu nghỉ phép       |
| `approveLeaveRequest(data)` | `approveLeaveRequestSchema` | Duyệt/từ chối nghỉ phép     |

#### Bảng lương (Payroll)

| Action                          | Validation                  | Mô tả                                                        |
| ------------------------------- | --------------------------- | ------------------------------------------------------------ |
| `getPayrollPeriods(branchId?)`  | —                           | Danh sách kỳ lương                                           |
| `getPayrollEntries(periodId)`   | —                           | Chi tiết lương theo kỳ                                       |
| `createPayrollPeriod(data)`     | `createPayrollPeriodSchema` | Tạo kỳ lương                                                 |
| `calculatePayroll(periodId)`    | —                           | Tính lương tự động (hourly_rate × hours hoặc monthly_salary) |
| `updatePayrollEntry(data)`      | `updatePayrollEntrySchema`  | Chỉnh sửa OT, thưởng, khấu trừ                               |
| `approvePayroll(periodId)`      | —                           | Duyệt kỳ lương                                               |
| `markPayrollPaid(periodId)`     | —                           | Đánh dấu đã trả lương                                        |
| `deletePayrollPeriod(periodId)` | —                           | Xóa kỳ lương (chỉ trạng thái draft)                          |

**State Machine (Payroll):**

```
draft → calculated → approved → paid
```

---

### 5.6 CRM (Khách hàng & Voucher)

> File: `apps/web/app/(admin)/admin/crm/actions.ts`

#### Thống kê CRM

| Action          | Mô tả                                                         |
| --------------- | ------------------------------------------------------------- |
| `getCrmStats()` | Tổng/active khách hàng, vouchers, rating TB, feedback pending |
| `getBranches()` | Danh sách chi nhánh                                           |

#### Khách hàng

| Action                         | Validation             | Mô tả                                                                     |
| ------------------------------ | ---------------------- | ------------------------------------------------------------------------- |
| `getCustomers()`               | —                      | Danh sách khách hàng (kèm loyalty tier)                                   |
| `createCustomer(formData)`     | `createCustomerSchema` | Tạo khách hàng (full_name, phone, email, gender, birthday, source, notes) |
| `updateCustomer(id, formData)` | `updateCustomerSchema` | Cập nhật thông tin                                                        |
| `toggleCustomerActive(id)`     | —                      | Bật/tắt trạng thái active                                                 |

#### Loyalty

| Action                                  | Validation                  | Mô tả                                               |
| --------------------------------------- | --------------------------- | --------------------------------------------------- |
| `getCustomerLoyaltyHistory(customerId)` | —                           | 20 giao dịch loyalty gần nhất                       |
| `adjustLoyaltyPoints(data)`             | `adjustLoyaltyPointsSchema` | Điều chỉnh điểm (cộng/trừ)                          |
| `getLoyaltyTiers()`                     | —                           | Danh sách hạng loyalty                              |
| `createLoyaltyTier(formData)`           | `createLoyaltyTierSchema`   | Tạo hạng (name, min_points, discount_pct, benefits) |
| `updateLoyaltyTier(id, formData)`       | —                           | Cập nhật hạng                                       |
| `deleteLoyaltyTier(id)`                 | —                           | Xóa hạng (chặn nếu có khách đang ở hạng này)        |

#### Voucher

| Action                    | Validation            | Mô tả                                                                                         |
| ------------------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| `getVouchers()`           | —                     | Danh sách voucher (kèm branch scope)                                                          |
| `createVoucher(data)`     | `createVoucherSchema` | Tạo voucher (code, type, value, min_order, max_discount, valid_from/to, max_uses, branch_ids) |
| `updateVoucher(id, data)` | —                     | Cập nhật voucher                                                                              |
| `deleteVoucher(id)`       | —                     | Xóa voucher                                                                                   |
| `toggleVoucher(id)`       | —                     | Bật/tắt voucher                                                                               |

**Loại voucher (`type`):** `percent`, `fixed`

#### Phản hồi (Feedback)

| Action                                | Validation              | Mô tả                                                    |
| ------------------------------------- | ----------------------- | -------------------------------------------------------- |
| `getFeedback()`                       | —                       | Danh sách feedback (kèm thông tin khách, đơn, chi nhánh) |
| `respondToFeedback(id, { response })` | `respondFeedbackSchema` | Phản hồi feedback                                        |

---

### 5.7 Thiết bị & Terminal

> File: `apps/web/app/(admin)/admin/terminals/actions.ts`

**Vai trò:** `owner`, `manager`

| Action                     | Mô tả                                                          |
| -------------------------- | -------------------------------------------------------------- |
| `getTerminals()`           | Danh sách POS terminals (kèm chi nhánh)                        |
| `getBranches()`            | Danh sách chi nhánh                                            |
| `getPendingDevices()`      | Thiết bị đang chờ duyệt                                        |
| `createTerminal(formData)` | Tạo terminal (name, type, branch_id, device_fingerprint)       |
| `approveTerminal(id)`      | Phê duyệt terminal                                             |
| `toggleTerminal(id)`       | Bật/tắt terminal                                               |
| `deleteTerminal(id)`       | Vô hiệu hóa terminal (soft delete)                             |
| `approveDevice(id)`        | Phê duyệt thiết bị + tự động tạo terminal/KDS station liên kết |
| `rejectDevice(id)`         | Từ chối thiết bị                                               |
| `deleteDevice(id)`         | Xóa thiết bị + vô hiệu hóa terminal/station liên kết           |

---

### 5.8 Trạm KDS

> File: `apps/web/app/(admin)/admin/kds-stations/actions.ts`

| Action                           | Mô tả                                        |
| -------------------------------- | -------------------------------------------- |
| `getKdsStations()`               | Danh sách trạm KDS                           |
| `createKdsStation(formData)`     | Tạo trạm KDS (name, branch_id, category_ids) |
| `updateKdsStation(id, formData)` | Cập nhật trạm                                |
| `toggleKdsStation(id)`           | Bật/tắt trạm                                 |
| `deleteKdsStation(id)`           | Xóa trạm                                     |

---

### 5.9 Thanh toán

> File: `apps/web/app/(admin)/admin/payments/actions.ts`

| Action                     | Mô tả                                                                       |
| -------------------------- | --------------------------------------------------------------------------- |
| `getBranches()`            | Danh sách chi nhánh                                                         |
| `getPayments()`            | 500 thanh toán gần nhất (tất cả chi nhánh, kèm đơn hàng + terminal)         |
| `refundPayment(paymentId)` | Hoàn tiền (chỉ cho payment `completed`, atomic update chống race condition) |

---

### 5.10 Bàn ăn (Tables)

> File: `apps/web/app/(admin)/admin/tables/actions.ts`

| Action                      | Validation          | Mô tả                               |
| --------------------------- | ------------------- | ----------------------------------- |
| `getTables()`               | —                   | Danh sách bàn (kèm zone, chi nhánh) |
| `createTable(formData)`     | `createTableSchema` | Tạo bàn                             |
| `updateTable(id, formData)` | `updateTableSchema` | Cập nhật bàn                        |
| `deleteTable(id)`           | —                   | Xóa bàn                             |

---

### 5.11 Cài đặt (Settings)

> File: `apps/web/app/(admin)/admin/settings/actions.ts`

| Action                | Mô tả                                            |
| --------------------- | ------------------------------------------------ |
| `getBranches()`       | Danh sách chi nhánh kèm timezone                 |
| `getSettings()`       | Cài đặt hệ thống (tax_rate, service_charge, ...) |
| `updateBranch(data)`  | Cập nhật thông tin chi nhánh                     |
| `updateSetting(data)` | Cập nhật cài đặt (key-value)                     |

---

### 5.12 Báo cáo (Reports)

> File: `apps/web/app/(admin)/admin/reports/actions.ts`

| Action                                          | Input        | Mô tả                            |
| ----------------------------------------------- | ------------ | -------------------------------- |
| `getRevenueReport(startDate, endDate)`          | `YYYY-MM-DD` | Báo cáo doanh thu theo ngày      |
| `getPaymentMethodBreakdown(startDate, endDate)` | —            | Phân tích phương thức thanh toán |
| `getReportSummary(startDate, endDate)`          | —            | Tổng hợp báo cáo                 |

---

### 5.13 Bảo mật (Security)

> File: `apps/web/app/(admin)/admin/security/actions.ts`

| Action                         | Mô tả                                            |
| ------------------------------ | ------------------------------------------------ |
| `getSecurityEvents(severity?)` | 100 sự kiện bảo mật gần nhất (lọc theo severity) |

---

### 5.14 Thông báo kho

> File: `apps/web/app/(admin)/admin/notifications/actions.ts`

**Vai trò:** `owner`, `manager`, `inventory`

| Action                     | Mô tả                                                  |
| -------------------------- | ------------------------------------------------------ |
| `getNotifications(limit?)` | Cảnh báo kho (inventory_low_stock, inventory_expiring) |

---

### 5.15 Chiến dịch (Campaigns)

> File: `apps/web/app/(admin)/admin/campaigns/actions.ts`

| Action                     | Validation             | Mô tả                                             |
| -------------------------- | ---------------------- | ------------------------------------------------- |
| `getCampaigns()`           | —                      | Danh sách chiến dịch                              |
| `createCampaign(data)`     | `createCampaignSchema` | Tạo chiến dịch                                    |
| `updateCampaign(id, data)` | `updateCampaignSchema` | Cập nhật chiến dịch                               |
| `deleteCampaign(id)`       | —                      | Xóa chiến dịch                                    |
| `sendCampaign(id)`         | —                      | Gửi chiến dịch (push notification cho khách hàng) |

---

## 6. Server Actions — Nhân viên (Employee)

> File: `apps/web/app/(employee)/employee/actions.ts`

| Action                                | Validation                   | Mô tả                           |
| ------------------------------------- | ---------------------------- | ------------------------------- |
| `getMyProfile()`                      | —                            | Thông tin cá nhân của nhân viên |
| `updateMyProfile(data)`               | `updateMyProfileSchema`      | Cập nhật hồ sơ cá nhân          |
| `changePassword(data)`                | `changePasswordSchema`       | Đổi mật khẩu                    |
| `getMyShifts(startDate, endDate)`     | `dateRangeSchema`            | Lịch ca làm việc                |
| `getMyAttendance(startDate, endDate)` | `dateRangeSchema`            | Lịch sử chấm công               |
| `getMyLeaveRequests()`                | —                            | Danh sách yêu cầu nghỉ phép     |
| `createMyLeaveRequest(data)`          | `createMyLeaveRequestSchema` | Tạo yêu cầu nghỉ phép           |
| `getMyPayslips()`                     | —                            | Danh sách phiếu lương           |

---

## 7. Server Actions — Khách hàng (Customer PWA)

> File: `apps/web/app/(customer)/customer/actions.ts`

| Action                     | Auth  | Validation                 | Mô tả                       |
| -------------------------- | ----- | -------------------------- | --------------------------- |
| `getPublicMenu()`          | Không | —                          | Xem thực đơn (public)       |
| `getCustomerProfile()`     | Có    | —                          | Thông tin cá nhân + loyalty |
| `getCustomerOrders()`      | Có    | —                          | Lịch sử đơn hàng            |
| `placeCustomerOrder(data)` | Có    | `customerPlaceOrderSchema` | Đặt hàng từ PWA             |
| `submitFeedback(data)`     | Có    | `createFeedbackSchema`     | Gửi đánh giá                |
| `getCustomerLoyalty()`     | Có    | —                          | Thông tin loyalty + lịch sử |

---

## 8. Xác thực & Phân quyền

### Phương thức xác thực

- **Cookie-based sessions** (Supabase Auth + `@supabase/ssr`)
- **Device fingerprinting** cho nhân viên POS (waiter, cashier, chef)
- **CRON_SECRET** cho cron jobs
- **HMAC SHA256** cho webhooks (Momo)

### Vai trò hệ thống

| Vai trò     | Cấp quyền  | Module truy cập                 |
| ----------- | ---------- | ------------------------------- |
| `owner`     | Cao nhất   | Admin, POS, KDS, tất cả         |
| `manager`   | Quản lý    | Admin, POS, KDS                 |
| `hr`        | Nhân sự    | Admin HR                        |
| `cashier`   | Thu ngân   | POS (cashier + orders)          |
| `waiter`    | Phục vụ    | POS (orders)                    |
| `chef`      | Đầu bếp    | KDS                             |
| `inventory` | Kho        | Admin Inventory + Notifications |
| `customer`  | Khách hàng | Customer PWA                    |

### Guard helpers

| Helper                                                 | Mô tả                               |
| ------------------------------------------------------ | ----------------------------------- |
| `getActionContext()`                                   | Lấy user, tenant, branch từ session |
| `getAdminContext(roles)`                               | Kiểm tra admin roles                |
| `getKdsBranchContext(roles)`                           | Kiểm tra KDS roles + branch         |
| `requireBranch(ctx)`                                   | Đảm bảo user có branch_id           |
| `requireRole(role, allowed, action)`                   | Kiểm tra vai trò                    |
| `verifyEntityOwnership(supabase, table, id, tenantId)` | Kiểm tra quyền sở hữu entity        |

---

## 9. Mã lỗi chung

| Mã                 | HTTP tương đương | Mô tả                                       |
| ------------------ | ---------------- | ------------------------------------------- |
| `VALIDATION_ERROR` | 400              | Dữ liệu đầu vào không hợp lệ                |
| `UNAUTHORIZED`     | 401              | Chưa đăng nhập hoặc sai thông tin           |
| `FORBIDDEN`        | 403              | Không có quyền truy cập                     |
| `NOT_FOUND`        | 404              | Không tìm thấy tài nguyên                   |
| `CONFLICT`         | 409              | Xung đột trạng thái (ví dụ: món đã hết)     |
| `DB_ERROR`         | 500              | Lỗi database (sanitized, không lộ chi tiết) |

### Server Action error format

```typescript
// Mutation actions
{ error: string | null, ...data }

// Query actions (throw on error)
throw new ActionError(message, code, statusCode?)
```

---

## 10. Rate Limiting

Sử dụng Upstash Redis (`@comtammatu/security`).

| Endpoint/Action             | Giới hạn | Cửa sổ  |
| --------------------------- | -------- | ------- |
| Login/Auth                  | 5 req    | 15 phút |
| GET queries                 | 100 req  | 1 phút  |
| POST/PUT/DELETE             | 30 req   | 1 phút  |
| Customer app                | 20 req   | 1 phút  |
| Bulk exports (data-export)  | 5 req    | 1 giờ   |
| Payment webhooks (Momo IPN) | 1000 req | 1 phút  |

---

## Phụ lục: Zod Validation Schemas

Tất cả schema nằm trong `packages/shared/src/schemas/`:

| File                   | Schemas                                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `order.ts`             | `createOrderSchema`, `updateOrderStatusSchema`, `addOrderItemsSchema`                                                                                                                   |
| `payment.ts`           | `processPaymentSchema`, `validateVoucherSchema`, `applyVoucherSchema`                                                                                                                   |
| `pos.ts`               | `openSessionSchema`, `closeSessionSchema`                                                                                                                                               |
| `menu.ts`              | `menuSchema`, `menuCategorySchema`, `menuItemSchema`, `menuItemAvailableSidesSchema`                                                                                                    |
| `kds.ts`               | `bumpTicketSchema`                                                                                                                                                                      |
| `hr.ts`                | `createStaffAccountSchema`, `createEmployeeSchema`, `updateEmployeeSchema`, `createShiftSchema`, `createShiftAssignmentSchema`, `createLeaveRequestSchema`, `approveLeaveRequestSchema` |
| `payroll.ts`           | `createPayrollPeriodSchema`, `updatePayrollEntrySchema`, `payrollPeriodIdSchema`                                                                                                        |
| `crm.ts`               | `createCustomerSchema`, `updateCustomerSchema`, `adjustLoyaltyPointsSchema`, `createLoyaltyTierSchema`, `respondFeedbackSchema`                                                         |
| `voucher.ts`           | `createVoucherSchema`                                                                                                                                                                   |
| `inventory.ts`         | Ingredient, stock, recipe schemas                                                                                                                                                       |
| `supplier.ts`          | Supplier schemas                                                                                                                                                                        |
| `device.ts`            | Device-related schemas                                                                                                                                                                  |
| `printer.ts`           | `createPrinterConfigSchema`, `updatePrinterConfigSchema`                                                                                                                                |
| `privacy.ts`           | `deletionRequestSchema`                                                                                                                                                                 |
| `feedback.ts`          | `createFeedbackSchema`                                                                                                                                                                  |
| `campaign.ts`          | `createCampaignSchema`, `updateCampaignSchema`                                                                                                                                          |
| `dashboard.ts`         | `dashboardLimitSchema`, `dashboardDaysSchema`, `dateRangeSchema`                                                                                                                        |
| `table.ts`             | `createTableSchema`, `updateTableSchema`                                                                                                                                                |
| `push-notification.ts` | `subscribePushSchema`, `unsubscribePushSchema`                                                                                                                                          |
