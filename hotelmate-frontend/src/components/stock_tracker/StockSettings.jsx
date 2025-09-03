import { useState, useEffect } from "react";
import api from "@/services/api";
import DeletionModal from "@/components/modals/DeletionModal";

const StockSettings = ({ stock, onToggleActive }) => {
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    quantity: 0,
    alert_quantity: 0,
    volume_per_unit: "",
    unit: "",
    type: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [error, setError] = useState(null);
  const [itemList, setItemList] = useState([]);
  const [togglingItems, setTogglingItems] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [types, setTypes] = useState([]);

  const fetchItems = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const hotelSlug = user?.hotel_slug;
      const hotelId = user?.hotel_id;

      if (!hotelSlug || !hotelId) {
        setError("Missing hotel information.");
        setSubmitting(false);
        return;
      }

      const response = await api.get(`/stock_tracker/${hotelSlug}/items/`, {
        params: {
          page, // ✅ page-based pagination
        },
      });

      setItemList(
        Array.isArray(response.data.results) ? response.data.results : []
      );
      setTotalItems(response.data.count || 0);
    } catch (err) {
      console.error("Failed to fetch stock items:", err);
      setError("Failed to load stock items.");
    } finally {
      setSubmitting(false);
    }
  };
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
      const hotelSlug = user?.hotel_slug;
    const fetchTypes = async () => {
      try {
        const response = await api.get(
          `/stock_tracker/${hotelSlug}/item-types/`
        );
        setTypes(response.data); // assuming data is a list of {id, name, slug}
      } catch (err) {
        console.error("Failed to fetch item types:", err);
      }
    };

    fetchTypes();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [page]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const hotelSlug = user.hotel_slug;

    const dataToSend = {
      ...formData,
      hotel: user.hotel_id,
      type: formData.type || null,
    };

    try {
      if (editingItem) {
        await api.put(
          `/stock_tracker/${hotelSlug}/items/${editingItem.id}/`,
          dataToSend
        );
      } else {
        await api.post(`/stock_tracker/${hotelSlug}/items/`, dataToSend);
      }

      setShowForm(false);
      setEditingItem(null);
      setPage(1);
      fetchItems();
    } catch (err) {
      console.error(err);
      setError("Failed to save item.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      alert_quantity: item.alert_quantity,
      volume_per_unit: item.volume_per_unit,
      unit: item.unit,
      type: item.type?.id || "",
    });
    setEditingItem(item);
    setShowForm(true);
  };

  const confirmDelete = (id) => {
    setDeleteTargetId(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    setShowDeleteModal(false);
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const hotelSlug = user.hotel_slug;

    try {
      await api.delete(`/stock_tracker/${hotelSlug}/items/${deleteTargetId}/`);
      setItemList((prev) => prev.filter((i) => i.id !== deleteTargetId));
    } catch (err) {
      console.error(err);
      setError("Failed to delete item.");
    }
  };

  const toggleItemActive = async (item) => {
    if (!stock?.id) {
      alert("Stock ID missing, cannot activate/deactivate item.");
      return;
    }

    setTogglingItems((prev) => new Set(prev).add(item.id));
    setError(null);

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const hotelSlug = user?.hotel_slug;
      if (!hotelSlug) throw new Error("Missing hotel info");

      const action = item.active_stock_item ? "deactivate" : "activate";
      const data =
        action === "activate" ? { stock_id: stock.id, quantity: 0 } : {};

      await api.post(
        `/stock_tracker/${hotelSlug}/items/${item.id}/${action}/`,
        data
      );

      const newActiveState = !item.active_stock_item;

      setItemList((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, active_stock_item: newActiveState } : i
        )
      );

      onToggleActive?.(item.id, newActiveState);
    } catch (err) {
      console.error("Failed to toggle active state:", err);
      setError("Failed to toggle item active status.");
    } finally {
      setTogglingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

   return (
    <div className="container-fluid p-4 main-bg text-white rounded shadow-sm mt-4">
<h2 className="fw-bold text-center text-white mb-4">
  Stock Settings
</h2>

  {/* Add/Edit Form */}
  {showForm && (
    <form onSubmit={handleSubmit} className="mb-4 bg-secondary p-3 rounded">
      <div className="row g-3">
        <div className="col-sm-6 col-md-4">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="form-control"
            placeholder="Item Name"
            required
          />
        </div>
        <div className="col-sm-6 col-md-4">
          <input
            type="text"
            name="sku"
            value={formData.sku}
            onChange={handleChange}
            className="form-control"
            placeholder="SKU (optional)"
          />
        </div>
        <div className="col-sm-6 col-md-2">
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            className="form-control"
            placeholder="Quantity"
            min={0}
            required
          />
        </div>
        <div className="col-sm-6 col-md-2">
          <input
            type="number"
            name="alert_quantity"
            value={formData.alert_quantity}
            onChange={handleChange}
            className="form-control"
            placeholder="Alert Quantity"
            min={0}
          />
        </div>
        <div className="col-sm-6 col-md-4">
          <input
            type="number"
            name="volume_per_unit"
            value={formData.volume_per_unit}
            onChange={handleChange}
            className="form-control"
            placeholder="Volume per Unit"
            min={0}
            step="any"
          />
        </div>
        <div className="col-sm-6 col-md-4">
          <select
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            className="form-select"
          >
            <option value="">Select Unit</option>
            <option value="ml">ml</option>
            <option value="l">l</option>
          </select>
        </div>
        <div className="col-sm-6 col-md-4">
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="form-select"
          >
            <option value="">Select Type</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 d-flex gap-2 flex-wrap">
        <button className="btn btn-success" disabled={submitting}>
          {submitting ? (editingItem ? "Saving..." : "Adding...") : editingItem ? "Save Changes" : "Add Item"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setShowForm(false);
            setEditingItem(null);
            setFormData({ name: "", sku: "", quantity: 0, alert_quantity: 0, volume_per_unit: "", unit: "", type: "" });
          }}
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-danger mt-2">{error}</p>}
    </form>
  )}

  {!showForm && (
    <button className="btn custom-button mb-4" onClick={() => setShowForm(true)}>
      Add New Item
    </button>
  )}

  {/* Table for large screens */}
  <div className="d-none d-lg-block">
    {itemList.length === 0 ? (
      <p className="text-white">No items yet.</p>
    ) : (
      <table className="table table-dark table-striped table-hover">
        <thead>
          <tr>
            <th>Name</th>
            <th>Qty</th>
            <th>Volume</th>
            <th className="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {itemList.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.quantity}</td>
              <td>{item.volume_per_unit} {item.unit}</td>
              <td className="d-flex gap-1 justify-content-end align-items-center">
  {/* Edit */}
  <button
    className="btn btn-outline-warning btn-sm p-1"
    onClick={() => handleEdit(item)}
    title="Edit"
  >
    <i className="bi bi-pencil-fill"></i>
  </button>

  {/* Delete */}
  <button
    className="btn btn-outline-danger btn-sm p-1"
    onClick={() => { setDeleteTargetId(item.id); setShowDeleteModal(true); }}
    title="Delete"
  >
    <i className="bi bi-trash-fill"></i>
  </button>

  {/* Toggle Active */}
  <button
    className={`btn btn-sm p-1 ${item.active_stock_item ? "btn-outline-success" : "btn-outline-secondary"}`}
    disabled={togglingItems.has(item.id)}
    onClick={() => toggleItemActive(item)}
    title={item.active_stock_item ? "Deactivate" : "Activate"}
  >
    {togglingItems.has(item.id) ? (
      <i className="bi bi-hourglass-split"></i>
    ) : item.active_stock_item ? (
      <i className="bi bi-check-lg"></i>
    ) : (
      <i className="bi bi-x-lg"></i>
    )}
  </button>
</td>

            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>

  {/* Card layout for small screens */}
  <div className="d-lg-none row g-3">
    {itemList.map((item) => (
      <div key={item.id} className="col-12">
        <div className="card bg-secondary text-white shadow-sm h-100">
          <div className="card-body d-flex flex-column justify-content-between">
            <div>
              <h5 className="card-title">{item.name}</h5>
              <p className="mb-1">Qty: {item.quantity} pcs</p>
              <p className="mb-1">
                Vol: {item.volume_per_unit} {item.unit}
              </p>
            </div>
            <div className="d-flex gap-1 flex-wrap mt-2">
              <button className="btn btn-warning btn-sm" onClick={() => handleEdit(item)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => { setDeleteTargetId(item.id); setShowDeleteModal(true); }}>Delete</button>
              <button
                className={`btn btn-sm ${item.active_stock_item ? "btn-success" : "btn-outline-light"}`}
                disabled={togglingItems.has(item.id)}
                onClick={() => toggleItemActive(item)}
              >
                {togglingItems.has(item.id) ? "Processing..." : item.active_stock_item ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>

  {/* Pagination */}
  {totalItems > pageSize && (
    <div className="mt-4 d-flex justify-content-center align-items-center gap-2">
      <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
      <span>Page {page} of {Math.ceil(totalItems / pageSize)}</span>
      <button className="btn btn-sm btn-secondary" disabled={page >= Math.ceil(totalItems / pageSize)} onClick={() => setPage(p => p + 1)}>Next</button>
    </div>
  )}

  <DeletionModal
    show={showDeleteModal}
    title="Confirm Deletion"
    onClose={() => setShowDeleteModal(false)}
    onConfirm={handleDelete}
  >
    Are you sure you want to delete this item?
  </DeletionModal>
</div>

  );
};

export default StockSettings;