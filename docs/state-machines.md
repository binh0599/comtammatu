# State Machine Diagrams

Auto-generated from source code analysis. Each diagram maps directly to component logic and constants.

---

## 1. Order Lifecycle

**Source:** `packages/shared/src/constants.ts` → `VALID_ORDER_TRANSITIONS`
**Who drives it:** Waiter (draft→confirmed), KDS DB trigger (confirmed→preparing→ready), Waiter (ready→served), Cashier (served→completed)

```mermaid
stateDiagram-v2
    [*] --> draft : createOrder()

    draft --> confirmed : waiter confirms\n(Gửi bếp)
    draft --> cancelled : waiter cancels

    confirmed --> preparing : KDS trigger on\nticket INSERT
    confirmed --> cancelled : waiter/manager cancels

    preparing --> ready : chef bumps ticket\n(XONG)
    preparing --> cancelled : manager cancels

    ready --> served : waiter marks served\n(Đã phục vụ)
    ready --> cancelled : manager cancels

    served --> completed : cashier processes\npayment

    completed --> [*]
    cancelled --> [*]

    note right of draft : pos_session_id = NULL\nNo KDS tickets yet
    note right of confirmed : KDS tickets created\nvia DB trigger
    note right of ready : canPay = true in\nPaymentPanel
```

---

## 2. Order Item Lifecycle

**Source:** `packages/shared/src/constants.ts` → `ORDER_ITEM_STATUSES`
**Who drives it:** DB trigger `create_kds_tickets` on order confirm, KDS bump propagates back via `update_order_from_kds` trigger

```mermaid
stateDiagram-v2
    [*] --> pending : order_item created

    pending --> sent_to_kds : order confirmed\n(DB trigger fires)
    pending --> cancelled : order cancelled

    sent_to_kds --> preparing : KDS ticket\nbump START
    sent_to_kds --> cancelled : order cancelled

    preparing --> ready : KDS ticket\nbump DONE
    preparing --> cancelled : order cancelled

    ready --> served : waiter marks served
    ready --> cancelled : (edge case)

    served --> [*]
    cancelled --> [*]
```

---

## 3. KDS Ticket Lifecycle

**Source:** `packages/shared/src/constants.ts` → `VALID_KDS_TRANSITIONS`, `ticket-card.tsx` → `handleBump()`

```mermaid
stateDiagram-v2
    [*] --> pending : DB trigger creates ticket\non order confirm

    pending --> preparing : chef taps BẮT ĐẦU\n(bumpTicket → "preparing")

    preparing --> ready : chef taps XONG\n(bumpTicket → "ready")

    ready --> [*] : ticket removed from board\n(useKdsRealtime filters out)

    note right of pending : Blue button "BẮT ĐẦU"\nTiming: GREEN border
    note right of preparing : Green button "XONG"\nTiming escalates over time
    note right of ready : Triggers order item\nstatus update via DB trigger
```

---

## 4. KDS Ticket Timing Display

**Source:** `ticket-card.tsx` → `getTimingColor()`, timer `useEffect` (10s interval)
This is a derived display state overlaid on ticket status — not a separate entity.

```mermaid
stateDiagram-v2
    [*] --> NORMAL : ticket created\n(elapsed = 0)

    NORMAL --> WARNING : elapsed >= warning_min\n(default: timingRule.warning_min)
    NORMAL --> CRITICAL : elapsed >= critical_min\n(skip WARNING if jump is large)

    WARNING --> CRITICAL : elapsed >= critical_min

    CRITICAL --> [*] : ticket bumped to ready\n(removed from board)
    WARNING --> [*] : ticket bumped to ready
    NORMAL --> [*] : ticket bumped to ready

    note right of NORMAL : border-green-500\nbg-green-950\ntimer text: green
    note right of WARNING : border-yellow-500\nbg-yellow-950\ntimer text: yellow
    note right of CRITICAL : border-red-500\nbg-red-950\ntimer text: red
```

---

## 5. useKdsRealtime — Subscription State

**Source:** `use-kds-realtime.ts`
Manages the live ticket list via Supabase `postgres_changes` on `kds_tickets` table.

