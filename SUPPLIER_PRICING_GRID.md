# Supplier Pricing Grid - Simplified Layout

## What's New - Much Simpler!

Clean table layout with **2 columns (PS & PC)** for easy pricing:

### Layout Changes:
1. **Coins**: 1 row, 2 columns (PS, PC)
2. **FUT Rank**: 6 rows (Rank 1-6), 2 columns (PS, PC)
   - **+ Fast Service checkbox**: One price for ALL ranks (same row, 2 columns)
3. **Rivals**: 10 rows (Division 1-10), 2 columns (PS, PC)
4. **SBC**: 1 row, 1 column (same price for both platforms)

**Total: Just 18 rows to fill!**

## Visual Example

```
┌────────────────────────────────────────┐
│ Coins (Price per Million)              │
├──────────────┬──────────┬──────────────┤
│ Service      │ PS (USD) │ PC (USD)     │
├──────────────┼──────────┼──────────────┤
│ Coins        │ [15.00]  │ [18.00]      │
└──────────────┴──────────┴──────────────┘

┌────────────────────────────────────────┐
│ FUT Rank                                │
│ ☑ Offer Fast Service (same for all)    │
├──────────────┬──────────┬──────────────┤
│ Rank         │ PS (USD) │ PC (USD)     │
├──────────────┼──────────┼──────────────┤
│ Rank 1       │ [    ]   │ [    ]       │
│ Rank 2       │ [    ]   │ [    ]       │
│ Rank 3       │ [50.00]  │ [60.00]      │
│ Rank 4       │ [    ]   │ [    ]       │
│ Rank 5       │ [    ]   │ [    ]       │
│ Rank 6       │ [    ]   │ [    ]       │
├──────────────┼──────────┼──────────────┤
│ Fast Service │ [75.00]  │ [90.00]      │
│ (all ranks)  │          │              │
└──────────────┴──────────┴──────────────┘

┌────────────────────────────────────────┐
│ Rivals                                  │
├──────────────┬──────────┬──────────────┤
│ Division     │ PS (USD) │ PC (USD)     │
├──────────────┼──────────┼──────────────┤
│ Division 1   │ [100.00] │ [120.00]     │
│ Division 2   │ [80.00]  │ [95.00]      │
│ ...          │ ...      │ ...          │
└──────────────┴──────────┴──────────────┘

┌────────────────────────────────────────┐
│ SBC Service (Per Challenge)             │
├──────────────────────────┬──────────────┤
│ Service                  │ Price (USD)  │
├──────────────────────────┼──────────────┤
│ SBC (same for PS & PC)   │ [5.00]       │
└──────────────────────────┴──────────────┘

           [Save All Prices]
```

## Key Features

### ✅ Simple Columns
- **2 columns**: PS and PC side by side
- Easy to compare prices
- Fill both or just one

### ✅ Fast Service (FUT Only)
- **Checkbox**: Enable/disable fast service
- **One price for ALL ranks**
- Example: $75 fast service applies to Rank 1, 2, 3, 4, 5, 6 on PS

### ✅ SBC Simplified
- **One price field**
- Automatically applies to both PS and PC
- No need to enter twice

## Usage Example

**Supplier "Ahmed" sets prices:**

1. **Coins**:
   - PS: $15
   - PC: $18

2. **FUT Rank**:
   - Rank 3 PS: $50
   - Rank 3 PC: $60
   - ☑ Check "Offer Fast Service"
   - Fast Service PS: $75
   - Fast Service PC: $90
   - (Leaves other ranks empty)

3. **Rivals**:
   - Division 1 PS: $100
   - Division 1 PC: $120
   - Division 2 PS: $80
   - Division 2 PC: $95

4. **SBC**:
   - $5 (applies to both PS & PC)

5. **Clicks "Save All Prices"** ✅

## What Gets Saved

From Ahmed's example above:
- 2 coins prices (PS, PC)
- 2 Rank 3 normal prices (PS, PC)
- 12 fast service prices (6 ranks × PS, 6 ranks × PC - all $75 PS, $90 PC)
- 4 Rivals prices (Div 1&2, PS&PC)
- 2 SBC prices (PS, PC - both $5)

**Total: 22 prices saved from ~10 inputs!**

## Benefits

✅ **Clean Layout**: 2 columns, easy to scan
✅ **Fast Service**: One price for all ranks
✅ **SBC Simplified**: One input for both platforms
✅ **Less Typing**: ~18 inputs instead of 72
✅ **Logical Grouping**: Related services together

## Technical Notes

### Fast Service Logic:
```typescript
// If fast service enabled and price entered:
// Creates 6 prices (one per rank) with same amount
if (futFastService && futFastPS) {
  for (rank 1-6) {
    save price: rank, PS, fast=true, price=$75
  }
}
```

### SBC Logic:
```typescript
// One input, saves to both platforms
if (sbcPrice) {
  save: sbc_challenge, PS, price=$5
  save: sbc_challenge, PC, price=$5
}
```

## Complete! ✅

Much simpler interface:
- ✅ 2 columns (PS/PC)
- ✅ Fast service: 1 price for all ranks
- ✅ SBC: 1 price for both platforms
- ✅ Only ~18 inputs needed
- ✅ Clean, organized tables

Perfect for suppliers to quickly set their prices! 🎉
