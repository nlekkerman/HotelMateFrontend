import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";
import LowStock from "@/components/stock_tracker/LowStock";
import { useAuth } from "@/context/AuthContext";
import StockSettings from "@/components/stock_tracker/StockSettings";
import StockActions from "@/components/stock_tracker/StockActions";
import SuccessModal from "@/components/modals/SuccessModal";

import {
  StockSearch,
  StockList,
  TransactionsList,
} from "@/components/stock_tracker/StockUI";
import SettingsActionsAdministrator from "@/components/stock_tracker/SettingsActionsAdministrator";
import { CocktailCalculator } from "@/components/stock_tracker/CocktailCalculator";
import StockAnalytics from "@/components/stock_tracker/StockAnalytics";

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
  const [direction, setDirection] = useState("move_to_bar");
  const [refreshLowStock, setRefreshLowStock] = useState(0);
  const [stock, setStock] = useState(null);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [activePanel, setActivePanel] = useState(null);
const [searchTerm, setSearchTerm] = useState("");

const [showSuccessModal, setShowSuccessModal] = useState(false);
const [successMessage, setSuccessMessage] = useState("Stock updated successfully!");

  const prettyCategory = category_slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const prettyHotel = hotel_slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  // Fetch stock and group items by type
 const fetchStock = () => {
  setLoading(true);
  const endpoint = `stock_tracker/${hotel_slug}/stocks/?category__slug=${category_slug}`;
  api
    .get(endpoint)
    .then((res) => {
      const results = res.data.results || [];

      console.log("Raw stock API response:", results); // 🔍 Log the API response

      if (!results.length) return;

      setStock(results[0]);

      const grouped = {};
      results.forEach((stock) => {
        stock.inventory_lines?.forEach((line) => {
          const type = line.item?.type || "Uncategorized";
          if (!grouped[type]) grouped[type] = [];
          grouped[type].push({
            id: line.item.id,
            name: line.item.name,
            qty: line.item.quantity,
            active: line.item.active_stock_item,
            volume_per_unit: line.item.volume_per_unit,
            unit: line.item.unit,
          });
        });
      });

      console.log("Grouped items:", grouped); // 🔍 Log grouped data

      setGroupedItems(grouped);
    })
    .catch((err) => {
      console.error("Error fetching stock:", err); // 🔍 Log any errors
      setError(err.response?.data || err.message);
    })
    .finally(() => setLoading(false));
};


  useEffect(() => {
    fetchStock();
  }, [hotel_slug, category_slug]);

  const toggleExpand = (type) =>
    setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }));

  // Add transaction and update UI optimistically
const handleAddTransaction = (item) => {
  const qty = parseFloat(quantities[item.id]);
  if (!qty) return;

  // Use currently selected direction
  const newTransaction = { ...item, qty, direction };
  setTransactions([...transactions, newTransaction]);
  setQuantities({ ...quantities, [item.id]: "" });

  // Optimistic UI updates based on direction
  setGroupedItems((prev) => {
    const newGrouped = { ...prev };
    for (const type in newGrouped) {
      newGrouped[type] = newGrouped[type].map((i) => {
        if (i.id === item.id) {
          let change = 0;
          if (direction === "move_to_bar") {
            change = -qty; // moving to bar decreases storage
          } else if (direction === "in") {
            change = qty;  // stock in increases storage
          }
          return { ...i, qty: i.qty + change };
        }
        return i;
      });
    }
    return newGrouped;
  });
};



const handleCompleteStockAction = (e) => {
  if (e) e.preventDefault();

  // Optimistic UI already done
  api
    .post(`/stock_tracker/${hotel_slug}/movements/bulk/`, { transactions })
    .then(() => {
      setTransactions([]);                 // clear transactions
      setRefreshLowStock((v) => v + 1);    // refresh low stock
      setSuccessMessage("Stock movements completed successfully!");
      setShowSuccessModal(true);           // show modal immediately

      
    })
    .catch((err) => {
      console.error("Stock action failed:", err);
      setError(err.response?.data || err.message);
      // Optionally, rollback optimistic UI
    });
};


  const canAccessSettings =
    user?.is_superuser || user?.access_level === "super_staff_admin";

  if (loading) {
    return (
      <div className="loading text-center">
        <div className="spinner-border text-dark mb-3" role="status" />
        <p>Loading “{prettyCategory}” stock…</p>
      </div>
    );
  }

 return (
  <div className="transparent-container-bg mt-4">
    <h1 className="text-center title-container">
      {prettyHotel}'s <br className="d-block d-md-none" /> {prettyCategory}
    </h1>

    {canAccessSettings && (
      <SettingsActionsAdministrator
        activePanel={activePanel}
        setActivePanel={setActivePanel}
      />
    )}

    {/* Conditionally render each panel */}
    {activePanel === "cocktail" && (
      <CocktailCalculator onClose={() => setActivePanel(null)} />
    )}

    <StockSearch searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

    {activePanel === "settings" && (
      <React.Suspense fallback={<div>Loading settings…</div>}>
        <StockSettings
          stock={stock}
          hotelSlug={hotel_slug}
          categorySlug={category_slug}
        />
      </React.Suspense>
    )}

    {activePanel === "analytics" && (
      <React.Suspense fallback={<div>Loading analytics…</div>}>
        <StockAnalytics hotelSlug={hotel_slug} />
      </React.Suspense>
    )}

    {activePanel === "movements" && (
      <React.Suspense fallback={<div>Loading movements…</div>}>
        <StockMovements
          stock={stock}
          hotelSlug={hotel_slug}
          categorySlug={category_slug}
        />
      </React.Suspense>
    )}

    <SuccessModal
      show={showSuccessModal}
      message={successMessage}
      onClose={() => setShowSuccessModal(false)}
    />

    {/* Only show stock list + actions if NO admin panel is active */}
    {activePanel === null && (
      <>
        <LowStock hotelSlug={hotel_slug} refresh={refreshLowStock} />
        <StockActions direction={direction} setDirection={setDirection} />

        <StockList
          groupedItems={groupedItems}
          expandedTypes={expandedTypes}
          toggleExpand={toggleExpand}
          searchTerm={searchTerm}
          quantities={quantities}
          setQuantities={setQuantities}
          handleAddTransaction={handleAddTransaction}
        />

        <TransactionsList
          transactions={transactions}
          handleCompleteStockAction={handleCompleteStockAction}
        />
      </>
    )}
  </div>
);

}
