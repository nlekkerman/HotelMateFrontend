import React from "react";

export default function StockActions({ direction, setDirection }) {
  return (
    <div className="mb-3">
      <label className="form-label text-white">Select action type:</label>
      <div className="d-flex gap-2 justify-content-center">
        <button
          className={`btn btn-lg ${
            direction === "in"
              ? "btn-danger"
              : "btn-outline-light border-danger text-danger"
          }`}
          onClick={() => setDirection("in")}
        >
          Stock In
        </button>
        <button
          className={`btn btn-lg ${
            direction === "out"
              ? "btn-danger"
              : "btn-outline-light border-danger text-danger"
          }`}
          onClick={() => setDirection("out")}
        >
          Stock Out
        </button>
      </div>
    </div>
  );
}
