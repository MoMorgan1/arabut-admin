# Supplier Pricing - Fast Service as Add-On Fee

## How It Works Now

**Fast Service is an ADD-ON fee** that gets added to the base rank price!

### Example Pricing:

```
FUT Rank Prices:
- Rank 1 PS: $20
- Rank 2 PS: $15
- Rank 3 PS: $50

Fast Service Fee:
- Fast Fee PS: $20 (added to any rank)
```

### Calculated Totals:

```
Rank 1 Normal = $20
Rank 1 WITH Fast = $20 + $20 = $40 ✅

Rank 2 Normal = $15
Rank 2 WITH Fast = $15 + $20 = $35 ✅

Rank 3 Normal = $50
Rank 3 WITH Fast = $50 + $20 = $70 ✅
```

## Visual Layout

```
┌─────────────────────────────────────────────┐
│ FUT Rank                                     │
├──────────────┬──────────────┬───────────────┤
│ Rank         │ PS (USD)     │ PC (USD)      │
├──────────────┼──────────────┼───────────────┤
│ Rank 1       │ [20.00]      │ [25.00]       │
│ Rank 2       │ [15.00]      │ [18.00]       │
│ Rank 3       │ [50.00]      │ [60.00]       │
│ Rank 4       │ [    ]       │ [    ]        │
│ Rank 5       │ [    ]       │ [    ]        │
│ Rank 6       │ [    ]       │ [    ]        │
├──────────────┼──────────────┼───────────────┤
│ Fast Service │ [20.00]      │ [25.00]       │
│ Fee          │              │               │
│ (add-on)     │              │               │
└──────────────┴──────────────┴───────────────┘

Example: Rank 3 PS = $50, Fast Fee = $20
         → Rank 3 with Fast = $70
```

## Key Features

### ✅ Always Visible
- Fast Service row is **always shown**
- No checkbox needed
- Supplier can leave it empty if not offering

### ✅ Separate Fee
- Stored separately in database
- Added during cost calculation
- One fee applies to all ranks

### ✅ Flexible Pricing
- Each rank has its own base price
- Fast service fee is the same for all
- Total = Base + Fast Fee

## Technical Implementation

### Database Storage:

**Base Rank Prices:**
```
service_type: "fut_rank"
platform: "PS"
rank_level: 3
is_fast_service: false
price_usd: 50.00
```

**Fast Service Fee:**
```
service_type: "fut_rank"
platform: "PS"
rank_level: 0  ← Special: 0 means "fee"
is_fast_service: true
price_usd: 20.00
```

### Cost Calculation Logic:

```typescript
if (rank_level && is_fast_service) {
  // Get base rank price
  basePrice = getPrice(rank_level, fast=false)
  
  // Get fast service fee
  fastFee = getPrice(rank_level=0, fast=true)
  
  // Total
  return basePrice + fastFee
}
```

## Usage Example

**Supplier "Ahmed" sets:**

1. **Base Prices:**
   - Rank 1 PS: $20
   - Rank 2 PS: $15
   - Rank 3 PS: $50

2. **Fast Service Fee:**
   - Fast PS: $20
   - Fast PC: $25

3. **Saves**

**When orders come in:**
- Order: Rank 1 PS, Normal → **$20**
- Order: Rank 1 PS, Fast → **$20 + $20 = $40**
- Order: Rank 3 PS, Normal → **$50**
- Order: Rank 3 PS, Fast → **$50 + $20 = $70**

## Benefits

✅ **Flexible**: Each rank can have different base price
✅ **Consistent**: Fast service fee is same for all ranks
✅ **Simple**: One fee to manage, applies universally
✅ **Clear**: Easy to understand pricing structure
✅ **Always Visible**: No hidden options

## Complete! ✅

Fast Service is now:
- ✅ Always shown in the table
- ✅ Add-on fee (not replacement price)
- ✅ Applied to any rank
- ✅ Calculated automatically
- ✅ Clear pricing structure

Perfect for flexible rank + fast service pricing! 🎉
