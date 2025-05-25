import React from "react";
import Search from "@/components/utils/Search"; // your search component
import { useUI } from "@/context/UIContext";

const Reception = () => {
  const { visibility, toggleVisibility } = useUI();

  return (
    <div className="container py-5">
      <h1 className="mb-5 text-center fw-bold">🏨 HotelMate Reception</h1>

      <p className="text-center text-secondary mb-5 fs-5">
        Manage rooms and guests from the reception dashboard.
      </p>
      <div className="border rounded p-4 shadow-sm bg-white mb-5">
        <Search placeholder="Search rooms by number, status, etc." />
      </div>
    </div>
  );
};

export default Reception;
