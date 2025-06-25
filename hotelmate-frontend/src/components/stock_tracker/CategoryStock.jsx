import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";
import LowStock from "@/components/stock_tracker/LowStock";
import { useAuth } from "@/context/AuthContext";
import StockSettings from "@/components/stock_tracker/StockSettings";
const StockMovements = React.lazy(() =>
  import("@/components/stock_tracker/StockMovements")
);
export default function CategoryStock() {
  const { hotel_slug, category_slug } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [direction, setDirection] = useState("out");
  const [quantities, setQuantities] = useState({});
  const [refreshLowStock, setRefreshLowStock] = useState(0);
  const { user } = useAuth();
  const [staffProfile, setStaffProfile] = useState(null);
  const canAccessSettings =
    user?.is_superuser || user?.access_level === "super_staff_admin";
  const [stocks, setStocks] = useState([]);
  const [stock, setStock] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMovements, setShowMovements] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .get("/staff/me/")
      .then((res) => setStaffProfile(res.data))
      .catch(() => setStaffProfile(null));
  }, [user]);

  const isStaffAdmin = staffProfile?.access_level === "staff_admin";
  const isSuperStaffAdmin = staffProfile?.access_level === "super_staff_admin";
  const canViewSettings = isStaffAdmin || isSuperStaffAdmin;

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
        setStocks(res.data.results);
        if (res.data.results.length > 0) {
          setStock(res.data.results[0]);
        }
        const flatItems = res.data.results.flatMap((stock) =>
          stock.inventory_lines.map((line) => ({
            id: line.item.id,
            name: line.item.name,
            qty: line.quantity,
            active: line.item.active_stock_item,
            volume_per_unit: line.item.volume_per_unit,
            unit: line.item.unit,
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
    api
      .post(`/stock_tracker/${hotel_slug}/movements/bulk/`, {
        transactions,
      })
      .then(() => {
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
        setTransactions([]);
        setRefreshLowStock((v) => v + 1);
      })
      .catch((err) => console.error(err));
  };

  // ✅ New: Allow StockSettings to update item active state too
  const handleToggleFromSettings = (itemId, newStatus) => {
    if (newStatus) {
      // 🔼 Activated: fetch the item from API and add to list
      api
        .get(`/stock_tracker/${hotel_slug}/items/${itemId}/`)
        .then((res) => {
          const newItem = res.data;
          setItems((prev) => [
            ...prev,
            {
              id: newItem.id,
              name: newItem.name,
              qty: newItem.quantity || 0,
              active: true,
            },
          ]);
        })
        .catch((err) => {
          console.error("Failed to re-add item:", err);
        });
    } else {
      // 🔽 Deactivated: remove from list
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    }
  };

  if (loading) return <p>Loading “{prettyCategory}” stock…</p>;
  if (error)
    return <p className="text-danger">Error: {JSON.stringify(error)}</p>;

  return (
    <div className="container mt-4">
      {/* ⬇️ Pass toggle callback to settings */}
      {canAccessSettings && (
        <div className="mb-4">
          <div className="d-flex gap-2 mb-2">
            <button
              className={`btn btn-outline-secondary btn-sm ${
                showSettings ? "active" : ""
              }`}
              onClick={() => {
                setShowSettings((prev) => !prev);
                if (!showSettings) setShowMovements(false);
              }}
            >
              {showSettings ? "Hide" : "Show"} Stock Settings
            </button>
            <button
              className={`btn btn-outline-secondary btn-sm ${
                showMovements ? "active" : ""
              }`}
              onClick={() => {
                setShowMovements((prev) => !prev);
                if (!showMovements) setShowSettings(false);
              }}
            >
              {showMovements ? "Hide" : "Show"} Stock Movements
            </button>
          </div>

          {showSettings && (
            <StockSettings
              stock={stock}
              hotelSlug={hotel_slug}
              categorySlug={category_slug}
              onToggleActive={handleToggleFromSettings}
            />
          )}

          {showMovements && (
            <div className="mt-3">
              {/* Lazy load StockMovement when you add the file */}
              <React.Suspense fallback={<div>Loading movements…</div>}>
                <StockMovements
                  stock={stock}
                  hotelSlug={hotel_slug}
                  categorySlug={category_slug}
                />
              </React.Suspense>
            </div>
          )}
        </div>
      )}

      <LowStock hotelSlug={hotel_slug} refresh={refreshLowStock} />
      <h1>
        {prettyCategory} for “{prettyHotel}”
      </h1>

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

      <ul className="list-group mb-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="list-group-item d-flex justify-content-between bg-white mb-3 shadow-sm align-items-center"
          >
            <div className="d-flex align-items-center justify-content-between w-100 gap-3">
              <span
                className={`fw-bold ${
                  item.active
                    ? "text-primary"
                    : "text-muted text-decoration-line-through"
                }`}
              >
                {item.name}{" "}
                {item.volume_per_unit && item.unit && (
                  <small className="text-muted ms-2">
                    ({item.volume_per_unit} {item.unit})
                  </small>
                )}
              </span>

              <span
                className={`border rounded shadow-sm p-1 text-white ${
                  item.qty >= 0 ? "bg-success" : "bg-danger"
                }`}
              >
                {item.qty} (pcs)
              </span>
            </div>

            <div className="d-flex align-items-center gap-2">
              <input
                type="number"
                className="form-control form-control-sm  bg-white mx-2"
                value={quantities[item.id] || ""}
                onChange={(e) =>
                  setQuantities({ ...quantities, [item.id]: e.target.value })
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
