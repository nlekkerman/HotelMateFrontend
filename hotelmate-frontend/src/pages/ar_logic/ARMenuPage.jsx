// src/pages/ARMenuPage.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";      // your axios instance
import ARScene from "@/components/ar_logic/ARScene";

export default function ARMenuPage() {
  const { hotel_slug, restaurant_slug } = useParams();
  const [instruction, setInstruction] = useState("Loading…");
  const [error, setError]           = useState(null);

  useEffect(() => {
    api
      .get("ar_navigation/ar-anchors/", {
        params: { hotel: hotel_slug, restaurant: restaurant_slug }
      })
      .then(res => {
        if (res.data.length > 0) {
          setInstruction(res.data[0].instruction);
        } else {
          setInstruction("Point your camera at the marker to see the menu.");
        }
      })
      .catch(() => setError("Failed to load AR instructions."));
  }, [hotel_slug, restaurant_slug]);

  if (error) return <div className="text-danger">{error}</div>;
  return <ARScene text={instruction} />;
}
