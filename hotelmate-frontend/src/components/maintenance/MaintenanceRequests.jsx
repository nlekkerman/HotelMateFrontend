import React, { useEffect, useState } from "react";
import { FaTrash, FaPaperPlane, FaComments } from "react-icons/fa";
import api from "@/services/api";
import DeletionModal from "@/components/modals/DeletionModal";
import { useCan } from "@/rbac";

// Map status → badge color
const STATUS_COLORS = {
  open: "primary",
  in_progress: "warning",
  resolved: "success",
  closed: "secondary",
};

export default function MaintenanceRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentByRequest, setCommentByRequest] = useState({});
  const [modalRequestId, setModalRequestId] = useState(null);

  // Phase 1 RBAC: backend-driven action authority via `user.rbac.maintenance.actions.<key>`.
  const { can, canAny } = useCan();
  const canRequestUpdate = can('maintenance', 'request_update');
  const canRequestDelete = can('maintenance', 'request_delete');
  const canCommentCreate = can('maintenance', 'comment_create');
  // Show the status selector if the user can perform any transition or a
  // generic update. Per-option visibility below maps each status value to its
  // specific backend action key. Backend remains the final authority on
  // forbidden transitions.
  const canChangeStatus = canAny('maintenance', [
    'request_update',
    'request_accept',
    'request_resolve',
    'request_reopen',
    'request_close',
  ]);

  // Map a target status value to the action key required to transition to it.
  const STATUS_ACTION = {
    open: 'request_reopen',
    in_progress: 'request_accept',
    resolved: 'request_resolve',
    closed: 'request_close',
  };
  const canTransitionTo = (status) => {
    if (canRequestUpdate) return true;
    const actionKey = STATUS_ACTION[status];
    if (!actionKey) return false;
    return can('maintenance', actionKey);
  };

  // Fetch list
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get("/maintenance/requests/");
      const data = Array.isArray(res.data)
        ? res.data
        : res.data.results || [];
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

  // Update status
  const handleStatusChange = async (id, status) => {
    await api.patch(`/maintenance/requests/${id}/`, { status });
    fetchRequests();
  };

  // Comments
  const handleCommentChange = (reqId, text) => {
    setCommentByRequest((p) => ({ ...p, [reqId]: text }));
  };
  const submitComment = async (reqId) => {
    const msg = (commentByRequest[reqId] || "").trim();
    if (!msg) return;
    await api.post("/maintenance/comments/", { request: reqId, message: msg });
    setCommentByRequest((p) => ({ ...p, [reqId]: "" }));
    fetchRequests();
  };

  // Delete
  const handleDelete = async (id) => {
    await api.delete(`/maintenance/requests/${id}/`);
    setRequests((p) => p.filter((r) => r.id !== id));
  };

  if (loading) {
    return <p className="text-center py-5">Loading…</p>;
  }
  if (!requests.length) {
    return <p className="text-center py-5">No maintenance requests yet.</p>;
  }

  return (
    <div className="row g-4">
      {requests.map((r) => (
        <div key={r.id} className="col-12 col-md-6 col-lg-4">
          <div className="card h-100 shadow-sm position-relative">
            {/* Delete button */}
            {canRequestDelete && (
              <button
                className="btn btn-sm text-danger position-absolute top-0 end-0 m-2"
                onClick={() => setModalRequestId(r.id)}
                title="Delete request"
              >
                <FaTrash />
              </button>
            )}

            <div className="card-body d-flex flex-column">
              {/* Title & Status */}
              <div className="d-flex align-items-center flex-column">
<h5 className="card-title mb-0 flex-shrink-1 text-break">
    {r.title}
  </h5>                <span
                  className={`badge bg-${
                    STATUS_COLORS[r.status] || "secondary"
                  } text-capitalize`}
                >
                  {r.status.replace("_", " ")}
                </span>
              </div>

              {r.accepted_by && (
                <p className="text-muted small border-top mb-0 mt-2 p-2 text-center bg-light">
                  Accepted by:{" "}
                  <strong>
                    {r.accepted_by.first_name}{" "}
                    {r.accepted_by.last_name}
                  </strong>
                </p>
              )}

              {/* Description */}
              <p className="card-text text-truncate mb-3 border-top">
                {r.description}
              </p>

              {/* Photos */}
              {r.photos?.length > 0 && (
                <div className="d-flex flex-wrap mb-3 justify-content-center">
                  {r.photos.map((p) => (
                    <img
                      key={p.id}
                      src={p.image}
                      alt=""
                      className="me-2 mb-2 rounded border"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: "contain",
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Status selector */}
              {canChangeStatus ? (
                <select
                  className="form-select form-select-sm mb-3"
                  value={r.status}
                  onChange={(e) =>
                    handleStatusChange(r.id, e.target.value)
                  }
                >
                  {/* Always render the current status so the select reflects
                      reality, even if the user cannot transition back to it. */}
                  {(['open', 'in_progress', 'resolved', 'closed']).map((s) => {
                    const allowed = s === r.status || canTransitionTo(s);
                    if (!allowed) return null;
                    const label = {
                      open: 'Open',
                      in_progress: 'In Progress',
                      resolved: 'Resolved',
                      closed: 'Closed',
                    }[s];
                    return (
                      <option key={s} value={s}>{label}</option>
                    );
                  })}
                </select>
              ) : (
                <div className="mb-3">
                  <span className={`badge bg-${STATUS_COLORS[r.status] || 'secondary'} text-capitalize`}>
                    {r.status.replace('_', ' ')}
                  </span>
                </div>
              )}

              {/* Comments */}
              <div className="mt-auto">
                <div className="d-flex align-items-center mb-2">
                  <FaComments className="me-1 text-secondary" />
                  <h6 className="mb-0">Comments</h6>
                </div>
                <div
                  className="mb-2 small"
                  style={{ maxHeight: 100, overflowY: "auto" }}
                >
                  {r.comments.length > 0 ? (
                    r.comments.map((c) => (
                      <div key={c.id} className="mb-1">
                        <em className="fw-semibold">
                          {c.staff?.first_name} {c.staff?.last_name}:
                        </em>{" "}
                        {c.message}
                      </div>
                    ))
                  ) : (
                    <div className="text-muted">No comments yet</div>
                  )}
                </div>
                {/* Comment input */}
                {canCommentCreate && (
                  <div className="input-group input-group-sm">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Write a comment…"
                      value={commentByRequest[r.id] || ""}
                      onChange={(e) =>
                        handleCommentChange(r.id, e.target.value)
                      }
                    />
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => submitComment(r.id)}
                      title="Submit comment"
                    >
                      <FaPaperPlane />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Deletion confirmation */}
          <DeletionModal
            show={modalRequestId === r.id}
            title="Delete Maintenance Request?"
            onClose={() => setModalRequestId(null)}
            onConfirm={() => {
              handleDelete(r.id);
              setModalRequestId(null);
            }}
          >
            <p>
              Are you sure you want to delete <strong>{r.title}</strong>?
            </p>
          </DeletionModal>
        </div>
      ))}
    </div>
  );
}