```mermaid
stateDiagram-v2
    [*] --> INITIALISED : hook mounts\n(initialTickets from SSR)

    INITIALISED --> SUBSCRIBED : supabase.channel().subscribe()

    SUBSCRIBED --> SUBSCRIBED : heartbeat / no change

    SUBSCRIBED --> TICKET_ADDED : INSERT event\n(status = pending OR preparing\nAND station_id matches)

    SUBSCRIBED --> TICKET_REMOVED : UPDATE event\n(status = ready OR cancelled)

    SUBSCRIBED --> TICKET_UPDATED : UPDATE event\n(status = pending OR preparing)

    SUBSCRIBED --> TICKET_DELETED : DELETE event

    TICKET_ADDED --> SUBSCRIBED : setTickets([...prev, newTicket])
    TICKET_REMOVED --> SUBSCRIBED : setTickets(prev.filter(t ≠ id))
    TICKET_UPDATED --> SUBSCRIBED : setTickets(prev.map update)
    TICKET_DELETED --> SUBSCRIBED : setTickets(prev.filter(t ≠ id))

    SUBSCRIBED --> [*] : component unmounts\n(removeChannel)

    note right of SUBSCRIBED : Channel: kds-station-{stationId}\nFilter: station_id=eq.{stationId}
```

---

## 6. Waiter POS — New Order Wizard

**Source:** `new-order-client.tsx`
The two-tab wizard that orchestrates table selection, menu browsing, cart, and order submission.

```mermaid
stateDiagram-v2
    [*] --> IDLE : page mounts\n(tab="table", no table, empty cart)

    IDLE --> TABLE_SELECTED : click table cell\n(setSelectedTableId)
    TABLE_SELECTED --> IDLE : click same table\n(deselect / toggle)

    IDLE --> MENU_BROWSING : tap "Tiếp tục →"\n(takeaway mode — no table needed)
    TABLE_SELECTED --> MENU_BROWSING : tap "Tiếp tục →"\n(dine_in mode)

    MENU_BROWSING --> CART_POPULATED : add first item\n(handleAddItem)
    CART_POPULATED --> CART_POPULATED : add / remove items\n(quantity changes)
    CART_POPULATED --> MENU_BROWSING : remove all items\n(cart.length = 0, cart hides)

    CART_POPULATED --> SUBMITTING : tap "Tạo đơn hàng"\nin OrderCart drawer\n(isPending = true)

    SUBMITTING --> SUCCESS : createOrder() OK\n+ confirmOrder() OK
    SUBMITTING --> CONFIRM_FAILED : createOrder() OK\nbut confirmOrder() fails
    SUBMITTING --> ERROR : createOrder() fails\n(toast.error shown)

    SUCCESS --> [*] : router.push("/pos/orders")
    CONFIRM_FAILED --> [*] : router.push("/pos/order/{id}")\n(draft order exists)
    ERROR --> CART_POPULATED : user retries

    note right of IDLE : selectedTableId = null\ncart = []
    note right of CART_POPULATED : OrderCart FAB visible\nat bottom of screen
    note right of SUBMITTING : Both tabs disabled\nisPending = true
```

---

## 7. OrderCart Drawer

**Source:** `order-cart.tsx`
A floating action button + bottom drawer. Rendered only when cart is non-empty.

```mermaid
stateDiagram-v2
    [*] --> HIDDEN : cart.length === 0\n(component returns null)

    HIDDEN --> FAB_VISIBLE : first item added\n(cart.length > 0)

    FAB_VISIBLE --> DRAWER_OPEN : tap FAB button\n(Drawer trigger)
    FAB_VISIBLE --> HIDDEN : all items removed\n(cart cleared)

    DRAWER_OPEN --> FAB_VISIBLE : tap "Tiếp tục chọn món"\n(DrawerClose)
    DRAWER_OPEN --> FAB_VISIBLE : swipe down / backdrop click

    DRAWER_OPEN --> DRAWER_OPEN : tap + / −\n(quantity adjustment)
    DRAWER_OPEN --> FAB_VISIBLE : last item removed\n(returns null → hidden)

    DRAWER_OPEN --> SUBMITTING : tap "Tạo đơn hàng"\n(isPending = true)

    SUBMITTING --> DRAWER_OPEN : server returns error\n(handled by parent)
    SUBMITTING --> [*] : server returns success\n(parent navigates away)

    note right of FAB_VISIBLE : Shows: {n} món · {subtotal}\nfixed bottom-16
    note right of SUBMITTING : Button shows "Đang tạo đơn..."\nAll buttons disabled
```

---

## 8. Cashier Station

**Source:** `cashier-client.tsx`, `payment-panel.tsx`

