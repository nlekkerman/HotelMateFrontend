import React, { useState, useEffect } from "react";
import { SketchPicker } from "react-color";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";

export default function ColorSelector() {
  const [mainColor, setMainColor] = useState("#3498db");
  const [secondaryColor, setSecondaryColor] = useState("#2ecc71");
  const [buttonColor, setButtonColor] = useState("#004faf");
  const [buttonTextColor, setButtonTextColor] = useState("#ffffff");
  const [buttonHoverColor, setButtonHoverColor] = useState("#0066cc");
  const [textColor, setTextColor] = useState("#333333");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [borderColor, setBorderColor] = useState("#e5e7eb");
  const [linkColor, setLinkColor] = useState("#007bff");
  const [linkHoverColor, setLinkHoverColor] = useState("#0056b3");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

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

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`staff/hotel/${hotel_slug}/settings/`);
        const {
          main_color,
          secondary_color,
          button_color,
          button_text_color,
          button_hover_color,
          text_color,
          background_color,
          border_color,
          link_color,
          link_hover_color,
        } = res.data;

        setMainColor(main_color);
        setSecondaryColor(secondary_color);
        setButtonColor(button_color);
        setButtonTextColor(button_text_color);
        setButtonHoverColor(button_hover_color);
        setTextColor(text_color);
        setBackgroundColor(background_color);
        setBorderColor(border_color);
        setLinkColor(link_color);
        setLinkHoverColor(link_hover_color);

        document.documentElement.style.setProperty("--main-color", main_color);
        document.documentElement.style.setProperty("--secondary-color", secondary_color);
        document.documentElement.style.setProperty("--button-color", button_color);
        document.documentElement.style.setProperty("--button-text-color", button_text_color);
        document.documentElement.style.setProperty("--button-hover-color", button_hover_color);
        document.documentElement.style.setProperty("--text-color", text_color);
        document.documentElement.style.setProperty("--background-color", background_color);
        document.documentElement.style.setProperty("--border-color", border_color);
        document.documentElement.style.setProperty("--link-color", link_color);
        document.documentElement.style.setProperty("--link-hover-color", link_hover_color);
      } catch (err) {
        console.error("Failed to load theme:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [hotel_slug]);
const isColorDark = (hexColor) => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  // Calculate luminance
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < 150; // adjust threshold as needed
};
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch(`staff/hotel/${hotel_slug}/settings/`, {
        main_color: mainColor,
        secondary_color: secondaryColor,
        button_color: buttonColor,
        button_text_color: buttonTextColor,
        button_hover_color: buttonHoverColor,
        text_color: textColor,
        background_color: backgroundColor,
        border_color: borderColor,
        link_color: linkColor,
        link_hover_color: linkHoverColor,
      });

      const {
        main_color,
        secondary_color,
        button_color,
        button_text_color,
        button_hover_color,
        text_color,
        background_color,
        border_color,
        link_color,
        link_hover_color,
      } = res.data;

      document.documentElement.style.setProperty("--main-color", main_color);
      document.documentElement.style.setProperty("--secondary-color", secondary_color);
      document.documentElement.style.setProperty("--button-color", button_color);
      document.documentElement.style.setProperty("--button-text-color", button_text_color);
      document.documentElement.style.setProperty("--button-hover-color", button_hover_color);
      document.documentElement.style.setProperty("--text-color", text_color);
      document.documentElement.style.setProperty("--background-color", background_color);
      document.documentElement.style.setProperty("--border-color", border_color);
      document.documentElement.style.setProperty("--link-color", link_color);
      document.documentElement.style.setProperty("--link-hover-color", link_hover_color);

      navigate("/");
      setTimeout(() => window.location.reload(), 100);
    } catch (err) {
      console.error("Failed to save theme:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading theme…</p>;

const renderPicker = (label, color, setColor) => {
  const textColor = isColorDark(color) ? "#ffffff" : "#000000";

  return (
    <div
      className="col-6 col-md-4 col-lg-3 mb-4 p-1 pb-0 px-1 rounded "
      style={{
        backgroundColor: color,
        transition: "background-color 0.3s ease",
      }}
    >
      <div
        className="rounded p-2 pb-1 h-100 d-flex flex-column align-items-center"
        style={{ backgroundColor: "transparent" }}
      >
        <div
          className="text-center mb-2"
          style={{ minHeight: "3rem", color: textColor }}
        >
          <strong>{label}</strong>
        </div>
        <div className="w-100 sketch-picker-wrapper">
          <SketchPicker
            color={color}
            onChangeComplete={(c) => setColor(c.hex)}
            disableAlpha
            width="100%"
          />
        </div>
      </div>
    </div>
  );
};




 return (
  <>
    <div className="d-flex justify-content-center">
      <div className="d-flex flex-wrap gap-4 justify-content-center" style={{ maxWidth: "1200px" }}>
        {renderPicker("Main Color", mainColor, setMainColor)}
        {renderPicker("Secondary Color", secondaryColor, setSecondaryColor)}
        {renderPicker("Button Color", buttonColor, setButtonColor)}
        {renderPicker("Button Text Color", buttonTextColor, setButtonTextColor)}
        {renderPicker("Button Hover Color", buttonHoverColor, setButtonHoverColor)}
        {renderPicker("Text Color", textColor, setTextColor)}
        {renderPicker("Background Color", backgroundColor, setBackgroundColor)}
        {renderPicker("Border Color", borderColor, setBorderColor)}
        {renderPicker("Link Color", linkColor, setLinkColor)}
        {renderPicker("Link Hover Color", linkHoverColor, setLinkHoverColor)}
      </div>
    </div>

    <div className="d-flex justify-content-center mt-4">
      <button
        className="btn custom-button px-4 py-2"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving…" : "Save Colors"}
      </button>
    </div>
  </>
);

}
