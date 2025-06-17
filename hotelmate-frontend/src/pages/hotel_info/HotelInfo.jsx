import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import HotelInfoCreateForm from "@/components/hotel_info/HotelInfoCreateForm";
import HotelInfoModal from "@/components/modals/HotelInfoModal.jsx";
import CreateCategoryForm from "@/components/hotel_info/CreateCategoryForm";
// import GenerateQrForm from "@/components/hotel_info/GenerateQrForm"; // <-- REMOVE THIS

export default function HotelInfo() {
  const { hotel_slug, category } = useParams();
  const hotelSlug = hotel_slug;
  const activeCategory = category;
  const { user } = useAuth();
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

  const CLOUD_BASE = "https://res.cloudinary.com/dg0ssec7u/";

  // ── 1) Fetch categories ────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    setErrorCategories(null);
    try {
      const res = await api.get("/hotel_info/categories/", {
        params: { infos__hotel__slug: hotelSlug },
      });
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
      const infoRes = await api.get("/hotel_info/hotelinfo/", {
        params: { hotel__slug: hotelSlug, category__slug: activeCategory },
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
  if (loadingCategories) return <p>Loading categories…</p>;
  if (errorCategories) return <p className="text-danger">{errorCategories}</p>;

  const getFullImageUrl = (path) => {
    if (!path) return null;
    return path.startsWith("http") ? path : `${CLOUD_BASE}${path}`;
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="my-4">
      {/* Category selector */}
      {user && !showCreateForm && (
        <>
          <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                className={`btn ${
                  cat.slug === activeCategory
                    ? "btn-primary"
                    : "btn-outline-primary"
                }`}
                onClick={() => handleCategoryClick(cat)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Action buttons in a separate row */}
          <div className="d-flex gap-2 mb-4">
            <button
              className="btn btn-secondary"
              onClick={() => setShowCreateCategory(true)}
            >
              Create Info Category
            </button>
            {/* <button
              className="btn btn-outline-dark"
              disabled={!activeCategory}
              onClick={() => setShowGenerateQr(true)}
            >
              Generate QR for Category
            </button> */}
            <button
              className="btn btn-success"
              onClick={() => setShowCreateForm(true)}
            >
              Create Info
            </button>
          </div>
        </>
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

      {/* The QR modal is now completely removed! */}

      {/* Create form or listings */}
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
      ) : (
        <>
          {loadingCategoryData && <p>Loading category data…</p>}
          {errorCategoryData && (
            <p className="text-danger">{errorCategoryData}</p>
          )}

          {activeCategory && (
            <section>
              <h3 className="mb-4">
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
                              "https://via.placeholder.com/400x250?text=No+Image";
                            return (
                              <div key={item.id} className="col">
                                <div className="card h-100 shadow-sm">
                                  <img
                                    src={img}
                                    className="card-img-top"
                                    alt={item.title}
                                    style={{
                                      objectFit: "cover",
                                      height: "200px",
                                    }}
                                  />
                                  <div className="card-body d-flex flex-column">
                                    <h5 className="card-title">{item.title}</h5>
                                    <p className="card-text flex-grow-1">
                                      {item.description}
                                    </p>
                                  </div>
                                  <div className="card-footer text-muted small">
                                    {item.event_date} @{" "}
                                    {item.event_time || "TBA"}
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
      )}
    </div>
  );
}
