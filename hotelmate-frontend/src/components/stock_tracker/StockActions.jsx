import React from "react";

export default function StockActions({ direction, setDirection }) {
  return (
    <div className="mb-3 text-center">
      <label className="form-label text-white">Select action type:</label>
      <div className="d-flex gap-2 justify-content-center flex-wrap">
        <button
          className={`btn btn-lg ${
            direction === "in"
              ? "btn-success"
              : "btn-outline-light border-danger text-dark"
          }`}
          onClick={() => setDirection("in")}
        >
          Stock In
        </button>

        <button
          className={`btn btn-lg ${
            direction === "move_to_bar"
              ? "btn-success"
              : "btn-outline-light border-danger text-dark"
          }`}
          onClick={() => setDirection("move_to_bar")}
        >
          Move to Bar
        </button>
      </div>
    </div>
  );
}
