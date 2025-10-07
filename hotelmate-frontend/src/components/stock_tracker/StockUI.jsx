import React from "react";

// 🔎 StockSearch
export const StockSearch = ({ searchTerm, setSearchTerm }) => (
  <div className="mb-4">
    <input
      type="text"
      className="form-control search-stock-form-control form-control-lg"
      placeholder="Search item by name..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
    />
  </div>
);

// 📦 StockList
export const StockList = ({
  groupedItems,
  expandedTypes,
  toggleExpand,
  searchTerm,
  quantities,
  setQuantities,
  handleAddTransaction,
}) => (
  <>
    {Object.entries(groupedItems).map(([type, items]) => {
      const filteredItems = items.filter((item) =>
        item.name.toLowerCase().includes(searchTerm)
      );
      const shouldShow = searchTerm ? filteredItems.length > 0 : true;
      if (!shouldShow) return null;

      const isExpanded = searchTerm ? true : !!expandedTypes[type];

      return (
        <div key={type} className="mb-2 pe-2">
          {/* Category Button */}
          <button
            className="btn btn-outline-secondary w-100 text-start shadow-sm"
            onClick={() => toggleExpand(type)}
          >
            <strong>{type}</strong>
          </button>

          {/* Items List */}
          {isExpanded && (
            <ul className="list-group shadow-sm">
              {filteredItems.map((item) => (
                <li
                  key={item.id}
                  className="list-group-item d-flex justify-content-between align-items-center bg-light"
                >
                  <div className="d-flex flex-column flex-md-row justify-content-between w-100 gap-2">
                    {/* Item Name */}
                    <span
                      className={`fw-semibold ${
                        item.active
                          ? "text-primary"
                          : "text-muted text-decoration-line-through"
                      }`}
                    >
                      {item.name}
                      {item.volume_per_unit && item.unit && (
                        <small className="text-muted ms-1">
                          ({item.volume_per_unit} {item.unit})
                        </small>
                      )}
                    </span>

                    {/* Quantity Badge */}
                    <span
                      className={`badge rounded-pill px-2 me-2 py-1 d-flex justify-content-center align-items-center ${
                        item.qty >= 0
                          ? "bg-secondary text-white"
                          : "bg-danger text-white"
                      }`}
                    >
                      {item.qty} pcs
                    </span>
                  </div>

                  {/* Action Controls */}
                  <div className="d-flex align-items-center gap-2 mt-2 mt-md-0">
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      style={{ maxWidth: "80px" }}
                      value={quantities[item.id] || ""}
                      onChange={(e) =>
                        setQuantities({
                          ...quantities,
                          [item.id]: e.target.value,
                        })
                      }
                    />
                    <button
                      className="custom-button"
                      onClick={() =>
                        handleAddTransaction({
                          ...item,
                          stock_id: item.stock_id,
                        })
                      }
                      disabled={!item.active}
                    >
                      Move
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    })}
  </>
);

// ✅ TransactionsList
export const TransactionsList = ({ transactions, handleCompleteStockAction }) =>
  transactions.length > 0 && (
    <>
      <h5>Pending Transactions</h5>
      <ul className="list-group mb-3">
        {transactions.map((t, i) => (
          <li key={i} className="list-group-item">
            {t.direction === "in"
              ? "+"
              : t.direction === "move_to_bar"
              ? "→ Bar"
              : "-"}{" "}
            {t.qty} × {t.name}
          </li>
        ))}
      </ul>
      <button
        className="btn btn-success"
        type="button"
        onClick={handleCompleteStockAction}
      >
        Complete Stock Action
      </button>
    </>
  );
