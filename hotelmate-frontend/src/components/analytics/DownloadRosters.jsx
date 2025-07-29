// src/components/analytics/DownloadRosters.jsx
import React, { useState } from "react";
import { format } from "date-fns";
import api from "@/services/api";
import RosterPeriodSelector from "@/components/attendance/RosterPeriodSelector";

function blobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export default function DownloadRosters({
  hotelSlug,
  department = "",
  defaultDate = new Date(),
}) {
  const [open, setOpen] = useState(false);

  // Daily
  const [dailyDate, setDailyDate] = useState(format(defaultDate, "yyyy-MM-dd"));

  // Weekly (period-based)
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  const handleDaily = async () => {
    try {
      const res = await api.get(`/attendance/${hotelSlug}/shifts/daily-pdf/`, {
        params: {
          hotel_slug: hotelSlug,
          date: dailyDate,
          department: department || undefined,
        },
        responseType: "blob",
      });
      blobDownload(res.data, `roster_${hotelSlug}_${dailyDate}.pdf`);
    } catch (e) {
      console.error("Daily PDF download failed", e);
      alert("Failed to download daily PDF");
    }
  };

  const handleWeekly = async () => {
    if (!selectedPeriod) {
      alert("Select or create a roster period first.");
      return;
    }
    try {
      const res = await api.get(
        `/attendance/${hotelSlug}/periods/${selectedPeriod}/export-pdf/`,
        {
          params: { department: department || undefined },
          responseType: "blob",
        }
      );
      blobDownload(
        res.data,
        `roster_${hotelSlug}_period_${selectedPeriod}.pdf`
      );
    } catch (e) {
      console.error("Weekly PDF download failed", e);
      alert("Failed to download weekly PDF");
    }
  };

  return (
    <div className="mb-4">
      <div className="card-body p-2 ">
        <button
          type="button"
          className="btn custom-button text-danger"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide downloads" : "Download rosters"}
        </button>

        {open && (
          <div className="mt-4 ">
            {/* DAILY */}
            <div className="border rounded p-3 mb-4 ">
              <h6 className="fw-bold mb-3">Daily PDF</h6>
              <div className="row g-2 align-items-end">
                <div className="col-md-3">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dailyDate}
                    onChange={(e) => setDailyDate(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label d-block">&nbsp;</label>
                  <button className="btn btn-primary" onClick={handleDaily}>
                    Download Daily PDF
                  </button>
                </div>
              </div>
            </div>

            {/* WEEKLY */}
            <div className="border rounded  p-1 align-items-md-center gap-3">
              <h6
                className="fw-bold mb-3 mb-md-0"
                style={{ minWidth: "150px" }}
              >
                Weekly PDF
              </h6>

              <div className="flex-grow-1">
                <RosterPeriodSelector
                  hotelSlug={hotelSlug}
                  selectedPeriod={selectedPeriod}
                  setSelectedPeriod={setSelectedPeriod}
                  onPeriodCreated={(p) => setSelectedPeriod(p.id)}
                />
              </div>

              <div>
                <button
                  className="btn btn-success mt-3 mt-md-0"
                  onClick={handleWeekly}
                  disabled={!selectedPeriod}
                >
                  Download Weekly PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
