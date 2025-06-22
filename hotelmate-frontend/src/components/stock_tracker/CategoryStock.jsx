import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";

export default function CategoryStock() {
  const { hotel_slug, category_slug } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [direction, setDirection] = useState("in"); // Default is 'in' (add to stock)
  const [quantities, setQuantities] = useState({}); // Track quantities for each item

  // Clean up category and hotel names
  const prettyCategory = category_slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const prettyHotel = hotel_slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  useEffect(() => {
    const endpoint = `stock_tracker/${hotel_slug}/stocks/?category__slug=${category_slug}`;
    api
      .get(endpoint)
      .then((res) => {
        const flatItems = res.data.results.flatMap((stock) =>
          stock.inventory_lines.map((line) => ({
            id: line.item.id,
            name: line.item.name,
            qty: line.quantity,
          }))
        );
        setItems(flatItems);
      })
      .catch((err) => setError(err.response?.data || err.message))
      .finally(() => setLoading(false));
  }, [hotel_slug, category_slug]);

  const handleAddTransaction = (item) => {
    const qty = parseFloat(quantities[item.id]);
    if (!qty) return;
    const updatedTransactions = [...transactions, { ...item, qty, direction }];
    setTransactions(updatedTransactions);
    setQuantities({ ...quantities, [item.id]: "" });
  };

  const handleCompleteStockAction = () => {
    // Send all transactions (add/remove items) to the backend
    api
      .post(`/stock_tracker/${hotel_slug}/movements/bulk/`, {
        transactions,
      })
      .then((response) => {
        // Optionally, update the stock items to reflect the changes
        setItems((items) =>
          items.map((item) => {
            const relatedTransactions = transactions.filter(
              (t) => t.id === item.id
            );
            const netQtyChange = relatedTransactions.reduce(
              (sum, t) => sum + (t.direction === "in" ? t.qty : -t.qty),
              0
            );
            return { ...item, qty: item.qty + netQtyChange };
          })
        );
        setTransactions([]); // Clear transactions after completion
      })
      .catch((err) => console.error(err));
  };

  if (loading) return <p>Loading “{prettyCategory}” stock…</p>;
  if (error)
    return <p className="text-danger">Error: {JSON.stringify(error)}</p>;

  return (
    <div className="container mt-4">
      <h1>
        {prettyCategory} for “{prettyHotel}”
      </h1>

      {/* Direction Toggle */}
      <div className="mb-3">
        <label className="form-label">Select action type:</label>
        <div>
          <button
            className={`btn btn-sm ${
              direction === "in" ? "btn-success" : "btn-outline-success"
            }`}
            onClick={() => setDirection("in")}
          >
            Stock In
          </button>
          <button
            className={`btn btn-sm ${
              direction === "out" ? "btn-danger" : "btn-outline-danger"
            } ms-2`}
            onClick={() => setDirection("out")}
          >
            Stock Out
          </button>
        </div>
      </div>

      {/* Item List with Inputs and Add Button */}
      <ul className="list-group mb-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="list-group-item d-flex justify-content-between align-items-center"
          >
            <div class="d-flex align-items-center gap-2">
              <span class="fw-bold text-primary">{item.name}</span>
              <span class="text-muted ml-2 bg-warning">({item.qty})</span>
            </div>

            <div className="d-flex align-items-center">
              <input
                type="number"
                className="form-control form-control-sm me-2"
                value={quantities[item.id] || ""}
                onChange={(e) =>
                  setQuantities({ ...quantities, [item.id]: e.target.value })
                }
              />
              <button
                className="btn btn-sm btn-primary"
                onClick={() => handleAddTransaction(item)}
              >
                Add
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Display Pending Transactions */}
      {transactions.length > 0 && (
        <>
          <h5>Pending Transactions:</h5>
          <ul className="list-group mb-3">
            {transactions.map((t, idx) => (
              <li key={idx} className="list-group-item">
                {t.direction === "in" ? "+" : "-"} {t.qty} {t.name}
              </li>
            ))}
          </ul>

          <button
            className="btn btn-success"
            onClick={handleCompleteStockAction}
          >
            Complete Stock Action
          </button>
        </>
      )}
    </div>
  );
}
