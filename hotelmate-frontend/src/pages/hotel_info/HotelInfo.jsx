import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import HotelInfoCreateForm from "@/components/hotel_info/HotelInfoCreateForm";

export default function HotelInfo() {
  // Pull hotel_slug and optional category directly from the URL params
  const { hotel_slug, category } = useParams();
  const hotelSlug = hotel_slug;
  const activeCategory = category; // undefined if not provided

  const { user } = useAuth();
  const navigate = useNavigate();

  // State for categories list
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [errorCategories, setErrorCategories] = useState(null);

  // State for selected category data
  const [categoryData, setCategoryData] = useState(null);
  const [loadingCategoryData, setLoadingCategoryData] = useState(false);
  const [errorCategoryData, setErrorCategoryData] = useState(null);

  // State for QR code URL
  const [categoryQr, setCategoryQr] = useState(null);

  // State to toggle create form
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Load the list of categories for this hotel
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await api.get(`/hotel_info/categories/`, {
          params: { infos__hotel__slug: hotelSlug },
        });
        setCategories(res.data.results || []);
      } catch (err) {
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

  // Load data and QR for the active category (if any)
  useEffect(() => {
    if (!activeCategory) {
      setCategoryData(null);
      setCategoryQr(null);
      return;
    }

    async function fetchData() {
      setLoadingCategoryData(true);
      setErrorCategoryData(null);

      try {
        // 1. Fetch the info items
        const infoRes = await api.get(`/hotel_info/hotelinfo/`, {
          params: { hotel__slug: hotelSlug, category__slug: activeCategory },
        });
        const items = Array.isArray(infoRes.data)
          ? infoRes.data
          : Array.isArray(infoRes.data.results)
          ? infoRes.data.results
          : [];
        setCategoryData(items);

        // 2. Only authenticated users fetch the QR code URL
        if (user) {
          const qrRes = await api.get(`/hotel_info/category_qr/`, {
            params: { hotel_slug: hotelSlug, category_slug: activeCategory },
          });
          setCategoryQr(qrRes.data.qr_url || null);
        }
      } catch (err) {
        setErrorCategoryData("Failed to load category data.");
        setCategoryData(null);
        setCategoryQr(null);
      } finally {
        setLoadingCategoryData(false);
      }
    }

    fetchData();
  }, [activeCategory, hotelSlug, user]);

  if (loadingCategories) return <p>Loading categories…</p>;
  if (errorCategories) return <p className="text-danger">{errorCategories}</p>;

  // Helper to get full image URLs
  const getFullImageUrl = (path) => {
    if (!path) return null;
    return path.startsWith("http")
      ? path
      : `https://res.cloudinary.com/dg0ssec7u/${path}`;
  };

  return (
    <div className="my-4">
      {/* Category buttons + Create toggle */}
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

      {/* Category data display */}
      {!showCreateForm && (
        <>
          {loadingCategoryData && <p>Loading category data…</p>}
          {errorCategoryData && (
            <p className="text-danger">{errorCategoryData}</p>
          )}

          {activeCategory && categoryData && (
            <div>
              <h3>
                {categories.find((c) => c.slug === activeCategory)?.name ||
                  activeCategory.replace(/[_-]/g, " ")}
              </h3>

              {/* Category image */}
              {categories.find((c) => c.slug === activeCategory)?.image && (
                <div className="mb-3">
                  <img
                    src={
                      categories.find((c) => c.slug === activeCategory).image
                    }
                    alt={activeCategory}
                    style={{ maxWidth: 300, marginBottom: 16 }}
                  />
                </div>
              )}

              {/* QR code: only for logged-in users */}
              {user ? (
                categoryQr ? (
                  <div className="mb-3">
                    <h5>Category QR Code:</h5>
                    <img
                      src={categoryQr}
                      alt="Category QR code"
                      style={{ maxWidth: 150 }}
                    />
                  </div>
                ) : (
                  <p>No QR code available for this category.</p>
                )
              ) : (
                <p className="text-muted">
                  <a href="/login">Log in</a> to view the QR code.
                </p>
              )}

              {/* List of info items */}
              {categoryData.length === 0 ? (
                <p>No data found for this category.</p>
              ) : (
                <ul className="list-group">
                  {categoryData.map((item) => (
                    <li key={item.id} className="list-group-item">
                      <h5>{item.title}</h5>
                      <p>{item.description}</p>
                      <p>
                        {item.event_date} {item.event_time}
                      </p>
                      {item.image && (
                        <img
                          src={getFullImageUrl(item.image)}
                          alt={item.title}
                          style={{ maxWidth: 200, marginTop: 8 }}
                        />
                      )}
                      {(item.info_qr || item.info_qr_kids) && (
                        <img
                          src={item.info_qr || item.info_qr_kids}
                          alt="Info QR"
                          style={{ maxWidth: 120, marginTop: 8 }}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
