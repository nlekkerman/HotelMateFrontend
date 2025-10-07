import React, { useState } from "react";
import api from "@/services/api";
import { useBarStockPdfExporter } from "@/components/stock_tracker/hooks/useBarStockPdfExporter";
import ConfirmationModal from "@/components/modals/ConfirmationModal";

export default function StockConsumption({
  data,
  hotelSlug,
  onClose,
  startDate,
  endDate,
}) {
  const { generateBarStockPdf } = useBarStockPdfExporter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const [rows, setRows] = useState(
    data.map((item) => ({
      ...item,
      waste: 0,
      final_bar_stock: "",
    }))
  );

  const handleChange = (id, field, value) => {
    setRows((prev) =>
      prev.map((row) =>
        row.item_id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const finalizeStockPeriod = async () => {
    setFinalizing(true);
    try {
      await api.post(`/stock_tracker/${hotelSlug}/stock-periods/`, {
        period_type: "week", // or dynamically set
        reference_date: startDate,
      });

      setShowConfirm(false);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error finalizing period: " + err.message);
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1">
      <div className="modal-dialog modal-xl">
        <div className="modal-content bg-dark text-white">
          <div className="modal-header">
            <h5 className="modal-title">Stock Consumption</h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            <div className="table-responsive">
              <table className="table table-dark table-bordered align-middle">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Closing (Storage) Stock</th>
                    <th>Moved to Bar Stock</th>
                    <th>Final Bar Stock</th>
                    <th>Waste</th>
                    <th>Sales (Derived)</th>
                    <th>Final Total Stock</th>
                  </tr>
                </thead>
                <tbody>
                 {rows.map((row) => {
  const finalBarStock =
    row.final_bar_stock === "" || row.final_bar_stock === null
      ? null
      : Number(row.final_bar_stock);

  const waste = Number(row.waste) || 0;

  // Sales only calculated after final_bar_stock is entered
  const derivedSales =
    finalBarStock !== null
      ? (row.opening_bar ?? 0) + (row.moved_to_bar ?? 0) - finalBarStock
      : 0;

  const totalClosingStock =
    (row.closing_storage ?? 0) + (finalBarStock ?? 0) - waste;

  return (
    <tr key={row.item_id}>
      <td>{row.item_name}</td>
      <td>{row.closing_storage}</td>
      <td>{row.moved_to_bar}</td>
      <td>
        <input
          type="number"
          value={row.final_bar_stock}
          onFocus={(e) => e.target.select()}
          onChange={(e) =>
            handleChange(row.item_id, "final_bar_stock", e.target.value)
          }
          className="form-control"
        />
      </td>
      <td>
        <input
          type="number"
          value={row.waste}
          onFocus={(e) => e.target.select()}
          onChange={(e) =>
            handleChange(row.item_id, "waste", e.target.value)
          }
          className="form-control"
        />
      </td>
      <td>{derivedSales}</td>
      <td>{totalClosingStock}</td>
    </tr>
  );
})}

                </tbody>
              </table>
            </div>
          </div>
          <div className="modal-footer d-flex justify-content-between">
            <div>
              <button
                className="btn btn-success"
                onClick={() =>
                  generateBarStockPdf(
                    rows.map((r) => {
                      const finalBarStock = Number(r.final_bar_stock) || 0;
                      const waste = Number(r.waste) || 0;

                      return {
                        item_name: r.item_name,
                        closing_storage: r.closing_storage,
                        moved_to_bar: r.moved_to_bar,
                        sales:
                          (r.opening_bar ?? 0) +
                          (r.moved_to_bar ?? 0) -
                          finalBarStock,
                        waste,
                        final_bar_stock: finalBarStock,
                        total_closing_stock:
                          (r.closing_storage ?? 0) +
                          finalBarStock -
                          waste,
                      };
                    }),
                    "Hotel Stock Consumption"
                  )
                }
              >
                Download PDF
              </button>
              <button
                className="btn btn-warning mx-2"
                onClick={() => setShowConfirm(true)}
              >
                Finalize Period
              </button>
            </div>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmationModal
          title="Finalize Stock Period"
          message="Are you sure you want to close this stock period? This will save current stocks as the closing values and set them as opening for next period."
          onCancel={() => setShowConfirm(false)}
          onConfirm={finalizeStockPeriod}
          disabled={finalizing}
        />
      )}
    </div>
  );
}
