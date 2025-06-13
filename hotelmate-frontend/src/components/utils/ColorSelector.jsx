// src/components/utils/ColorSelector.jsx
import React, { useState, useEffect } from "react";
import { SketchPicker } from "react-color";
import { useParams } from "react-router-dom";
import api from "@/services/api";

export default function ColorSelector() {
  
  const [mainColor, setMainColor]           = useState("#3498db");
  const [secondaryColor, setSecondaryColor] = useState("#2ecc71");
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);

   // 1) Read hotel_slug from localStorage
  const getHotelSlug = () => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser).hotel_slug;
    } catch {
      return null;
    }
  };

   const hotel_slug = getHotelSlug();
  // 1) Load (or auto-create) this hotel's theme
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`common/${hotel_slug}/theme/`);
        const { main_color, secondary_color } = res.data;
        setMainColor(main_color);
        setSecondaryColor(secondary_color);
        document.documentElement.style.setProperty("--main-color", main_color);
        document.documentElement.style.setProperty("--secondary-color", secondary_color);
      } catch (err) {
        console.error("Failed to load theme:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [hotel_slug]);

  // 2) Save back to the server
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch(
        `common/${hotel_slug}/theme/`,
        { main_color: mainColor, secondary_color: secondaryColor }
      );
      const { main_color, secondary_color } = res.data;
      document.documentElement.style.setProperty("--main-color", main_color);
      document.documentElement.style.setProperty("--secondary-color", secondary_color);
    } catch (err) {
      console.error("Failed to save theme:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading theme…</p>;

  return (
    <>
      <div className="mb-4">
        <h5>Main Color</h5>
        <SketchPicker
          color={mainColor}
          onChangeComplete={(c) => setMainColor(c.hex)}
          disableAlpha
        />
      </div>
      <div className="mb-4">
        <h5>Secondary Color</h5>
        <SketchPicker
          color={secondaryColor}
          onChangeComplete={(c) => setSecondaryColor(c.hex)}
          disableAlpha
        />
      </div>
      <button
        className="btn btn-primary"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving…" : "Save Colors"}
      </button>
    </>
  );
}
