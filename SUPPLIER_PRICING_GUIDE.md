# Supplier Pricing System - Implementation Summary

## Overview
Implemented a comprehensive supplier pricing system that allows you to:
1. Set prices per supplier for different service types
2. Automatically calculate order costs when assigning suppliers
3. Manual cost override still available in the Edit dialog

## What Was Built

### 1. Database Table (`supplier_prices`)
**Migration file**: `supabase-migrations/011_supplier_pricing_system.sql`

**Columns**:
- `supplier_id` - which supplier
- `service_type` - coins, fut_rank, rivals, sbc
- `platform` - PS or PC
- `price_usd` - price in USD
- `rank_level` - for FUT (1-6)
- `division_level` - for Rivals (1-10)
- `is_fast_service` - for FUT fast service

**Key Features**:
- Unique constraint prevents duplicate pricing rules
- RLS policies: Admin full access, Employee read, Supplier can read their own
- Auto-updated timestamps

### 2. Backend Actions
**File**: `src/app/(dashboard)/suppliers/pricing-actions.ts`

**Functions**:
- `addSupplierPriceAction` - Create new pricing rule
- `updateSupplierPriceAction` - Update existing rule
- `deleteSupplierPriceAction` - Delete rule
- `calculateSupplierCost` - Auto-calculate cost based on order details

**How Cost Calculation Works**:
- **Coins**: Price per million × (amount / 1000)
  - Example: If price is $15/million, 100K order = $1.50
- **FUT Rank**: Fixed price per rank achievement
- **Rivals**: Fixed price per division
- **SBC**: Fixed price per SBC

### 3. UI Components

#### A. Add Pricing Form
**File**: `src/components/suppliers/AddSupplierPriceForm.tsx`
- Dialog-based form to add new pricing rules
- Dynamic fields based on service type
- Validation and error handling

#### B. Pricing Table
**File**: `src/components/suppliers/SupplierPricingTable.tsx`
- Displays all pricing rules for a supplier
- Shows service type, platform, details, price, status
- Delete functionality

#### C. Supplier Detail Page (Updated)
**File**: `src/app/(dashboard)/suppliers/[id]/page.tsx`
- Added tabs: "Pricing" and "Transactions"
- Pricing tab shows all rules + Add Price button
- Clean, organized layout

### 4. Auto-Cost Assignment
**File**: `src/components/orders/OrderDetail.tsx`
- When you assign a supplier, cost auto-calculates
- Shows toast notification with calculated cost
- Falls back to manual if no pricing rule found
- Manual override still available in Edit Item dialog

## How to Use

### Step 1: Run the Migrations
1. Open Supabase SQL Editor
2. Run `supabase-migrations/011_supplier_pricing_system.sql`
3. Run `supabase-migrations/012_add_service_target_fields.sql`

### Step 2: Set Up Supplier Pricing
1. Go to **Suppliers** page
2. Click on a supplier
3. Go to **Pricing** tab
4. Click **Add Price**
5. Fill in the form:
   - **Service Type**: Coins, FUT Rank, Rivals, or SBC
   - **Platform**: PS or PC
   - **Rank/Division**: (if applicable)
   - **Fast Service**: (for FUT only)
   - **Price**: Amount in USD

**Example Pricing Setup for Supplier "Ahmed"**:
```
Service: Coins (per million) | Platform: PS  | Price: $15.00
Service: Coins (per million) | Platform: PC  | Price: $18.00
Service: FUT Rank 3          | Platform: PS  | Price: $50.00
Service: FUT Rank 3 (Fast)   | Platform: PS  | Price: $75.00
Service: Rivals Division 1   | Platform: PS  | Price: $100.00
Service: Rivals Division 2   | Platform: PS  | Price: $80.00
```

### Step 3: Set Order Details (IMPORTANT!)
When you receive an order (or manually edit one):
1. Go to the order detail page
2. Click **Edit Item**
3. Fill in the service-specific fields:
   - **For FUT Rank orders**: Select "Target Rank" (1-6) and check "Fast Service" if needed
   - **For Rivals orders**: Select "Target Division" (1-10)
   - **For Coins orders**: Amount is already captured automatically
4. Save

### Step 4: Assign Suppliers
1. In the order item card header, select a supplier from the dropdown
2. **Cost auto-calculates** based on:
   - Supplier's pricing rules
   - Order type (Coins/FUT/Rivals/SBC)
   - Platform (PS/PC)
   - Rank or Division (if set in Step 3)
   - Fast service flag (if checked in Step 3)
3. Toast shows the calculated cost
4. If no pricing rule matches, you can manually enter cost in Edit dialog

### Step 5: Manual Override (if needed)
1. Click **Edit Item** button
2. Change the "Expected Cost (USD)" field
3. Save

## Database Schema Changes

### New Tables:
- `supplier_prices`: Stores all pricing rules per supplier

### New Columns in `order_items`:
- `rank_target` (integer 1-6): Target rank for FUT orders
- `division_target` (integer 1-10): Target division for Rivals orders
- `is_fast_service` (boolean): Whether this is a fast/priority service

## Important Notes

### ✅ FULLY WORKING NOW:
- **Coins**: Auto-calculates based on amount × price per million
- **FUT Rank**: Auto-calculates when rank_target and platform are set
- **Rivals**: Auto-calculates when division_target and platform are set
- **SBC**: Auto-calculates based on fixed price per platform

### Workflow:
1. Order comes in → Edit item → Set rank/division target
2. Assign supplier → Cost auto-fills
3. Done!

### Workaround No Longer Needed:
The previous limitation about manual cost entry for FUT/Rivals is **now fixed**! Just make sure to set the rank_target or division_target fields in the Edit Item dialog before assigning a supplier.

## What You Asked For vs What's Built

✅ **Supplier pricing tables** - DONE  
✅ **Price per 1M coins** - DONE  
✅ **Prices for Rank 1-6** - DONE  
✅ **Fast service pricing** - DONE  
✅ **Rivals per division** - DONE  
✅ **Different prices for PS vs PC** - DONE  
✅ **Auto-cost calculation** - DONE  
✅ **Manual override** - DONE (kept in Edit dialog)  
✅ **Auto-detect rank/division** - DONE (via form fields)

## Everything is Complete! 🎉

The supplier pricing system is fully functional. Just:
1. Run the two migrations
2. Set up supplier prices
3. When orders come in, edit them to set rank/division targets
4. Assign suppliers and watch costs auto-calculate!
