import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import api from "@/services/api";
import HotelInfoCreateForm from "@/components/hotel_info/HotelInfoCreateForm";
import HotelInfoModal from "@/components/modals/HotelInfoModal.jsx";
import CreateCategoryForm from "@/components/hotel_info/CreateCategoryForm";
import HotelInfoEditModal from "@/components/hotel_info/modals/HotelInfoEditModal";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import SuccessModal from "@/components/modals/SuccessModal";

export default function HotelInfo() {
  const { hotel_slug, category } = useParams();
  const hotelSlug = hotel_slug;
  const activeCategory = category;
  const { user } = useAuth();
  const { mainColor } = useTheme();
  const navigate = useNavigate();

  // ── State ─────────────────────────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [errorCategories, setErrorCategories] = useState(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  // const [showGenerateQr, setShowGenerateQr] = useState(false); // <-- REMOVE THIS

  const [categoryData, setCategoryData] = useState([]);
  const [loadingCategoryData, setLoadingCategoryData] = useState(false);
  const [errorCategoryData, setErrorCategoryData] = useState(null);

  const [categoryQr, setCategoryQr] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const CLOUD_BASE = import.meta.env.VITE_CLOUDINARY_BASE;
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // QR Download modals
  const [showQRConfirmModal, setShowQRConfirmModal] = useState(false);
  const [showQRSuccessModal, setShowQRSuccessModal] = useState(false);

  // ── 1) Fetch categories ────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    setErrorCategories(null);
    try {
      const res = await api.get(`/staff/hotel/${hotelSlug}/hotel_info/categories/`);
      setCategories(res.data.results || []);
    } catch {
      setErrorCategories("Failed to load categories.");
    } finally {
      setLoadingCategories(false);
    }
  }, [hotelSlug]);

  // ── 2) Fetch category data & QR ───────────────────────────────────
  const fetchCategoryData = useCallback(async () => {
    if (!activeCategory) {
      setCategoryData([]);
      setCategoryQr(null);
      return;
    }
    setLoadingCategoryData(true);
    setErrorCategoryData(null);

    try {
      const infoRes = await api.get(`/staff/hotel/${hotelSlug}/hotel_info/hotelinfo/`, {
        params: { category__slug: activeCategory },
      });
      const items = Array.isArray(infoRes.data)
        ? infoRes.data
        : Array.isArray(infoRes.data.results)
        ? infoRes.data.results
        : [];
      setCategoryData(items);

      if (user) {
        const qrRes = await api.get("/hotel_info/category_qr/", {
          params: { hotel_slug: hotelSlug, category_slug: activeCategory },
        });
        setCategoryQr(qrRes.data.qr_url || null);
      } else {
        setCategoryQr(null);
      }
    } catch {
      setErrorCategoryData("Failed to load category data.");
      setCategoryData([]);
      setCategoryQr(null);
    } finally {
      setLoadingCategoryData(false);
    }
  }, [activeCategory, hotelSlug, user]);

  // ── 3) Pre-check & generate QR before navigating ───────────────────
  const handleCategoryClick = useCallback(
    async (cat) => {
      setShowCreateForm(false);

      try {
        // Try fetching existing QR
        await api.get("/hotel_info/category_qr/", {
          params: { hotel_slug: hotelSlug, category_slug: cat.slug },
        });
        // If it exists, navigate right away
        navigate(`/hotel_info/${hotelSlug}/${cat.slug}`);
      } catch (err) {
        if (err.response?.status === 404) {
          // Not found: ask the user
          const ok = window.confirm(
            `There’s no QR for “${cat.name}” yet. Generate it now?`
          );
          if (!ok) return;

          // User agreed: generate new QR
          const genRes = await api.post("/hotel_info/category_qr/", {
            hotel_slug: hotelSlug,
            category_slug: cat.slug,
          });
          setCategoryQr(genRes.data.qr_url);

          // Then navigate
          navigate(`/hotel_info/${hotelSlug}/${cat.slug}`);
        } else {
          setErrorCategoryData("Failed to check QR code.");
        }
      }
    },
    [hotelSlug, navigate]
  );

  // ── Effects ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hotelSlug) {
      setErrorCategories("No hotel selected.");
      setLoadingCategories(false);
      return;
    }
    fetchCategories();
  }, [hotelSlug, fetchCategories]);

  useEffect(() => {
    fetchCategoryData();
  }, [fetchCategoryData]);

  // ── Listen to Quick Actions events ─────────────────────────────────
  useEffect(() => {
    const handleOpenCreateCategory = () => {
      setShowCreateCategory((prev) => !prev);
      // Always close Create Info when toggling Create Category
      setShowCreateForm(false);
    };
    
    const handleOpenCreateInfo = () => {
      setShowCreateForm((prev) => !prev);
      // Always close Create Category when toggling Create Info
      setShowCreateCategory(false);
    };
    
    const handleDownloadAllQRs = () => {
      // Show confirmation modal
      setShowQRConfirmModal(true);
    };

    window.addEventListener('openCreateCategory', handleOpenCreateCategory);
    window.addEventListener('openCreateInfo', handleOpenCreateInfo);
    window.addEventListener('downloadAllQRs', handleDownloadAllQRs);

    return () => {
      window.removeEventListener('openCreateCategory', handleOpenCreateCategory);
      window.removeEventListener('openCreateInfo', handleOpenCreateInfo);
      window.removeEventListener('downloadAllQRs', handleDownloadAllQRs);
    };
  }, []);

  // ── Group events into date‐sections ────────────────────────────────
  const sections = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const itemsByDate = categoryData.reduce((map, item) => {
      map[item.event_date] = map[item.event_date] || [];
      map[item.event_date].push(item);
      return map;
    }, {});

    Object.values(itemsByDate).forEach((arr) =>
      arr.sort(
        (a, b) =>
          new Date(`${a.event_date}T${a.event_time || "00:00"}`) -
          new Date(`${b.event_date}T${b.event_time || "00:00"}`)
      )
    );

    const base = [
      { label: "Today", date: todayStr, items: itemsByDate[todayStr] || [] },
      {
        label: "Tomorrow",
        date: (() => {
          const d = new Date(now);
          d.setDate(now.getDate() + 1);
          return d.toISOString().slice(0, 10);
        })(),
        items: [],
      },
    ];
    base[1].items = itemsByDate[base[1].date] || [];

    for (let i = 2; i < 12; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
      });
      base.push({ label, date: iso, items: itemsByDate[iso] || [] });
    }

    return base.filter((sec) => sec.items.length > 0);
  }, [categoryData]);

  // ── Early exits ────────────────────────────────────────────────────
  if (loadingCategories)
    return (
      <div className="loading">
        <div className="text-center">
          <div className="spinner-border text-dark mb-3" role="status" />
          <p>Loading Hotel info</p>
        </div>
      </div>
    );
  if (errorCategories) return <p className="text-danger">{errorCategories}</p>;

  const getFullImageUrl = (path) => {
    if (!path) return null;
    return path.startsWith("http") ? path : `${CLOUD_BASE}${path}`;
  };

  const downloadAllQrsWithText = async () => {
    try {
      const res = await api.get("/hotel_info/category_qr/download_all/", {
        params: { hotel_slug: hotelSlug },
      });

      for (const item of res.data) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = item.qr_url;

        img.onload = () => {
          const canvas = document.createElement("canvas");
          const size = 450;
          canvas.width = size;
          canvas.height = size + 40;

          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.drawImage(img, 0, 0, size, size);

          ctx.fillStyle = "black";
          ctx.font = "16px Arial";
          ctx.textAlign = "center";
          ctx.fillText(`${hotelSlug} - ${item.category}`, size / 2, size + 25);

          const link = document.createElement("a");
          link.href = canvas.toDataURL("image/png");
          link.download = `${item.category_slug}_qr.png`;
          link.click();
        };
      }
    } catch (err) {
    }
  };
  const openEditModal = (item) => {
    setEditingItem(item);
    setShowEditModal(true);
  };
  
  const handleQRDownloadConfirm = async () => {
    setShowQRConfirmModal(false);
    await downloadAllQrsWithText();
    setShowQRSuccessModal(true);
  };
  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="my-4 w-100">
      {/* CATEGORY + ACTIONS */}
      {user && !showCreateForm && (
        <>
          {/* Category Buttons */}
          <div className="container mb-4">
            <div className="row g-2 justify-content-center">
              {categories.map((cat) => (
                <div
                  key={cat.slug}
                  className="col-6 col-sm-4 col-md-3 col-lg-2"
                >
                  <button
                    className={`btn w-100 py-3 shadow-sm fw-semibold ${
                      cat.slug === activeCategory
                        ? "main-bg text-white"
                        : "main-bg-outline"
                    }`}
                    style={{ aspectRatio: "1 / 1", borderRadius: "10px" }}
                    onClick={() => handleCategoryClick(cat)}
                  >
                    {cat.name}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Quick Actions - Same style as desktop */}
          <div 
            className="d-lg-none position-fixed start-0 end-0"
            style={{
              top: "60px",
              zIndex: 1045,
              background: "transparent",
            }}
            >
              <div className="container-fluid contextual-actions-container">
                <div className="d-flex align-items-center justify-content-center gap-2 py-2 px-2 flex-wrap">
                  <button
                  className="contextual-action-btn"
                  onClick={() => {
                    setShowCreateCategory((prev) => !prev);
                    setShowCreateForm(false);
                  }}
                  style={{
                    color: mainColor || '#3498db',
                    boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}`,
                  }}
                >
                  <i className="bi bi-folder-plus" style={{ color: mainColor || '#3498db' }} />
                  <span className="action-label" style={{ color: mainColor || '#3498db' }}>Create Category</span>
                </button>
                <button
                  className="contextual-action-btn"
                  onClick={() => {
                    setShowCreateForm((prev) => !prev);
                    setShowCreateCategory(false);
                  }}
                  style={{
                    color: mainColor || '#3498db',
                    boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}`,
                  }}
                >
                  <i className="bi bi-file-earmark-plus" style={{ color: mainColor || '#3498db' }} />
                  <span className="action-label" style={{ color: mainColor || '#3498db' }}>Create Info</span>
                </button>
                <button
                  className="contextual-action-btn"
                  onClick={() => setShowQRConfirmModal(true)}
                  style={{
                    color: mainColor || '#3498db',
                    boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}`,
                  }}
                >
                  <i className="bi bi-qr-code" style={{ color: mainColor || '#3498db' }} />
                  <span className="action-label" style={{ color: mainColor || '#3498db' }}>Download QR</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showEditModal && editingItem && categories.length > 0 && (
        <HotelInfoEditModal
          initialData={{
            ...editingItem,
            category:
              editingItem.category_slug || // if you already have slug
              categories.find((cat) => cat.id === editingItem.category)?.slug ||
              editingItem.category, // fallback
          }}
          hotelSlug={hotelSlug}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            fetchCategoryData();
          }}
        />
      )}

      {/* MODALS */}
      {showCreateCategory && (
        <HotelInfoModal onClose={() => setShowCreateCategory(false)}>
          <CreateCategoryForm
            hotelSlug={hotelSlug}
            onSuccess={() => {
              setShowCreateCategory(false);
              fetchCategories();
            }}
            onClose={() => setShowCreateCategory(false)}
          />
        </HotelInfoModal>
      )}

      {/* QR Download Confirmation Modal */}
      {showQRConfirmModal && (
        <ConfirmationModal
          title="Download QR Codes"
          message="Are you sure you want to download all QR codes?"
          onConfirm={handleQRDownloadConfirm}
          onCancel={() => setShowQRConfirmModal(false)}
        />
      )}

      {/* QR Download Success Modal */}
      <SuccessModal
        show={showQRSuccessModal}
        message="QR codes downloaded successfully!"
        onClose={() => setShowQRSuccessModal(false)}
      />

      {/* FORM OR DISPLAY */}
      {showCreateForm ? (
        <HotelInfoCreateForm
          hotelSlug={hotelSlug}
          onSuccess={(newCategorySlug) => {
            setShowCreateForm(false);
            fetchCategories();
            fetchCategoryData();
            navigate(`/hotel_info/${hotelSlug}/${newCategorySlug}`);
          }}
        />
      ) : !showCreateCategory ? (
        <>
          {loadingCategoryData && (
            <p className="text-center">Loading category data…</p>
          )}
          {errorCategoryData && (
            <p className="text-danger text-center">{errorCategoryData}</p>
          )}

          {activeCategory && (
            <section className="container">
              <h3 className="mb-4 text-center">
                {categories.find((c) => c.slug === activeCategory)?.name ||
                  activeCategory}
              </h3>

              {categoryQr && (
                <div className="mb-4 text-center">
                  <img
                    src={categoryQr}
                    alt={`QR for ${activeCategory}`}
                    className="img-fluid img-thumbnail"
                    style={{ maxWidth: "200px" }}
                  />
                </div>
              )}

              {sections.map(({ label, items, date }) => {
                const borderClass =
                  label === "Today"
                    ? "bg-success bg-opacity-10"
                    : label === "Tomorrow"
                    ? "bg-info bg-opacity-10"
                    : "bg-secondary bg-opacity-10";

                const headerBg =
                  label === "Today"
                    ? "bg-success"
                    : label === "Tomorrow"
                    ? "bg-info"
                    : "bg-secondary";

                return (
                  <div
                    key={date}
                    className={`mb-5 rounded ${borderClass}`}
                    style={{ overflow: "hidden" }}
                  >
                    <div className={`p-3 text-white ${headerBg}`}>
                      <h4 className="mb-0">{label}</h4>
                    </div>
                    <div className="p-3">
                      {items.length === 0 ? (
                        <p className="text-muted mb-0">No events on {label}.</p>
                      ) : (
                        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
                          {items.map((item) => {
                            const img =
                              getFullImageUrl(item.image) ||
                              null;

                            // Helper function to format date dd/mm/yy
                            const formatDate = (dateStr) => {
                              if (!dateStr) return "";
                              const d = new Date(dateStr);
                              const day = String(d.getDate()).padStart(2, "0");
                              const month = String(d.getMonth() + 1).padStart(
                                2,
                                "0"
                              );
                              const year = String(d.getFullYear()).slice(-2);
                              return `${day}/${month}/${year}`;
                            };

                            // Helper function to format time hh:mm (24-hour)
                            const formatTime = (timeStr) => {
                              if (!timeStr) return "";
                              const t = new Date(`1970-01-01T${timeStr}`);
                              const hours = String(t.getHours()).padStart(
                                2,
                                "0"
                              );
                              const minutes = String(t.getMinutes()).padStart(
                                2,
                                "0"
                              );
                              return `${hours}:${minutes}`;
                            };

                            const eventDateFormatted = formatDate(
                              item.event_date
                            );
                            const eventTimeFormatted = formatTime(
                              item.event_time
                            );
                            const endTimeFormatted = formatTime(item.end_time);

                            return (
                              <div key={item.id} className="col">
                                <div className="card h-100 shadow-sm">
                                  <button
                                    className="btn btn-sm btn-outline-primary mt-2"
                                    onClick={() => openEditModal(item)}
                                  >
                                    Edit
                                  </button>
                                  <div className="card-header text-center bold main-bg text-white">
                                    {eventDateFormatted} @{" "}
                                    {eventTimeFormatted
                                      ? `${eventTimeFormatted}${
                                          endTimeFormatted
                                            ? ` - ${endTimeFormatted}`
                                            : ""
                                        }`
                                      : "TBA"}
                                  </div>
                                  {img ? (
                                    <img
                                      src={img}
                                      className="card-img-top"
                                      alt={item.title}
                                      style={{
                                        objectFit: "cover",
                                        height: "200px",
                                      }}
                                    />
                                  ) : (
                                    <div
                                      className="card-img-top"
                                      style={{
                                        height: "200px",
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      <i className="bi bi-calendar-event" style={{ fontSize: '3rem', color: 'white' }}></i>
                                    </div>
                                  )}
                                  <div className="card-body d-flex flex-column">
                                    <h5 className="card-title">{item.title}</h5>
                                    <p className="card-text flex-grow-1">
                                      {item.description}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
