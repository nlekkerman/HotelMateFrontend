# Stock Tracker System

Complete inventory management system with stocktake functionality and cocktail calculator.

## Features

### 1. **Stock Items Management**
- **Location**: `/stock_tracker/:hotel_slug/items`
- Add, edit, and delete stock items
- Organize by categories (Wine, Spirits, Beer, etc.)
- Track: code, description, size, UOM, costs, selling prices
- Monitor current quantities and GP percentages
- Filter by category and search by code/description

### 2. **Stock Movements**
- **Location**: `/stock_tracker/:hotel_slug/movements`
- Record all inventory transactions:
  - 📦 **Purchases** - Stock received (increases qty)
  - 💰 **Sales** - Stock consumed (decreases qty)
  - 🗑️ **Waste** - Breakage/spoilage (decreases qty)
  - ⬅️ **Transfer In** - Received from another location
  - ➡️ **Transfer Out** - Sent to another location
  - ⚙️ **Adjustment** - Manual corrections
- Filter by type and date range
- Auto-updates item quantities

### 3. **Stocktakes** (Main Feature)
- **Location**: `/stock_tracker/:hotel_slug/stocktakes`

#### Workflow:
1. **Create Stocktake** - Define period dates (e.g., Nov 1-30)
2. **Populate** - Auto-generate lines for all items with:
   - Opening quantities
   - Period movements (purchases, sales, waste, transfers)
   - Expected quantities (calculated)
3. **Count Physical Stock**:
   - Input full units (e.g., 13 cases)
   - Input partial units (e.g., 8 loose bottles)
   - System calculates counted quantity
4. **Review Variances**:
   - Expected vs Counted comparison
   - Value calculations
   - Category subtotals
5. **Approve** - Finalizes stocktake and creates adjustment movements

#### Features:
- Status tracking (Draft/Approved)
- Category-wise grouping
- Variance highlighting (green = surplus, red = shortage)
- Locked after approval (no edits)
- Category totals summary

### 4. **Cocktail Calculator**
- **Location**: `/stock_tracker/:hotel_slug/cocktails`
- Create cocktail recipes with ingredients
- Calculate ingredient usage based on quantities made
- Track total consumption

## Components Structure

```
src/components/stock_tracker/
├── CocktailCalculator.jsx              # Cocktail calculator feature
├── modals/
│   ├── CocktailModal.jsx               # Create cocktails
│   ├── IngredientModal.jsx             # Create ingredients
│   ├── StockItemModal.jsx              # Add/edit stock items
│   ├── MovementModal.jsx               # Record movements
├── stock_items/
│   └── StockItemsList.jsx              # Stock items management
├── movements/
│   └── MovementsList.jsx               # Movement history
├── stocktakes/
│   ├── StocktakesList.jsx              # List all stocktakes
│   └── StocktakeDetail.jsx             # Stocktake detail view
└── hooks/
    ├── useCocktailCalculator.js        # Cocktail logic
    ├── useStockItems.js                # Stock items API calls
    ├── useMovements.js                 # Movements API calls
    └── useStocktakes.js                # Stocktakes API calls
```

## API Endpoints Required

### Stock Items
- `GET /stock_tracker/:hotel_slug/items/`
- `POST /stock_tracker/:hotel_slug/items/`
- `PATCH /stock_tracker/:hotel_slug/items/:id/`
- `DELETE /stock_tracker/:hotel_slug/items/:id/`
- `GET /stock_tracker/:hotel_slug/stock-categories/`

### Movements
- `GET /stock_tracker/:hotel_slug/movements/`
- `POST /stock_tracker/:hotel_slug/movements/`

### Stocktakes
- `GET /stock_tracker/:hotel_slug/stocktakes/`
- `POST /stock_tracker/:hotel_slug/stocktakes/`
- `GET /stock_tracker/:hotel_slug/stocktakes/:id/`
- `POST /stock_tracker/:hotel_slug/stocktakes/:id/populate/`
- `PATCH /stock_tracker/:hotel_slug/stocktake-lines/:id/`
- `GET /stock_tracker/:hotel_slug/stocktakes/:id/category-totals/`
- `POST /stock_tracker/:hotel_slug/stocktakes/:id/approve/`

### Cocktails (Separate System)
- `GET /stock_tracker/cocktails/`
- `POST /stock_tracker/cocktails/`
- `GET /stock_tracker/ingredients/`
- `POST /stock_tracker/ingredients/`
- `POST /stock_tracker/consumptions/`

## Bootstrap Components Used

- **Cards** - Dashboard navigation, info displays
- **Tables** - Data grids with hover effects
- **Modals** - All create/edit forms
- **Badges** - Status indicators, quantity alerts
- **Forms** - Input fields, selects, textareas
- **Buttons** - Actions with icons
- **Alerts** - Error and info messages
- **Spinners** - Loading indicators
- **Grid System** - Responsive layouts

## Formulas (Based on API Guide)

### Expected Quantity
```
expected_qty = opening + purchases - sales - waste + transfers_in - transfers_out + adjustments
```

### Counted Quantity
```
counted_qty = (counted_full_units × item.uom) + counted_partial_units
```

### Variance
```
variance_qty = counted_qty - expected_qty
variance_value = variance_qty × valuation_cost
```

## Usage Example

1. Navigate to Stock Tracker dashboard
2. Add stock items (or import from backend)
3. Record movements as they occur (purchases, sales, waste)
4. At month-end, create a new stocktake
5. Populate it to generate lines with expected quantities
6. Perform physical count and input quantities
7. Review variances and category totals
8. Approve to finalize and update inventory

## Notes

- All quantities use 4 decimal places for accuracy
- Movements automatically update item quantities
- Stocktakes freeze valuation costs at approval time
- Cocktail calculator is separate from main stock tracking
- Bootstrap 5 classes used throughout for styling
- Responsive design works on mobile and desktop
