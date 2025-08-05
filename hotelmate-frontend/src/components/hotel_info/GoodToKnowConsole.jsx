import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";
import GoodToKnowEntryModal from "@/components/modals/GoodToKnowEntryModal";
import { useGoodToKnowPdfExporter } from "@/hooks/useGoodToKnowPdfExporter"; // import your PDF hook

export default function GoodToKnowConsole() {
  const { hotel_slug } = useParams();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState(null); // null for create

  // Import the PDF exporter function
  const { generateGoodToKnowPdf } = useGoodToKnowPdfExporter();

  // Fetch GoodToKnow entries
  const fetchEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/hotel_info/good_to_know/${hotel_slug}/`, {
        params: { page },
      });
      setEntries(res.data.results || []);
      setPageCount(Math.ceil(res.data.count / (res.data.results?.length || 1)));
    } catch {
      setError("Failed to load Good To Know entries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hotel_slug) fetchEntries();
  }, [hotel_slug, page]);

  // Handlers
  const openCreateModal = () => {
    setEditingSlug(null);
    setModalOpen(true);
  };

  const openEditModal = (slug) => {
    setEditingSlug(slug);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  const handleSaved = () => {
    fetchEntries();
  };

  // New handler to export PDF
  const handleExportPdf = () => {
    if (entries.length === 0) {
      alert("No entries to export.");
      return;
    }
    generateGoodToKnowPdf(entries);
  };

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

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="container py-4">
      <h2>Good To Know Console — {hotel_slug}</h2>
      <div className="mb-3 d-flex gap-2">
        <button className="btn btn-success" onClick={openCreateModal}>
          + Add New Entry
        </button>
        <button className="btn btn-outline-primary" onClick={handleExportPdf}>
          📥 Download All QR Codes PDF
        </button>
      </div>

      {entries.length === 0 ? (
        <p>No Good To Know entries found.</p>
      ) : (
       <div className="bg-light">
  <table className="table table-striped table-bordered w-100" style={{ tableLayout: "fixed", width: "100%" }}>
    <thead>
      <tr>
        <th style={{ width: "25%", padding:0, textAlign:"center" }}>Title</th>
        <th style={{ width: "20%", padding:0, textAlign:"center"  }}>Created</th>
        <th style={{ width: "25%", padding:0, textAlign:"center"  }}>QR Code</th>
        <th style={{ width: "20%",padding:0, textAlign:"center"  }}>Actions</th>
      </tr>
    </thead>
    <tbody>
  {entries.map((entry) => (
    <tr key={entry.id || entry.slug || `${entry.title}-${entry.created_at}`}>
      <td>{entry.title}</td>
      <td>{new Date(entry.created_at).toLocaleDateString()}</td>
      <td style={{ display: "flex", justifyContent: "center" }}>
        {entry.qr_url ? (
          <img
            src={entry.qr_url}
            alt="QR Code"
            style={{ height: 60, maxWidth: "100%" }}
          />
        ) : (
          "No QR"
        )}
      </td>
      <td>
        <button
          className="btn btn-sm btn-primary me-2"
          onClick={() => openEditModal(entry.slug)}
        >
          Edit
        </button>
      </td>
    </tr>
  ))}
</tbody>

  </table>
</div>

      )}

      {/* Pagination Controls */}
      {pageCount > 1 && (
        <nav aria-label="Page navigation">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </button>
            </li>
            {[...Array(pageCount)].map((_, idx) => (
              <li
                key={`page-${idx + 1}`}
                className={`page-item ${page === idx + 1 ? "active" : ""}`}
              >
                <button className="page-link" onClick={() => setPage(idx + 1)}>
                  {idx + 1}
                </button>
              </li>
            ))}
            <li className={`page-item ${page === pageCount ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => setPage(page + 1)}
                disabled={page === pageCount}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}

      {/* Modal for Create/Edit */}
      <GoodToKnowEntryModal
        show={modalOpen}
        onClose={handleModalClose}
        hotelSlug={hotel_slug}
        entrySlug={editingSlug}
        onSaved={handleSaved}
      />
    </div>
  );
}
