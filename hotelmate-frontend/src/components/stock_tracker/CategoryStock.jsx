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
  const [successMessage, setSuccessMessage] = useState(
    "Stock updated successfully!"
  );

  const prettyCategory = (category_slug || "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const prettyHotel = (hotel_slug || "")
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

        if (!results.length) {
          setGroupedItems({});
          setStock(null);
          return;
        }

        // If multiple stocks returned, pick first (same as before)
        const parentStock = results[0];
        setStock(parentStock);

        const grouped = {};
        results.forEach((s) => {
          s.inventory_lines?.forEach((line) => {
            const type = line.item?.type || "Uncategorized";
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push({
              // note: backend expects StockItem.id when creating movements
              id: line.item.id,
              // keep reference to parent stock id if you need it for auditing/display
              stock_id: parentStock.id,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotel_slug, category_slug]);

  const toggleExpand = (type) =>
    setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }));

  // --- Add transaction (frontend) ---
  // Accept a single item; item.id is the StockItem id (what backend expects)
  const handleAddTransaction = (item) => {
    // Get quantity for this item id (string from input)
    const rawQty = quantities[item.id];
    const qty = parseFloat(rawQty);

    // Validate
    if (!rawQty && rawQty !== 0) {
      // nothing entered
      console.warn(`No quantity entered for ${item.name}`);
      return;
    }
    if (Number.isNaN(qty) || qty <= 0) {
      console.warn(`Invalid qty for ${item.name}:`, rawQty);
      return;
    }

    const newTransaction = {
      // backend expects `item` (StockItem.id) and `quantity`
      item: item.id,
      name: item.name, // frontend-only helper for display in TransactionsList
      qty,
      direction,
    };
    console.log("➕ Adding transaction:", newTransaction);

    setTransactions((prev) => [...prev, newTransaction]);
    setQuantities((prev) => ({ ...prev, [item.id]: "" }));

    // Update displayed groupedItems quantities locally (optimistic UI)
    setGroupedItems((prev) => {
      const newGrouped = { ...prev };
      for (const type in newGrouped) {
        newGrouped[type] = newGrouped[type].map((i) => {
          if (i.id === item.id) {
            let change = 0;
            if (direction === "move_to_bar") {
              change = -qty;
            } else if (direction === "in") {
              change = qty;
            }
            const updatedQty = (Number(i.qty) || 0) + change;
            console.log(`   Updated qty for ${i.name}: ${i.qty} → ${updatedQty}`);
            return { ...i, qty: updatedQty };
          }
          return i;
        });
      }
      return newGrouped;
    });
  };

  // --- Submit to backend ---
  const handleCompleteStockAction = (e) => {
    if (e) e.preventDefault();
    if (!transactions.length) return;

    // Map frontend transactions to backend-expected shape:
    // backend uses `item` (StockItem.id), `direction`, `quantity`
    const payloadTransactions = transactions.map((t) => ({
      id: t.item,
      direction: t.direction,
      qty: t.qty,
    }));

    console.log("📤 Submitting transactions to backend:", payloadTransactions);

    api
      .post(`/stock_tracker/${hotel_slug}/movements/bulk/`, {
        transactions: payloadTransactions,
      })
      .then(() => {
        console.log("✅ Transactions submitted successfully");
        setTransactions([]);
        setRefreshLowStock((v) => v + 1);
        setSuccessMessage("Stock movements completed successfully!");
        setShowSuccessModal(true);
      })
      .catch((err) => {
        console.error("❌ Stock action failed:", err);
        if (err.response?.data) console.error("Backend response:", err.response.data);
        setError(err.response?.data || err.message);
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
            // pass simple handler; StockList should only pass item
            handleAddTransaction={(item) => handleAddTransaction(item)}
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
