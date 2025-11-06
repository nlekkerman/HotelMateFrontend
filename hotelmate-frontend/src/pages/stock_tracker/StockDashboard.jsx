// src/pages/stock_tracker/StockDashboard.jsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function StockDashboard() {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();

  const features = [
    {
      title: "Stock Items",
      description: "Manage inventory items, categories, and pricing",
      icon: "📦",
      path: `/stock_tracker/${hotel_slug}/items`,
      color: "primary"
    },
    {
      title: "Stock Movements",
      description: "Record purchases, sales, waste, and transfers",
      icon: "📊",
      path: `/stock_tracker/${hotel_slug}/movements`,
      color: "success"
    },
    {
      title: "Stocktakes",
      description: "Perform periodic inventory counts and variance analysis",
      icon: "📋",
      path: `/stock_tracker/${hotel_slug}/stocktakes`,
      color: "warning"
    },
    {
      title: "Cocktail Calculator",
      description: "Calculate ingredient usage for cocktails",
      icon: "🍹",
      path: `/stock_tracker/${hotel_slug}/cocktails`,
      color: "info"
    }
  ];

  return (
    <div className="container mt-4">
      <div className="text-center mb-5">
        <h1 className="display-4 mb-3">Stock Tracker</h1>
        <p className="lead text-muted">Comprehensive inventory management system</p>
      </div>

      <div className="row g-4">
        {features.map((feature, index) => (
          <div key={index} className="col-12 col-md-6 col-lg-3">
            <div 
              className="card h-100 shadow-sm border-0 hover-shadow" 
              style={{ cursor: "pointer", transition: "all 0.3s" }}
              onClick={() => navigate(feature.path)}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div className={`card-header bg-${feature.color} text-white text-center py-4`}>
                <div style={{ fontSize: "3rem" }}>{feature.icon}</div>
              </div>
              <div className="card-body text-center">
                <h5 className="card-title mb-3">{feature.title}</h5>
                <p className="card-text text-muted small">{feature.description}</p>
              </div>
              <div className="card-footer bg-transparent border-0 text-center pb-3">
                <button className={`btn btn-${feature.color} btn-sm`}>
                  Open <i className="bi bi-arrow-right ms-1"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats Section */}
      <div className="row mt-5">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-4">Quick Overview</h5>
              <div className="row text-center">
                <div className="col-6 col-md-3 mb-3">
                  <div className="p-3">
                    <div className="h2 mb-0 text-primary">--</div>
                    <small className="text-muted">Total Items</small>
                  </div>
                </div>
                <div className="col-6 col-md-3 mb-3">
                  <div className="p-3">
                    <div className="h2 mb-0 text-success">--</div>
                    <small className="text-muted">Movements Today</small>
                  </div>
                </div>
                <div className="col-6 col-md-3 mb-3">
                  <div className="p-3">
                    <div className="h2 mb-0 text-warning">--</div>
                    <small className="text-muted">Pending Stocktakes</small>
                  </div>
                </div>
                <div className="col-6 col-md-3 mb-3">
                  <div className="p-3">
                    <div className="h2 mb-0 text-info">--</div>
                    <small className="text-muted">Low Stock Items</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