```mermaid
stateDiagram-v2
    [*] --> NO_ORDER : page loads\n(selectedOrder = null)

    NO_ORDER --> ORDER_SELECTED : cashier clicks\nan order card\n(setSelectedOrder)

    ORDER_SELECTED --> NO_ORDER : payment completes\n(handlePaymentComplete →\nsetSelectedOrder(null) +\nrouter.refresh())

    ORDER_SELECTED --> ORDER_SELECTED : cashier clicks\na different order

    note right of NO_ORDER : PaymentPanel shows\n"Chọn đơn từ danh sách"
    note right of ORDER_SELECTED : PaymentPanel shows\norder details + payment form
```

---

## 9. PaymentPanel

**Source:** `payment-panel.tsx`
The right-side panel of the cashier station.

```mermaid
stateDiagram-v2
    [*] --> NO_ORDER : order prop = null

    NO_ORDER --> ORDER_LOADED : order prop provided

    ORDER_LOADED --> NOT_PAYABLE : order.status NOT IN\n(ready, served, confirmed, preparing)

    ORDER_LOADED --> AWAITING_AMOUNT : order.status IN\n(ready, served, confirmed, preparing)\n→ canPay = true

    NOT_PAYABLE --> [*] : shows warning banner\n"Đơn chưa sẵn sàng thanh toán"

    AWAITING_AMOUNT --> AMOUNT_INSUFFICIENT : amountTendered entered\nbut < order.total\n(change = null, button disabled)

    AWAITING_AMOUNT --> AMOUNT_SUFFICIENT : amountTendered >= order.total\n(change calculated and shown)

    AMOUNT_INSUFFICIENT --> AMOUNT_SUFFICIENT : user increases amount\nor taps quick-amount button

    AMOUNT_SUFFICIENT --> AMOUNT_INSUFFICIENT : user decreases amount\nbelow order.total

    AMOUNT_SUFFICIENT --> PROCESSING : tap "Thanh toán"\n(isPending = true)

    PROCESSING --> COMPLETE : processPayment() success\n(toast: tiền thừa shown)

    PROCESSING --> AMOUNT_SUFFICIENT : processPayment() error\n(toast.error, stays in panel)

    COMPLETE --> [*] : setAmountTendered("")\nonPaymentComplete() called

    note right of AWAITING_AMOUNT : Quick-amount buttons shown\n(exact, round 10K/50K/100K)
    note right of AMOUNT_SUFFICIENT : Green "Tiền thừa" box visible
    note right of PROCESSING : Button: "Đang xử lý..."\nAll inputs disabled
```

---

## 10. POS Session (Shift)

**Source:** `session-form.tsx` → `OpenSessionForm` + `ActiveSessionCard`
**Source:** `packages/shared/src/constants.ts` → `SESSION_STATUSES`

```mermaid
stateDiagram-v2
    [*] --> NO_SESSION : page loads\n(no active session found)

    NO_SESSION --> OPENING : submit OpenSessionForm\n(isPending = true)
    OPENING --> NO_SESSION : openSession() error\n(error message shown)
    OPENING --> ACTIVE : openSession() success\n(page re-renders with\nActiveSessionCard)

    ACTIVE --> CLOSE_DIALOG : tap "Đóng ca"\n(AlertDialog opens)

    CLOSE_DIALOG --> ACTIVE : tap "Hủy"\n(dialog dismissed)

    CLOSE_DIALOG --> CLOSING : enter closing_amount\n+ tap "Xác nhận đóng ca"\n(isPending = true)

    CLOSING --> CLOSE_DIALOG : closeSession() error\n(error shown inside dialog)
    CLOSING --> NO_SESSION : closeSession() success\n(session.status = closed\npage re-renders)

    note right of NO_SESSION : OpenSessionForm shown\nSelect terminal + opening amount
    note right of ACTIVE : Elapsed timer ticking (1 min)\nShows: cash total, tx count\nExpected drawer amount
    note right of CLOSE_DIALOG : Shows expected vs actual\nDifference calculated live
    note right of CLOSING : Button: "Đang đóng..."\nInputs disabled
```

---

## 11. Table Status

**Source:** `packages/shared/src/constants.ts` → `TABLE_STATUSES`
**Displayed in:** `table-selector.tsx` (color-coded cells in TableGrid)

