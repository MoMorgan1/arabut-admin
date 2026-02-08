# SBC Dual Cost System - Implementation Summary

## Overview
SBC orders now support **TWO separate costs**:
1. **Coins Cost** - Uses the **same pricing as regular coins orders** (per million)
2. **Service Cost** - Cost per challenge completed by the supplier

This means you only need to set up **ONE coins pricing rule** that works for both regular coins orders AND SBC orders.

## What Changed

### Database
**Migration**: `012_add_service_target_fields.sql`
- Added `sbc_coins_cost` column (USD)
- Added `sbc_service_cost` column (USD)

**Migration**: `011_supplier_pricing_system.sql`
- Removed `sbc` service type (not needed - use regular `coins` instead)
- Added `sbc_challenge` service type (per challenge pricing)
- Added DROP POLICY statements to prevent "already exists" errors

### Pricing Setup
Suppliers now need **only ONE extra pricing rule** for SBC:

**Example for Supplier "Ahmed"**:
```
Service: Coins (per million)           | Platform: PS | Price: $15.00  ← Used for BOTH coins orders AND SBC coins
Service: SBC - Service (per challenge) | Platform: PS | Price: $5.00
```

**Note**: The "Coins" pricing is shared between regular coins orders and SBC coins cost. You don't need a separate SBC coins pricing rule!

### Order Detail View
**SBC orders now show**:
- Coins Cost: $XX.XX
- Service Cost: $XX.XX  
- **Total Cost: $XX.XX** (bold, sum of both)

**Non-SBC orders still show**:
- Expected Cost
- Actual Cost

### Auto-Cost Calculation
When assigning a supplier to an SBC order:
1. System looks up **two** pricing rules:
   - Regular "Coins (per million)" pricing (same as coins orders)
   - "SBC - Service (per challenge)" pricing
2. Calculates:
   - `coins_cost = (coins_price_per_million / 1000) × coins_amount_k`
   - `service_cost = price_per_challenge × challenges_count`
3. Stores both separately
4. Toast shows: "Total: $XX (Coins: $XX, Service: $XX)"

### Edit Dialog
**For SBC orders**, the Edit Item dialog now has:
- Coins Cost (USD) - manual input
- Service Cost (USD) - manual input
- Total displayed below (auto-calculated)

**For other orders**, it still shows:
- Expected Cost (USD)
- Actual Cost (USD)

## How to Use

### 1. Set Up Pricing (One-time per supplier)
1. Go to Suppliers → Click supplier → Pricing tab
2. Add pricing rules:
   - Service: "Coins (per million)" → Price: e.g., $15 ← This is used for both regular coins AND SBC coins
   - Service: "SBC - Service (per challenge)" → Price: e.g., $5

**Important**: You only need ONE "Coins" pricing rule - it automatically applies to both regular coins orders and SBC coins cost!

### 2. Daily Usage
When an SBC order comes in:

**Option A: Auto-calculate (recommended)**
1. Open order → Click Edit Item
2. Make sure "Challenges Count" is set (e.g., 4)
3. Make sure coins amount is set (usually already there from webhook)
4. Close dialog
5. Assign supplier from dropdown
6. **Both costs auto-fill!** 🎉

**Option B: Manual entry**
1. Open order → Click Edit Item
2. Manually enter "Coins Cost (USD)" and "Service Cost (USD)"
3. Save

## Example Calculation

**Scenario**: SBC order with 200K coins needed, 4 challenges

**Supplier Pricing**:
- SBC Coins: $15/million
- SBC Service: $5/challenge

**Auto-calculated costs**:
- Coins: (15 / 1000) × 200 = **$3.00**
- Service: 5 × 4 = **$20.00**
- **Total: $23.00**

## Files Modified

### Database
- `supabase-migrations/011_supplier_pricing_system.sql` - Added `sbc_challenge` type
- `supabase-migrations/012_add_service_target_fields.sql` - Added `sbc_coins_cost`, `sbc_service_cost`

### Types
- `src/types/database.ts` - Updated `OrderItem` and `SupplierPrice` interfaces

### Backend
- `src/app/(dashboard)/suppliers/pricing-actions.ts` - Added `calculateSBCCosts()` function
- `src/app/(dashboard)/orders/actions.ts` - Updated to handle SBC cost fields

### UI
- `src/components/suppliers/AddSupplierPriceForm.tsx` - Added "SBC - Service" option
- `src/components/suppliers/SupplierPricingTable.tsx` - Updated labels
- `src/components/orders/OrderDetail.tsx` - Dual cost display, auto-calc, edit dialog

## Migration Notes

**IMPORTANT**: Run the updated migrations (011 and 012) in order. The migrations have been updated to include the SBC dual cost support.

## Complete! ✅

Everything is ready:
- ✅ Database schema updated
- ✅ Pricing UI supports dual pricing
- ✅ Auto-cost calculation for SBC
- ✅ Order detail shows breakdown
- ✅ Edit dialog supports manual entry
- ✅ No linting errors

Just run the migrations and start using it!
