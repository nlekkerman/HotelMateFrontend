import React, { useState, useEffect } from "react";
import api from "@/services/api";

export default function HotelInfoCreateForm({ hotelSlug, onSuccess }) {
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [selectedCategorySlug, setSelectedCategorySlug] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/hotel_info/categories/");
        setCategories(res.data.results || []);
      } catch (err) {
        setError("Failed to load categories.");
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Helper to slugify category name for new category creation
  const slugify = (text) =>
    text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-") + "-info";

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError(null);
  setLoading(true);

  try {
    let categorySlug = selectedCategorySlug;

    // Create new category if needed
    if (newCategoryName.trim()) {
      const newSlug = slugify(newCategoryName);
      await api.post("/hotel_info/categories/", {
        name: newCategoryName.trim(),
        slug: newSlug,
      });
      categorySlug = newSlug;
    }

    if (!categorySlug) {
      setError("Please select or create a category.");
      setLoading(false);
      return;
    }

    // Build form data
    const formData = new FormData();
    formData.append("hotel_slug", hotelSlug);
    formData.append(
      "category_name",
      newCategoryName.trim() || categories.find((c) => c.slug === categorySlug)?.name || ""
    );
    formData.append("title", title);
    formData.append("description", description);
    formData.append("active", true);

    if (imageFile) {
      formData.append("image", imageFile);
    }

    // Use axios or your api client to send multipart/form-data
    await api.post("/hotel_info/hotelinfo/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (onSuccess) onSuccess();
    setTitle("");
    setDescription("");
    setSelectedCategorySlug("");
    setNewCategoryName("");
    setImageFile(null);
  } catch (err) {
    setError("Failed to create hotel info.");
  } finally {
    setLoading(false);
  }
};


  return (
    <form onSubmit={handleSubmit} className="border p-3 rounded">
      <h4>Create Hotel Info</h4>

      <div className="mb-3">
        <label className="form-label">Select Existing Category</label>
        <select
          className="form-select"
          value={selectedCategorySlug}
          onChange={(e) => {
            setSelectedCategorySlug(e.target.value);
            setNewCategoryName("");
          }}
          disabled={loading}
        >
          <option value="">-- Select category --</option>
          {categories.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="form-label">Or Create New Category</label>
        <input
          type="text"
          className="form-control"
          placeholder="New category name"
          value={newCategoryName}
          onChange={(e) => {
            setNewCategoryName(e.target.value);
            if (e.target.value.trim()) setSelectedCategorySlug("");
          }}
          disabled={loading}
        />
        <small className="form-text text-muted">
          New category slug will be auto-generated with '-info' suffix.
        </small>
      </div>

      <div className="mb-3">
        <label className="form-label">Title</label>
        <input
          required
          type="text"
          className="form-control"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Description</label>
        <textarea
          required
          className="form-control"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Upload Image</label>
        <input
          type="file"
          accept="image/*"
          className="form-control"
          onChange={(e) => setImageFile(e.target.files[0])}
          disabled={loading}
        />
      </div>
      {error && <p className="text-danger">{error}</p>}

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "Saving…" : "Create Info"}
      </button>
    </form>
  );
}
