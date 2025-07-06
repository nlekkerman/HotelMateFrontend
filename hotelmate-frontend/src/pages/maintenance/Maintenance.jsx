import React, { useEffect, useState } from "react";
import api from "@/services/api"; // Adjust this path to match your axios instance

export default function Maintenance() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location_note: "",
    status: "open",
    images: [],
  });
  const [previews, setPreviews] = useState([]);

  const fetchRequests = async () => {
    try {
      const res = await api.get("/maintenance/requests/");
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setRequests(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const newFiles = Array.from(e.target.files);
    const updatedFiles = [...form.images, ...newFiles];

    setForm((prev) => ({ ...prev, images: updatedFiles }));
    setPreviews((prev) => [
      ...prev,
      ...newFiles.map((file) => URL.createObjectURL(file)),
    ]);

    console.log("Files selected:", updatedFiles, "Count:", updatedFiles.length);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    console.log("Form submission started");

    try {
      const { images, ...rest } = form;
      console.log("Sending request data:", rest);

      const res = await api.post("/maintenance/requests/", rest);
      const requestId = res.data.id;
      console.log("Request created:", res.data);

      if (images.length > 0) {
        const imgData = new FormData();
        imgData.append("request", requestId);
        images.forEach((file) => imgData.append("images", file));

        const imgRes = await api.post("/maintenance/photos/", imgData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        console.log("Uploaded images:", imgRes.data);
      }

      setForm({
        title: "",
        description: "",
        location_note: "",
        status: "open",
        images: [],
      });
      setPreviews([]);
      fetchRequests();
    } catch (err) {
      console.error("Create error:", err);
      if (err.response) {
        console.error("Error response:", err.response.data);
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/maintenance/requests/${id}/`);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/maintenance/requests/${id}/`, { status });
      fetchRequests();
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  return (
    <div className="container my-4">
      <h2>Maintenance Requests</h2>

      <form onSubmit={handleCreate} className="mb-4">
        <input
          type="text"
          name="title"
          placeholder="Title"
          value={form.title}
          onChange={handleChange}
          className="form-control mb-2"
          required
        />
        <input
          type="text"
          name="location_note"
          placeholder="Location (optional)"
          value={form.location_note}
          onChange={handleChange}
          className="form-control mb-2"
        />
        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          className="form-control mb-2"
        />
        <input
          type="file"
          name="images"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          className="form-control mb-2"
        />
        {previews.length > 0 && (
          <div className="mb-2">
            {previews.map((src, i) => (
              <img
                key={i}
                src={src}
                alt="preview"
                style={{
                  maxWidth: "100px",
                  marginRight: "10px",
                  borderRadius: "4px",
                }}
              />
            ))}
          </div>
        )}
        <button type="submit" className="btn btn-success">
          Submit
        </button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : requests.length === 0 ? (
        <p>No maintenance requests yet.</p>
      ) : (
        <ul className="list-group">
          {requests.map((r) => (
            <li key={r.id} className="list-group-item">
              <div className="d-flex justify-content-between">
                <div>
                  <strong>{r.title}</strong>{" "}
                  <em className="ms-2">({r.status})</em>
                  <p className="mb-0">{r.description}</p>
                  {r.photos?.length > 0 && (
                    <div className="mt-2">
                      {r.photos.map((photo) => (
                        <img
                          key={photo.id}
                          src={photo.image}
                          alt="Maintenance"
                          style={{
                            maxWidth: "100px",
                            marginRight: "10px",
                            borderRadius: "4px",
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <select
                    className="form-select form-select-sm mt-2"
                    value={r.status}
                    onChange={(e) => handleStatusChange(r.id, e.target.value)}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <button
                  className="btn btn-sm btn-danger ms-2"
                  onClick={() => handleDelete(r.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
