import React from "react";

// 🔎 StockSearch
export const StockSearch = ({ searchTerm, setSearchTerm }) => (
  <div className="mb-4">
    <input
      type="text"
      className="form-control form-control-lg"
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
        <div key={type} className="mb-3">
          <button
            className="btn btn-outline-light w-100 text-start mb-1"
            onClick={() => toggleExpand(type)}
          >
            <strong className="text-dark">{type}</strong>
          </button>
          {isExpanded && (
            <ul className="list-group">
              {filteredItems.map((item) => (
                <li
                  key={item.id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div className="d-flex justify-content-between w-100 gap-3">
                    <span
                      className={`fw-bold ${
                        item.active
                          ? "text-primary"
                          : "text-muted text-decoration-line-through"
                      }`}
                    >
                      {item.name}
                      {item.volume_per_unit && item.unit && (
                        <small className="text-muted ms-2">
                          ({item.volume_per_unit} {item.unit})
                        </small>
                      )}
                    </span>
                    <span
                      className={`badge rounded-pill d-flex justify-content-center align-items-center ${
                        item.qty >= 0 ? "bg-success" : "bg-danger"
                      }`}
                    >
                      {item.qty} pcs
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <input
                      type="number"
                      className="form-control form-control-sm bg-white"
                      value={quantities[item.id] || ""}
                      onChange={(e) =>
                        setQuantities({
                          ...quantities,
                          [item.id]: e.target.value,
                        })
                      }
                    />
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleAddTransaction(item)}
                      disabled={!item.active}
                    >
                      Add
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
export const TransactionsList = ({
  transactions,
  handleCompleteStockAction,
}) =>
  transactions.length > 0 && (
    <>
      <h5>Pending Transactions</h5>
      <ul className="list-group mb-3">
        {transactions.map((t, i) => (
          <li key={i} className="list-group-item">
            {t.direction === "in" ? "+" : "-"} {t.qty} × {t.name}
          </li>
        ))}
      </ul>
      <button className="btn btn-success" onClick={handleCompleteStockAction}>
        Complete Stock Action
      </button>
    </>
  );
