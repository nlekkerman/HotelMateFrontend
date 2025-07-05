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
    hotel: user.hotel_id, // ✅ always include this
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
    <div className="p-4 border rounded-md mt-4">
      <h2 className="text-lg font-semibold text-white mb-4">Stock Settings</h2>

      {!showForm ? (
        <button
          className="btn btn-primary mb-4"
          onClick={() => setShowForm(true)}
        >
          Add New Item
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="mb-3">
            <input
              type="text"
              name="name"
              placeholder="Item Name"
              value={formData.name}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              name="sku"
              placeholder="SKU (optional)"
              value={formData.sku}
              onChange={handleChange}
              className="form-control"
            />
          </div>
          <div className="mb-3">
            <input
              type="number"
              name="quantity"
              placeholder="Quantity"
              value={formData.quantity}
              onChange={handleChange}
              className="form-control"
              required
              min={0}
            />
          </div>
          <div className="mb-3">
            <input
              type="number"
              name="volume_per_unit"
              placeholder="Volume per unit"
              value={formData.volume_per_unit}
              onChange={handleChange}
              className="form-control"
              min={0}
              step="any"
            />
          </div>

          <div className="mb-3">
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

          <div className="mb-3">
            <input
              type="number"
              name="alert_quantity"
              placeholder="Alert Quantity"
              value={formData.alert_quantity}
              onChange={handleChange}
              className="form-control"
              min={0}
            />
          </div>

          <div className="d-flex gap-2">
          

            <button
  type="submit"
  className="btn btn-success"
  disabled={submitting}
>
  {submitting
    ? editingItem
      ? "Saving..."
      : "Adding..."
    : editingItem
    ? "Save Changes"
    : "Add Stock Item"}
</button>

            
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowForm(false);
                setEditingItem(null); // Reset edit state
                setFormData({
                  name: "",
                  sku: "",
                  quantity: 0,
                  alert_quantity: 0,
                  volume_per_unit: "",
                  unit: "",
                });
              }}
            >
              Cancel
            </button>
          </div>

          {error && <p className="text-danger mt-2">{error}</p>}
        </form>
      )}

      <div className="mt-6 p-0">
        <h3 className="text-md font-medium text-white mb-2">
          Current Stock Items
        </h3>

        {itemList.length === 0 ? (
          <p className="text-gray-500">No items yet.</p>
        ) : (
          <>
            <ol className="space-y-2 p-0 d-flex flex-column">
              {itemList.map((item) => (
                <li
                  key={item.id}
                  className="border rounded p-2 d-flex flex-column flex-sm-row justify-content-between align-items-center mb-2 bg-white shadow-sm"
                >
                  <span className="sm-border-bottom w-100 ">
                    {item.name}{" "}
                    <span className="text-sm  text-dark ml-2">
                      {item.volume_per_unit} {item.unit}
                    </span>{" "}
                  </span>

                  <span className="text-dark border p-1 rounded mt-2 mt-sm-0">
                    <strong>{item.quantity}</strong> pcs
                  </span>

                  <div className="d-flex gap-2 mt-2 mt-sm-0">
                   <button
  className="btn btn-warning btn-sm"
  onClick={() => handleEdit(item)} // ✅ Here, 'item' is defined in map()
>
  Edit
</button>

                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        setDeleteTargetId(item.id);
                        setShowDeleteModal(true);
                      }}
                    >
                      Delete
                    </button>

                    <button
                      disabled={togglingItems.has(item.id)}
                      onClick={() => toggleItemActive(item)}
                      className={`btn btn-sm ${
                        item.active_stock_item
                          ? "btn-success"
                          : "btn-outline-secondary"
                      }`}
                    >
                      {togglingItems.has(item.id)
                        ? "Processing..."
                        : item.active_stock_item
                        ? "Deactivate"
                        : "Activate"}
                    </button>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-4 d-flex justify-content-center align-items-center">
              <button
                className="btn btn-sm me-2"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </button>
              <span className="text-sm">
                Page {page} of {Math.ceil(totalItems / pageSize)}
              </span>
              <button
                className="btn btn-sm ms-2"
                disabled={page >= Math.ceil(totalItems / pageSize)}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
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
