import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";

export default function GoodToKnow() {
  const { hotel_slug, slug } = useParams();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchEntry() {
      try {
        const response = await api.get(
          `/hotel_info/good_to_know/${hotel_slug}/${slug}/`
        );
        setEntry(response.data);
      } catch {
        setError("Failed to load information.");
      } finally {
        setLoading(false);
      }
    }
    fetchEntry();
  }, [hotel_slug, slug]);

  if (loading)
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "50vh" }}
      >
        <div
          className="spinner-border text-primary"
          role="status"
          aria-label="Loading"
        >
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="container py-4">
        <div className="alert alert-danger text-center">{error}</div>
      </div>
    );

  if (!entry)
    return (
      <div className="container py-4">
        <div className="alert alert-warning text-center">
          No information found.
        </div>
      </div>
    );

  return (
    <div className="container py-4">
      <div className="card shadow-sm p-4">
  <h1 className="card-title d-flex align-items-center gap-2" style={{ fontSize: '1.8rem' }}>
    <span role="img" aria-label="wonder">✨</span>
    {entry.title}
  </h1>
  <p className="card-text">{entry.content}</p>
</div>
    </div>
  );
}
