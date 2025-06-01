import React from "react";

const ViewOrders = ({ orders }) => {
  if (!orders.length) return <p>No orders found.</p>;

  return (
    <div className="mt-6">
      <h3 className="text-xl font-bold mb-4">Your Breakfast Orders</h3>
      {orders.map((order) => (
        <div key={order.id} className="border p-4 rounded mb-4 shadow-sm">
          <p className="mb-2">
            <strong>Order ID:</strong> {order.id} <br />
            <strong>Delivery Time:</strong> {order.delivery_time || "Not specified"} <br />
            <strong>Ordered At:</strong>{" "}
            {new Date(order.created_at).toLocaleString()}
          </p>
          <p className="font-semibold">Items:</p>
          <ul className="ml-4 list-disc">
            {order.items.map((item) => (
              <li key={item.id}>
                {item.item?.name || "Unnamed item"} – Quantity: {item.quantity}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default ViewOrders;
