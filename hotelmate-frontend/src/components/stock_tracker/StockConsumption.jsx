import React, { useState } from "react";
import { useBarStockPdfExporter } from "@/components/stock_tracker/hooks/useBarStockPdfExporter";

export default function StockConsumption({ data, onClose }) {
  const { generateBarStockPdf } = useBarStockPdfExporter();

  const [rows, setRows] = useState(
    data.map((item) => ({
      ...item,
      sales: 0,
      waste: 0,
      final_bar_stock: item.moved_to_bar ?? 0,
      total_closing_stock: (item.closing_storage ?? 0) + (item.moved_to_bar ?? 0),
    }))
  );

  const handleChange = (id, field, value) => {
    setRows((prev) =>
      prev.map((row) =>
        row.item_id === id
          ? { ...row, [field]: Number(value) }
          : row
      )
    );
  };

  const calculateStocks = () => {
    setRows((prev) =>
      prev.map((row) => {
        const finalBarStock = row.moved_to_bar - (row.sales + row.waste);
        const totalStock = (row.closing_storage ?? 0) + finalBarStock;
        return {
          ...row,
          final_bar_stock: finalBarStock,
          total_closing_stock: totalStock,
        };
      })
    );
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
                    <th>Active Bar Stock</th>
                    <th>Sales</th>
                    <th>Waste</th>
                    <th>Final Bar Stock</th>
                    <th>Final Total Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.item_id}>
                      <td>{row.item_name}</td>
                      <td>{row.closing_storage}</td>
                      <td>{row.moved_to_bar}</td>
                      <td>
                        <input
                          type="number"
                          value={row.sales}
                          onChange={(e) =>
                            handleChange(row.item_id, "sales", e.target.value)
                          }
                          className="form-control"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.waste}
                          onChange={(e) =>
                            handleChange(row.item_id, "waste", e.target.value)
                          }
                          className="form-control"
                        />
                      </td>
                      <td>{row.final_bar_stock}</td>
                      <td>{row.total_closing_stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="modal-footer d-flex justify-content-between">
            <div>
              <button
                className="btn btn-primary me-2"
                onClick={calculateStocks}
              >
                Calculate
              </button>
              <button
                className="btn btn-success"
                onClick={() =>
                  generateBarStockPdf(
                    rows.map(r => ({
                      item_name: r.item_name,
                      closing_storage: r.closing_storage,
                      moved_to_bar: r.moved_to_bar,
                      sales: r.sales,
                      waste: r.waste,
                      final_bar_stock: r.final_bar_stock,
                      total_closing_stock: r.total_closing_stock,
                    })),
                    "Hotel Stock Consumption"
                  )
                }
              >
                Download PDF
              </button>
            </div>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
