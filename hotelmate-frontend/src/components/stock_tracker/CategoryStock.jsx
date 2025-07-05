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
  const [groupedItems, setGroupedItems] = useState({});
  const [expandedTypes, setExpandedTypes] = useState({});
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [direction, setDirection] = useState("out");
  const [refreshLowStock, setRefreshLowStock] = useState(0);
  const [lowStockItems, setLowStockItems] = useState([]);

  const [staffProfile, setStaffProfile] = useState(null);
  const [stock, setStock] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMovements, setShowMovements] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const prettyCategory = category_slug
    .split("-")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const prettyHotel = hotel_slug
    .split("-")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  useEffect(() => {
    if (!user) return;
    api.get("/staff/me/").then(res => setStaffProfile(res.data));
  }, [user]);

useEffect(() => {
  const endpoint = `stock_tracker/${hotel_slug}/stocks/?category__slug=${category_slug}`;
  console.log("➡️ Fetching stock from:", endpoint);
  api.get(endpoint)
    .then(res => {
      const results = res.data.results;
      console.log("✅ Stock API response:", results);

      if (!results || results.length === 0) {
        console.warn("⚠️ No stocks returned.");
        return;
      }

      setStock(results[0]);

      const grouped = {};
      results.forEach(stock => {
        if (!stock.inventory_lines || stock.inventory_lines.length === 0) {
          console.warn(`⚠️ Stock ${stock.id} has no inventory lines.`);
          return;
        }

        stock.inventory_lines.forEach(line => {
          const type = line.item?.type || "Uncategorized";
          if (!grouped[type]) grouped[type] = [];
          grouped[type].push({
            id: line.item.id,
            name: line.item.name,
            qty: line.quantity,
            active: line.item.active_stock_item,
            volume_per_unit: line.item.volume_per_unit,
            unit: line.item.unit,
          });
        });
      });

      console.log("📦 Grouped items by type:", grouped);
      setGroupedItems(grouped);
    })
    .catch(err => {
      console.error("❌ Error fetching stock data:", err);
      setError(err.response?.data || err.message);
    })
    .finally(() => setLoading(false));
}, [hotel_slug, category_slug]);


  const toggleExpand = (type) => {
    setExpandedTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleAddTransaction = (item) => {
    const qty = parseFloat(quantities[item.id]);
    if (!qty) return;
    setTransactions([...transactions, { ...item, qty, direction }]);
    setQuantities({ ...quantities, [item.id]: "" });
  };

  const handleCompleteStockAction = () => {
    api.post(`/stock_tracker/${hotel_slug}/movements/bulk/`, { transactions })
      .then(() => {
        setTransactions([]);
        setRefreshLowStock(v => v + 1);
      });
  };

  const canAccessSettings =
    user?.is_superuser || user?.access_level === "super_staff_admin";

  if (loading) return <p>Loading “{prettyCategory}” stock…</p>;

  return (
    <div className="transparent-container-bg mt-4">
      <h1 className="title-container">
        {prettyCategory} for “{prettyHotel}”
      </h1>

      {canAccessSettings && (
        <div className="mb-3 d-flex gap-2 d-flex-column d-lg-flex-row justify-content-center">
          <button
            className="custom-button"
            onClick={() => {
              setShowSettings(!showSettings);
              setShowMovements(false);
            }}
          >
            {showSettings ? "Hide" : "Show"} Stock Settings
          </button>
          <button
            className="custom-button"
            onClick={() => {
              setShowMovements(!showMovements);
              setShowSettings(false);
            }}
          >
            {showMovements ? "Hide" : "Show"} Stock Movements
          </button>
        </div>
      )}
<div className="mb-4">
  <input
    type="text"
    className="form-control form-control-lg"
    placeholder="Search item by name..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
  />
</div>
      {showSettings && (
        <StockSettings
          stock={stock}
          hotelSlug={hotel_slug}
          categorySlug={category_slug}
        />
      )}

      {showMovements && (
        <React.Suspense fallback={<div>Loading movements…</div>}>
          <StockMovements
            stock={stock}
            hotelSlug={hotel_slug}
            categorySlug={category_slug}
          />
        </React.Suspense>
      )}

      <LowStock hotelSlug={hotel_slug} refresh={refreshLowStock} />

      <div className="mb-3">
        <label className="form-label text-white">Select action type:</label>
        <div className="d-flex gap-2 justify-content-center">
  <button
    className={`btn btn-lg ${
      direction === "in" ? "btn-danger" : "btn-outline-light border-danger text-danger"
    }`}
    onClick={() => setDirection("in")}
  >
    Stock In
  </button>
  <button
    className={`btn btn-lg ${
      direction === "out" ? "btn-danger" : "btn-outline-light border-danger text-danger"
    }`}
    onClick={() => setDirection("out")}
  >
    Stock Out
  </button>
</div>

      </div>

      {Object.entries(groupedItems).map(([type, items]) => {
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm)
  );

  // Show only types with matches during search
  const shouldShow = searchTerm ? filteredItems.length > 0 : true;
  if (!shouldShow) return null;

  const isExpanded = searchTerm
    ? true // auto-expand on search
    : !!expandedTypes[type];

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


      {transactions.length > 0 && (
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
      )}
    </div>
  );
}
