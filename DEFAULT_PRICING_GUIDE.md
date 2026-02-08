# Default Pricing System - Implementation Guide

## Overview
You can now set **default pricing rules** that apply to all suppliers, and update them regularly. This makes it easy to manage pricing across your entire supplier network.

## What's New

### 1. Fixed Check Constraint Error
**Problem**: `new row violates check constraint "supplier_prices_service_type_check"`
**Solution**: Migration 013 drops and recreates the constraint with correct service types (removed 'sbc')

### 2. Default Pricing System
A new **Default Pricing** page where you:
- Set pricing rules once
- Copy to ALL suppliers with one click
- Update regularly as market rates change

### 3. Individual Supplier Customization
After copying default pricing:
- Each supplier can have custom rates
- Edit on their individual supplier detail page
- Maintains flexibility while having a baseline

## Database Changes

**Migration**: `013_fix_constraint_and_default_pricing.sql`

**New Table**: `default_supplier_prices`
- Same structure as `supplier_prices`
- No `supplier_id` (it's a template)
- Stores global pricing rules

**Fixed**: `supplier_prices` check constraint
- Removed outdated 'sbc' service type
- Now accepts: 'coins', 'fut_rank', 'rivals', 'sbc_challenge'

## How to Use

### Setup (One-time):

1. **Run Migration 013**
   - Open Supabase SQL Editor
   - Run `supabase-migrations/013_fix_constraint_and_default_pricing.sql`

2. **Navigate to Pricing Page**
   - Click "Pricing" in sidebar (new menu item)
   - You'll see the "Default Pricing Rules" card

3. **Add Default Pricing Rules**
   - Click "Add Price"
   - Add rules for each service type:
     - Coins (per million): e.g., $15
     - FUT Rank 1-6: e.g., Rank 3 = $50
     - Rivals Div 1-10: e.g., Div 1 = $100
     - SBC - Service (per challenge): e.g., $5

4. **Copy to All Suppliers**
   - Click "Copy Pricing to All Suppliers"
   - Confirm the action
   - ✅ All suppliers now have the same pricing!

### Regular Updates:

When market rates change:

1. **Update Default Pricing**
   - Go to Pricing page
   - Delete old rules / Add new rules
   - Example: Coins rate increases from $15 to $18

2. **Copy to All Suppliers Again**
   - Click "Copy Pricing to All Suppliers"
   - Overwrites all supplier pricing with new rates
   - Done!

### Individual Customization:

If one supplier has different rates:

1. Go to Suppliers → Click supplier → Pricing tab
2. Edit their specific pricing rules
3. Their custom pricing stays until you copy default pricing again

## Example Workflow

**Initial Setup:**
```
Default Pricing:
- Coins: $15/M (PS), $18/M (PC)
- FUT Rank 3: $50 (PS)
- SBC Service: $5 per challenge (PS)

Action: Copy to All Suppliers
Result: All 10 suppliers now have these rates
```

**Special Case:**
```
Supplier "Ahmed" is faster, charges premium:
- Go to Ahmed's detail page
- Edit: Coins = $20/M (PS)
- His pricing is now custom
```

**Market Rate Update (3 months later):**
```
Coins price increases:
- Update Default: Coins = $18/M (PS)
- Copy to All Suppliers
- Result: All suppliers (including Ahmed) now at $18/M
- Ahmed's custom rate is overwritten
```

## UI Components

### New Page: `/pricing`
- Shows default pricing rules
- "Add Price" button
- "Copy Pricing to All Suppliers" button
- Usage instructions

### Navigation
- New "Pricing" menu item (admin only)
- Blocked for employees and suppliers

### Components Created
- `DefaultPricingManager.tsx` - Copy-to-all functionality
- Updated `AddSupplierPriceForm.tsx` - Handles default pricing
- API route: `/api/suppliers/copy-default-pricing/route.ts`

## Important Notes

⚠️ **Copy Operation is Destructive**
- Copying default pricing **overwrites** all supplier pricing
- Individual customizations will be lost
- Use carefully!

✅ **Recommended Workflow**
1. Set baseline rates in Default Pricing
2. Copy to all suppliers initially
3. For special suppliers, customize individually
4. When market rates change, update defaults and copy again

✅ **Flexibility**
- You can still manage each supplier individually
- Default pricing is just a template
- No automatic sync - you control when to copy

## Files Created/Modified

**New Files:**
- `supabase-migrations/013_fix_constraint_and_default_pricing.sql`
- `src/app/(dashboard)/pricing/page.tsx`
- `src/components/suppliers/DefaultPricingManager.tsx`
- `src/app/api/suppliers/copy-default-pricing/route.ts`

**Modified Files:**
- `src/components/suppliers/AddSupplierPriceForm.tsx` - Supports default pricing
- `src/components/layout/Sidebar.tsx` - Added Pricing menu item
- `src/components/layout/MobileNav.tsx` - Added Pricing menu item
- `src/middleware.ts` - Block pricing page for non-admins

## Complete! ✅

You now have:
- ✅ Fixed check constraint error
- ✅ Default pricing system
- ✅ Bulk update capability
- ✅ Individual supplier customization
- ✅ Easy market rate updates

Just run migration 013 and start using the new Pricing page!
