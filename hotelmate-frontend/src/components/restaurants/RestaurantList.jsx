import React from "react";

const RestaurantList = ({ restaurants, selectedRestaurant, onSelect }) => {
  return (
    <div>
      <h3>Restaurants</h3>
      <ul className="list-group">
        {restaurants.map((r) => (
          <li
            key={r.id}
            className={`list-group-item ${selectedRestaurant?.id === r.id ? "active" : ""}`}
            onClick={() => onSelect(r)}
            style={{ cursor: "pointer" }}
          >
            {r.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RestaurantList;
