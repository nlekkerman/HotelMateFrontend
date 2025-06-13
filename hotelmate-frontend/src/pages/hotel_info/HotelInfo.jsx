import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import HotelInfoCreateForm from "@/components/hotel_info/HotelInfoCreateForm";

export default function HotelInfo() {
  const { hotel_slug, category } = useParams();
  const hotelSlug = hotel_slug;
  const activeCategory = category;
  const { user } = useAuth();
  const navigate = useNavigate();

  // State variables
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [errorCategories, setErrorCategories] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [loadingCategoryData, setLoadingCategoryData] = useState(false);
  const [errorCategoryData, setErrorCategoryData] = useState(null);
  const [categoryQr, setCategoryQr] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await api.get(`/hotel_info/categories/`, {
          params: { infos__hotel__slug: hotelSlug },
        });
        setCategories(res.data.results || []);
      } catch {
        setErrorCategories("Failed to load categories.");
      } finally {
        setLoadingCategories(false);
      }
    }
    if (!hotelSlug) {
      setErrorCategories("No hotel selected.");
      setLoadingCategories(false);
    } else {
      fetchCategories();
    }
  }, [hotelSlug]);

  // Fetch category data + QR
  useEffect(() => {
    if (!activeCategory) {
      setCategoryData([]);
      setCategoryQr(null);
      return;
    }
    async function fetchData() {
      setLoadingCategoryData(true);
      setErrorCategoryData(null);
      try {
        const infoRes = await api.get(`/hotel_info/hotelinfo/`, {
          params: { hotel__slug: hotelSlug, category__slug: activeCategory },
        });
        const items = Array.isArray(infoRes.data)
          ? infoRes.data
          : Array.isArray(infoRes.data.results)
          ? infoRes.data.results
          : [];
        setCategoryData(items);
        if (user) {
          const qrRes = await api.get(`/hotel_info/category_qr/`, {
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
    }
    fetchData();
  }, [activeCategory, hotelSlug, user]);

  // Compute grouped events
  const sections = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Helper: build a map of date → items
    const itemsByDate = categoryData.reduce((map, item) => {
      map[item.event_date] = map[item.event_date] || [];
      map[item.event_date].push(item);
      return map;
    }, {});

    // Sort each date’s items by datetime
    Object.values(itemsByDate).forEach((arr) =>
      arr.sort(
        (a, b) =>
          new Date(`${a.event_date}T${a.event_time || "00:00"}`) -
          new Date(`${b.event_date}T${b.event_time || "00:00"}`)
      )
    );

    // Build the first two labels
    const sections = [
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
    sections[1].items = itemsByDate[sections[1].date] || [];

    // Next 10 days
    for (let i = 2; i < 12; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
      });
      sections.push({
        label,
        date: iso,
        items: itemsByDate[iso] || [],
      });
    }

    // Only keep days that actually have events
    return sections.filter((sec) => sec.items.length > 0);
  }, [categoryData]);

  // Early returns
  if (loadingCategories) return <p>Loading categories…</p>;
  if (errorCategories) return <p className="text-danger">{errorCategories}</p>;

  const CLOUD_BASE = "https://res.cloudinary.com/dg0ssec7u/image/upload";
  // Helper URL builder – guards against null paths
  const getFullImageUrl = (path) => {
    if (!path) return null; // nothing to show
    return path.startsWith("http")
      ? path // absolute URL from API
      : `https://res.cloudinary.com/dg0ssec7u/${path}`; // your Cloudinary base
  };

  return (
    <div className="my-4">
      {/* Category selector + create toggle (authenticated only) */}
      {user && (
        <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
          {categories.map((cat) => (
            <button
              key={cat.slug}
              className={`btn ${
                cat.slug === activeCategory
                  ? "btn-primary"
                  : "btn-outline-primary"
              }`}
              onClick={() => {
                setShowCreateForm(false);
                navigate(`/hotel_info/${hotelSlug}/${cat.slug}`);
              }}
            >
              {cat.name}
            </button>
          ))}
          <button
            className="btn btn-success ms-auto"
            onClick={() => setShowCreateForm((v) => !v)}
          >
            {showCreateForm ? "Cancel" : "Create Info"}
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreateForm && <HotelInfoCreateForm hotelSlug={hotelSlug} />}

      {/* Event listings */}
      {!showCreateForm && (
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
                  {/* 👉 Show the QR code for this category */}
    {categoryQr && (
      <div className="mb-4 text-center">
        <img
          src={categoryQr}
          alt={`QR for ${activeCategory}`}
          className="img-fluid img-thumbnail"
          style={{ maxWidth: '200px' }}
        />
      </div>
    )}
              {sections.map(({ label, items, date }) => {
                // determine border color
                const borderClass =
                  label === "Today"
                    ? "bg-success bg-opacity-10"
                    : label === "Tomorrow"
                    ? "bg-info bg-opacity-10"
                    : "bg-secondary bg-opacity-10";

                // determine header background
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
                    {/* Section Header */}
                    <div className={`p-3 text-white ${headerBg}`}>
                      <h4 className="mb-0">{label}</h4>
                    </div>

                    {/* Section Body */}
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
