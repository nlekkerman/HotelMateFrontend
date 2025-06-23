import { useState, useEffect } from "react";
import api from "@/services/api";

const StockSettings = ({ stock }) => {
  console.log("Stock prop received:", stock);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    quantity: 0,
    alert_quantity: 0,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [itemList, setItemList] = useState([]);
  const [togglingItems, setTogglingItems] = useState(new Set());

  useEffect(() => {
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
          params: { hotel_slug: hotelSlug },
        });

        setItemList(Array.isArray(response.data.results) ? response.data.results : []);
      } catch (err) {
        console.error("Failed to fetch stock items:", err);
        setError("Failed to load stock items.");
      } finally {
        setSubmitting(false);
      }
    };

    fetchItems();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

      const response = await api.post(`/stock_tracker/${hotelSlug}/items/`, {
        ...formData,
        hotel: hotelId,
      });

      const createdItem = response.data;
      if (!createdItem?.id) {
        throw new Error("Item creation did not return an ID");
      }

      setItemList((prev) => [...prev, createdItem]);
      setFormData({ name: "", sku: "", quantity: 0, alert_quantity: 0 });
    } catch (err) {
      console.error("Add item failed:", err);
      setError("Could not add stock item.");
    } finally {
      setSubmitting(false);
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
      const data = action === "activate" ? { stock_id: stock.id, quantity: 0 } : {};

      await api.post(`/stock_tracker/${hotelSlug}/items/${item.id}/${action}/`, data);

      setItemList((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, active_stock_item: !item.active_stock_item } : i
        )
      );
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
      <h2 className="text-lg font-semibold mb-4">Stock Settings</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          name="name"
          placeholder="Item Name"
          value={formData.name}
          onChange={handleChange}
          className="input input-bordered w-full"
          required
        />
        <input
          type="text"
          name="sku"
          placeholder="SKU (optional)"
          value={formData.sku}
          onChange={handleChange}
          className="input input-bordered w-full"
        />
        <input
          type="number"
          name="quantity"
          placeholder="Quantity"
          value={formData.quantity}
          onChange={handleChange}
          className="input input-bordered w-full"
          required
          min={0}
        />
        <input
          type="number"
          name="alert_quantity"
          placeholder="Alert Quantity"
          value={formData.alert_quantity}
          onChange={handleChange}
          className="input input-bordered w-full"
          min={0}
        />

        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting ? "Adding..." : "Add Stock Item"}
        </button>

        {error && <p className="text-red-500 mt-2">{error}</p>}
      </form>

      <div className="mt-6">
        <h3 className="text-md font-medium mb-2">Current Stock Items</h3>

        {itemList.length === 0 ? (
          <p className="text-gray-500">No items yet.</p>
        ) : (
          <ul className="space-y-2">
            {itemList.map((item) => (
              <li
                key={item.id}
                className="border rounded p-2 flex justify-between items-center"
              >
                <span>{item.name}</span>
                <span className="text-sm text-gray-500">
                  Qty: {item.quantity} | Alert: {item.alert_quantity}
                </span>
                <button
                  disabled={togglingItems.has(item.id)}
                  onClick={() => toggleItemActive(item)}
                  className={`btn btn-sm ms-4 ${
                    item.active_stock_item ? "btn-success" : "btn-outline-secondary"
                  }`}
                >
                  {togglingItems.has(item.id)
                    ? "Processing..."
                    : item.active_stock_item
                    ? "Deactivate"
                    : "Activate"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default StockSettings;