```mermaid
stateDiagram-v2
    [*] --> available : table created\nby admin

    available --> occupied : order created\nfor this table\n(DB trigger / manual)

    occupied --> available : order completed\nor cancelled

    available --> reserved : reservation made\n(future feature)
    reserved --> available : reservation cancelled
    reserved --> occupied : guest arrives

    available --> maintenance : admin marks\nout of service
    maintenance --> available : maintenance done

    note right of available : Green cell in TableGrid\nCan be selected for new order
    note right of occupied : Amber/red cell\nCan still be selected\n(add items to existing order)
    note right of reserved : Blue cell\n(future feature)
    note right of maintenance : Gray cell\nCannot be selected
```

---

## 12. POS Terminal Registration

**Source:** `packages/shared/src/constants.ts` → `TERMINAL_TYPES`, admin terminals actions
**Managed in:** `admin/terminals/actions.ts`

```mermaid
stateDiagram-v2
    [*] --> PENDING_APPROVAL : terminal registered\n(type: mobile_order OR cashier_station)

    PENDING_APPROVAL --> APPROVED : admin approves\n(status = active)
    PENDING_APPROVAL --> DELETED : admin deletes

    APPROVED --> REVOKED : admin revokes\n(status = inactive)
    REVOKED --> APPROVED : admin re-approves

    APPROVED --> DELETED : admin deletes
    REVOKED --> DELETED : admin deletes

    DELETED --> [*]

    note right of PENDING_APPROVAL : Cannot process orders\nor open sessions
    note right of APPROVED : mobile_order: can create orders\ncashier_station: can open sessions\n+ process payments
    note right of REVOKED : Device blocked\nCannot log in to POS
```

---

## 13. Purchase Order Lifecycle (Planned — Week 5-6)

**Source:** `packages/shared/src/constants.ts` → `VALID_PO_TRANSITIONS`
Not yet implemented in UI — schema + constants are ready.

```mermaid
stateDiagram-v2
    [*] --> draft : PO created by\ninventory manager

    draft --> sent : PO sent to supplier
    draft --> cancelled : cancelled before sending

    sent --> received : goods received\n(triggers stock_movements)
    sent --> cancelled : supplier cannot fulfill

    received --> [*]
    cancelled --> [*]
```

---

## 14. Employee Status (Planned — Week 5-6)

**Source:** `packages/shared/src/constants.ts` → `EMPLOYEE_STATUSES`
Not yet implemented in UI — constants are ready.

```mermaid
stateDiagram-v2
    [*] --> active : employee onboarded

    active --> on_leave : leave approved
    on_leave --> active : leave ends

    active --> inactive : HR deactivates\n(e.g., contract ends)
    inactive --> active : reactivated

    active --> terminated : employee terminated
    inactive --> terminated : cleanup

    terminated --> [*]
```

---

## 15. Leave Request (Planned — Week 5-6)

**Source:** `packages/shared/src/constants.ts` → `LEAVE_STATUSES`

```mermaid
stateDiagram-v2
    [*] --> pending : employee submits\nleave request

    pending --> approved : HR / manager approves\n(triggers employee → on_leave)
    pending --> rejected : HR / manager rejects

    approved --> [*]
    rejected --> [*]
```

---

## Cross-Component Flow: Full Order Journey

End-to-end sequence showing how all state machines interact for a dine-in order.

```mermaid
stateDiagram-v2
    state "Waiter POS Wizard" as WPW {
        [*] --> w_table : open new order
        w_table --> w_menu : table selected
        w_menu --> w_cart : items added
        w_cart --> w_submitting : submit
        w_submitting --> [*] : success
    }

    state "Order Lifecycle" as OL {
        [*] --> draft
        draft --> confirmed
        confirmed --> preparing
        preparing --> ready
        ready --> served
        served --> completed
        completed --> [*]
    }

    state "KDS Board" as KDS {
        [*] --> kds_pending : ticket created
        kds_pending --> kds_preparing : BẮT ĐẦU
        kds_preparing --> kds_ready : XONG
        kds_ready --> [*] : removed from board
    }

    state "Cashier Payment" as CP {
        [*] --> c_select : session open
        c_select --> c_payment : order selected
        c_payment --> c_done : payment processed
        c_done --> [*]
    }

    WPW --> OL : createOrder + confirmOrder
    OL --> KDS : DB trigger on confirmed
    KDS --> OL : DB trigger updates order status
    OL --> CP : order.status = ready/served
    CP --> OL : order.status = completed
```
