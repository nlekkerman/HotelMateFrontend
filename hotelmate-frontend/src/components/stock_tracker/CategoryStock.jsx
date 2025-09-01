import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";
import LowStock from "@/components/stock_tracker/LowStock";
import { useAuth } from "@/context/AuthContext";
import StockSettings from "@/components/stock_tracker/StockSettings";
import StockActions from "@/components/stock_tracker/StockActions";
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
  const [direction, setDirection] = useState("out");
  const [refreshLowStock, setRefreshLowStock] = useState(0);
  const [stock, setStock] = useState(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showMovements, setShowMovements] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [showCocktailCalculator, setShowCocktailCalculator] = useState(false);
  const [showStockAnalytics, setShowStockAnalytics] = useState(false);
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
        const results = res.data.results || [];
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
              qty: line.quantity,
              active: line.item.active_stock_item,
              volume_per_unit: line.item.volume_per_unit,
              unit: line.item.unit,
            });
          });
        });
        setGroupedItems(grouped);
      })
      .catch((err) => setError(err.response?.data || err.message))
      .finally(() => setLoading(false));
  }, [hotel_slug, category_slug]);

  const toggleExpand = (type) =>
    setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }));

  const handleAddTransaction = (item) => {
    const qty = parseFloat(quantities[item.id]);
    if (!qty) return;
    setTransactions([...transactions, { ...item, qty, direction }]);
    setQuantities({ ...quantities, [item.id]: "" });
  };

  const handleCompleteStockAction = () => {
    api
      .post(`/stock_tracker/${hotel_slug}/movements/bulk/`, { transactions })
      .then(() => {
        setTransactions([]);
        setRefreshLowStock((v) => v + 1);
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
      <h1 className="title-container">
        {prettyCategory} for “{prettyHotel}”
      </h1>

      {canAccessSettings && (
        <SettingsActionsAdministrator
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          showMovements={showMovements}
          setShowMovements={setShowMovements}
          showCocktailCalculator={showCocktailCalculator}
          setShowCocktailCalculator={setShowCocktailCalculator}
          showStockAnalytics={showStockAnalytics}
          setShowStockAnalytics={setShowStockAnalytics}
        />
      )}
      {showCocktailCalculator && (
        <CocktailCalculator onClose={() => setShowCocktailCalculator(false)} />
      )}

      <StockSearch searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

      {showSettings && (
        <React.Suspense fallback={<div>Loading settings…</div>}>
          <StockSettings
            stock={stock}
            hotelSlug={hotel_slug}
            categorySlug={category_slug}
          />
        </React.Suspense>
      )}
      {showStockAnalytics && (
        <React.Suspense fallback={<div>Loading analytics…</div>}>
          <StockAnalytics hotelSlug={hotel_slug} />
        </React.Suspense>
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
    </div>
  );
}
