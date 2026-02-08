# ArabUT Database Schema Reference

> ⚠️ **For AI Assistants (Cursor, Copilot, etc.):**
> Read this file BEFORE creating or modifying any database queries, migrations, or code.
> Do NOT create duplicate columns. Do NOT add columns that already exist under a different name.

---

## Overview

ArabUT is an FC25 Ultimate Team service platform. Two main tables:

- **`orders`** — One row per Salla webhook (the customer's order)
- **`order_items`** — One row per product in the order (coins, FUT, rivals, SBC)

Relationship: `orders.id` ← `order_items.order_id` (one-to-many)

---

## Product Types (SKU → itemType → productType)

| SKU Pattern | `item_type` (DB) | `productType` (Router) | Description |
|-------------|-------------------|------------------------|-------------|
| `COIN_PS` / `COIN_PC` | `coins` | `coins` | شحن كوينز — automated via FUT Transfer API |
| `FUT` | `fut` | `service` | فوت تشامبيونز — manual rank boosting |
| `RIVALS` | `rivals` | `service` | رايفلز — manual division boosting |
| `SBC_xxx` | `sbc` | `sbc` | تحديات SBC — manual challenges |
| *(unknown)* | `other` | `other` | أي منتج بدون SKU معروف |

### Routing Logic (N8N Switch Node)

```
productType = 'coins'   → FUT Transfer API (automated)
productType = 'service' → Manual service path (FUT + Rivals)
productType = 'sbc'     → SBC challenges path
productType = 'other'   → Manual review + WhatsApp alert
```

---

## Table: `orders`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | Primary key |
| `salla_order_id` | `bigint` | NO | — | Salla order ID (`data.id` from webhook) |
| `salla_ref_id` | `text` | YES | — | Salla reference ID (`data.reference_id`) |
| `order_date` | `timestamptz` | NO | `now()` | تاريخ الطلب |
| `customer_name` | `text` | YES | — | اسم العميل |
| `customer_email` | `text` | YES | — | إيميل حساب سلة (NOT the EA/PSN email) |
| `customer_phone` | `text` | YES | — | رقم جوال العميل |
| `platform` | `enum (PS/PC)` | YES | — | المنصة |
| `order_type` | `enum` | NO | `'coins'` | نوع الطلب: `coins`, `fut`, `rivals`, `sbc`, `other` |
| `payment_method` | `text` | YES | — | طريقة الدفع (credit_card, etc.) |
| `salla_total_sar` | `numeric` | NO | `0` | إجمالي الطلب بالريال |
| `exchange_rate` | `numeric` | YES | — | سعر الصرف |
| `settled_amount` | `numeric` | YES | — | المبلغ المُحصَّل بعد عمولة سلة |
| `total_cost` | `numeric` | NO | `0` | إجمالي التكلفة |
| `status` | `text` | NO | `'new'` | حالة الطلب: `new`, `processing`, `completed`, `failed`, `refunded` |
| `ban_status` | `enum` | NO | `'none'` | حالة الحظر: `none`, `warned`, `banned` |
| `refund_amount` | `numeric` | NO | `0` | مبلغ الاسترجاع |
| `assigned_employee` | `uuid` | YES | — | الموظف المسؤول |
| `notes` | `text` | YES | — | ملاحظات إدارية |
| `raw_webhook` | `jsonb` | YES | — | الـ webhook الخام كاملاً |
| `created_at` | `timestamptz` | NO | `now()` | تاريخ الإنشاء |
| `updated_at` | `timestamptz` | NO | `now()` | تاريخ آخر تحديث |

### ⚠️ Important Notes for `orders`:
- `customer_email` = إيميل حساب سلة (NOT the EA/PSN email)
- EA credentials are stored in `order_items`, not here
- `order_type` should match `item_type` from order_items
- `salla_order_id` is the unique identifier from Salla (use for dedup)

---

## Table: `order_items`

### Core Fields (ALL product types)

| Column | Type | Nullable | Default | Used By | Description |
|--------|------|----------|---------|---------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | ALL | Primary key |
| `order_id` | `uuid` | NO | — | ALL | FK → `orders.id` |
| `sku` | `text` | YES | — | ALL | رمز المنتج: `COIN_PS`, `FUT`, `RIVALS`, `SBC_xxx` |
| `product_name` | `text` | NO | — | ALL | اسم المنتج بالعربي |
| `item_type` | `enum` | NO | — | ALL | `coins`, `fut`, `rivals`, `sbc`, `other` |
| `quantity` | `integer` | NO | `1` | ALL | الكمية (1 للكوينز/فوت/رايفلز، >1 للـ SBC) |
| `unit_price_sar` | `numeric` | NO | `0` | ALL | سعر الوحدة بالريال |
| `platform` | `enum (PS/PC)` | YES | — | ALL | المنصة |
| `status` | `text` | NO | `'new'` | ALL | حالة العنصر |
| `expected_cost` | `numeric` | YES | — | ALL | التكلفة المتوقعة |
| `actual_cost` | `numeric` | YES | — | ALL | التكلفة الفعلية |
| `supplier_id` | `uuid` | YES | — | ALL | المورد المسؤول |
| `notes` | `text` | YES | — | ALL | ملاحظات إدارية |
| `customer_note` | `text` | YES | — | ALL | ملاحظة العميل |
| `created_at` | `timestamptz` | NO | `now()` | ALL | تاريخ الإنشاء |
| `updated_at` | `timestamptz` | NO | `now()` | ALL | تاريخ آخر تحديث |

### Account Credentials (ALL product types)

| Column | Type | Nullable | Used By | Description |
|--------|------|----------|---------|-------------|
| `ea_email` | `text` | YES | ALL | إيميل حساب EA |
| `ea_password` | `text` | YES | ALL | باسورد حساب EA |
| `ea_backup1` | `text` | YES | ALL | كود احتياطي EA الأول |
| `ea_backup2` | `text` | YES | ALL | كود احتياطي EA الثاني |
| `ea_backup3` | `text` | YES | ALL | كود احتياطي EA الثالث |
| `ps_backup1` | `text` | YES | FUT/Rivals (PS only) | كود احتياطي سوني الأول |
| `ps_backup2` | `text` | YES | FUT/Rivals (PS only) | كود احتياطي سوني الثاني |
| `ps_backup3` | `text` | YES | FUT/Rivals (PS only) | كود احتياطي سوني الثالث |

> **Rule:** `ps_backup1/2/3` are EMPTY when `platform = 'PC'`

### Coins-Specific Fields (item_type = 'coins')

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `coins_amount_k` | `integer` | YES | — | الكمية بالآلاف (200 = 200K) |
| `shipping_type` | `text` | YES | `'fast'` | نوع الشحن: `fast` / `slow` |
| `transfer_method` | `text` | YES | `'targetedSnipe'` | طريقة النقل لـ FUT Transfer API |
| `max_price_eur` | `numeric` | YES | — | أقصى سعر لكل 100K باليورو |
| `top_up_enabled` | `integer` | YES | — | تفعيل TopUp (1/0) |
| `fulfillment_method` | `text` | YES | — | `internal` / `external` |
| `coins_delivered_k` | `numeric` | YES | `0` | الكوينز اللي وصلت بالآلاف |

### FUT Transfer API Fields (item_type = 'coins')

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `ft_order_id` | `text` | YES | رقم الطلب في FUT Transfer |
| `ft_status` | `text` | YES | حالة الطلب في FUT Transfer |
| `ft_account_check` | `text` | YES | نتيجة فحص الحساب |
| `ft_economy_state` | `text` | YES | حالة النقل الاقتصادية |
| `ft_last_synced` | `timestamptz` | YES | آخر مزامنة مع FUT Transfer |

### Service Fields (item_type = 'fut' / 'rivals')

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `rank_target` | `text` | YES | الرانك المطلوب (فوت: "الرانك الأول"، رايفلز: "1" ديفيجن) |
| `rank_achieved` | `text` | YES | الرانك اللي فعلاً وصلناه |
| `rank_urgency` | `enum` | YES | `urgent` (مستعجل 24 ساعة) / `anytime` (عادي) |

### SBC Fields (item_type = 'sbc')

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `challenges_count` | `integer` | YES | عدد التحديات المطلوبة |

---

## ❌ DO NOT CREATE These Columns (Previously Removed Duplicates)

| Removed Column | Replaced By | Reason |
|----------------|-------------|--------|
| `fulfillment` | `fulfillment_method` | duplicate (enum vs text) |
| `challenge_count` | `challenges_count` | duplicate naming |
| `ft_coins_delivered` | `coins_delivered_k` | duplicate |
| `assigned_supplier` | `supplier_id` | duplicate |
| `division_target` | `rank_target` | duplicate (rank_target works for both FUT + Rivals) |
| `is_fast_service` | `rank_urgency` | duplicate (urgency covers this) |
| `raffle_value` | *(removed)* | not needed |
| `sbc_coins_cost` | *(removed)* | use `actual_cost` instead |
| `sbc_service_cost` | *(removed)* | use `actual_cost` instead |

---

## N8N Router → Supabase Field Mapping

### Create Order (orders table)

| Supabase Column | Router Output |
|-----------------|---------------|
| `salla_order_id` | `{{ $json.orderId }}` |
| `order_type` | `{{ $json.itemType }}` |
| `customer_name` | `{{ $json.customerName }}` |
| `customer_phone` | `{{ $json.mobile }}` |
| `platform` | `{{ $json.platform }}` |
| `salla_total_sar` | `{{ $json.totalPrice }}` |
| `payment_method` | from webhook directly |
| `order_date` | `{{ $json.orderDate }}` |

### Create Order Item — Coins (order_items table)

| Supabase Column | Router Output |
|-----------------|---------------|
| `order_id` | `{{ $('Create Order').item.json.id }}` |
| `sku` | `{{ $json.sku }}` |
| `product_name` | from webhook item.name |
| `item_type` | `coins` |
| `platform` | `{{ $json.platform }}` |
| `ea_email` | `{{ $json.eaEmail }}` |
| `ea_password` | `{{ $json.eaPass }}` |
| `ea_backup1` | `{{ $json.eaBackup1 }}` |
| `ea_backup2` | `{{ $json.eaBackup2 }}` |
| `ea_backup3` | `{{ $json.eaBackup3 }}` |
| `coins_amount_k` | `{{ $json.amountK }}` |
| `shipping_type` | `{{ $json.isSlowShipping ? 'slow' : 'fast' }}` |
| `transfer_method` | `{{ $json.transferMethod }}` |
| `max_price_eur` | `{{ $json.calculatedMaxPrice }}` |
| `top_up_enabled` | `{{ $json.topUpEnabled }}` |
| `unit_price_sar` | `{{ $json.totalPrice }}` |
| `ft_order_id` | from FUT Transfer API response |

### Create Order Item — Services (order_items table, FUT/Rivals)

| Supabase Column | Router Output |
|-----------------|---------------|
| `order_id` | `{{ $('Create Order').item.json.id }}` |
| `sku` | `{{ $json.sku }}` |
| `product_name` | `{{ $json.note }}` |
| `item_type` | `{{ $json.itemType }}` |
| `quantity` | `{{ $json.serviceQuantity }}` |
| `platform` | `{{ $json.platform }}` |
| `ea_email` | `{{ $json.eaEmail }}` |
| `ea_password` | `{{ $json.eaPass }}` |
| `ea_backup1` | `{{ $json.eaBackup1 }}` |
| `ea_backup2` | `{{ $json.eaBackup2 }}` |
| `ea_backup3` | `{{ $json.eaBackup3 }}` |
| `ps_backup1` | `{{ $json.psBackup1 }}` |
| `ps_backup2` | `{{ $json.psBackup2 }}` |
| `ps_backup3` | `{{ $json.psBackup3 }}` |
| `rank_target` | `{{ $json.rankTarget }}` |
| `rank_urgency` | `{{ $json.rankUrgency }}` |
| `unit_price_sar` | `{{ $json.totalPrice }}` |

---

## Enums Reference

```sql
-- item_type / order_type
'coins', 'fut', 'rivals', 'sbc', 'other'

-- platform
'PS', 'PC'

-- ban_status
'none', 'warned', 'banned'

-- rank_urgency
'urgent', 'anytime'
```

---

## Quick Rules

1. **One order → one or more order_items** (usually one)
2. **EA credentials** go in `order_items`, NOT `orders`
3. **PS backup codes** are EMPTY when platform = PC
4. **`rank_target`** is used for BOTH FUT rank AND Rivals division
5. **`coins_amount_k`** is in thousands (200 = 200,000 coins)
6. **`ft_*` fields** are ONLY for coins orders (FUT Transfer API)
7. **Never duplicate columns** — check the "DO NOT CREATE" section above