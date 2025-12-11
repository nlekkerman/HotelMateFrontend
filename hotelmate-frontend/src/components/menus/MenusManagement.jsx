import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "react-toastify";
import api, { buildStaffURL } from "@/services/api";
import './MenusManagement.css';

const cloudinaryBase = import.meta.env.VITE_CLOUDINARY_BASE || "";



// Helper function to build proper image URLs
function buildImageUrl(img) {
  if (!img || typeof img !== "string") return null;
  if (img.startsWith("data:")) return img;
  
  // If it's already a proper Cloudinary URL, use it directly
  if (/^https?:\/\/res\.cloudinary\.com/.test(img)) return img;
  
  // If it's a full HTTP/HTTPS URL but not Cloudinary, use it as-is
  if (/^https?:\/\//.test(img)) {
    // Check if it's a malformed URL with double encoding
    const cloudinaryMatch = img.match(/https%3A\/(.*\.jpg|.*\.png|.*\.jpeg|.*\.webp)/i);
    if (cloudinaryMatch) {
      // Extract and decode the Cloudinary URL
      return decodeURIComponent('https:/' + cloudinaryMatch[1]);
    }
    return img;
  }
  
  // Use cloudinary base if available
  return cloudinaryBase ? `${cloudinaryBase}${img}` : img;
}

export default function MenusManagement() {
  const { user } = useAuth();
  const { mainColor } = useTheme();
  const hotelSlug = user?.hotel_slug;
  
  const [activeMenu, setActiveMenu] = useState(null); // 'room_service' or 'breakfast'
  const [roomServiceItems, setRoomServiceItems] = useState([]);
  const [breakfastItems, setBreakfastItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [allRoomServiceItems, setAllRoomServiceItems] = useState([]);
  const [allBreakfastItems, setAllBreakfastItems] = useState([]);
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    is_on_stock: true,
    quantity: 1 // For breakfast items only
  });
  
  // Image upload state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch ALL Room Service menu items using pagination
  const fetchRoomServiceMenu = async () => {
    if (!hotelSlug) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let allItems = [];
      let url = buildStaffURL(hotelSlug, '', 'room-service-items/');
      
      // Fetch all pages
      while (url) {
        console.log('🔍 Fetching room service items from:', url);
        const response = await api.get(url.replace(api.defaults.baseURL, ''));
        console.log('📦 Room service API response:', response.data);
        
        const pageData = response.data.results || response.data || [];
        allItems = [...allItems, ...pageData];
        
        // Get next page URL
        url = response.data.next;
      }
      
      console.log('✅ Setting ALL room service items:', allItems);
      setAllRoomServiceItems(allItems);
      setRoomServiceItems(allItems);
    } catch (err) {
      console.error("Failed to fetch room service menu:", err);
      setError("Failed to load room service menu");
      // Fallback to guest endpoint if staff endpoint not available
      try {
        const fallbackResponse = await api.get(`/room_services/${hotelSlug}/room/1/menu/`);
        const fallbackData = fallbackResponse.data.results || fallbackResponse.data || [];
        setRoomServiceItems(Array.isArray(fallbackData) ? fallbackData : []);
        setError(null);
      } catch (fallbackErr) {
        console.error("Fallback also failed:", fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch ALL Breakfast menu items using pagination
  const fetchBreakfastMenu = async () => {
    if (!hotelSlug) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let allItems = [];
      let url = buildStaffURL(hotelSlug, '', 'breakfast-items/');
      
      // Fetch all pages
      while (url) {
        console.log('🔍 Fetching breakfast items from:', url);
        const response = await api.get(url.replace(api.defaults.baseURL, ''));
        console.log('📦 Breakfast API response:', response.data);
        
        const pageData = response.data.results || response.data || [];
        allItems = [...allItems, ...pageData];
        
        // Get next page URL
        url = response.data.next;
      }
      
      console.log('✅ Setting ALL breakfast items:', allItems);
      setAllBreakfastItems(allItems);
      setBreakfastItems(allItems);
    } catch (err) {
      console.error("Failed to fetch breakfast menu:", err);
      setError("Failed to load breakfast menu");
      // Fallback to guest endpoint if staff endpoint not available
      try {
        const fallbackResponse = await api.get(`room_services/${hotelSlug}/room/1/breakfast/`);
        const fallbackData = fallbackResponse.data.results || fallbackResponse.data || [];
        setBreakfastItems(Array.isArray(fallbackData) ? fallbackData : []);
        setError(null);
      } catch (fallbackErr) {
        console.error("Fallback also failed:", fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle menu type selection
  const handleMenuSelect = (menuType) => {
    setActiveMenu(menuType);
    setSelectedCategory('all');
    if (menuType === 'room_service') {
      fetchRoomServiceMenu();
    } else if (menuType === 'breakfast') {
      fetchBreakfastMenu();
    }
  };

  // Filter items by category
  const filterItemsByCategory = (items, category) => {
    if (category === 'all') return items;
    return items.filter(item => item.category === category);
  };

  // Handle category filter change
  const handleCategoryFilter = (category) => {
    setSelectedCategory(category);
    if (activeMenu === 'room_service') {
      const filtered = filterItemsByCategory(allRoomServiceItems, category);
      setRoomServiceItems(filtered);
    } else if (activeMenu === 'breakfast') {
      const filtered = filterItemsByCategory(allBreakfastItems, category);
      setBreakfastItems(filtered);
    }
  };

  // Handle edit item
  const handleEditItem = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      price: item.price || '',
      description: item.description || '',
      category: item.category || '',
      is_on_stock: item.is_on_stock ?? true,
      quantity: item.quantity || 1
    });
    setImageFile(null);
    setImagePreview(buildImageUrl(item.image));
    setShowEditModal(true);
  };

  // Category options based on menu type
  const getCategoryOptions = (menuType) => {
    if (menuType === 'room_service') {
      return [
        { value: 'Starters', label: 'Starters' },
        { value: 'Mains', label: 'Mains' },
        { value: 'Desserts', label: 'Desserts' },
        { value: 'Drinks', label: 'Drinks' },
        { value: 'Others', label: 'Others' }
      ];
    } else {
      return [
        { value: 'Mains', label: 'Mains' },
        { value: 'Hot Buffet', label: 'Hot Buffet' },
        { value: 'Cold Buffet', label: 'Cold Buffet' },
        { value: 'Breads', label: 'Breads' },
        { value: 'Condiments', label: 'Condiments' },
        { value: 'Drinks', label: 'Drinks' }
      ];
    }
  };

  // Handle modal open
  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      price: '',
      description: '',
      category: activeMenu === 'room_service' ? 'Others' : 'Mains',
      is_on_stock: true,
      quantity: 1
    });
    setImageFile(null);
    setImagePreview(null);
    setUploadingImage(false);
    setShowCreateModal(true);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Remove selected image
  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
  };

  // Handle update item
  const handleUpdateItem = async (e) => {
    e.preventDefault();
    
    if (!editingItem) return;
    
    if (!formData.name || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (activeMenu === 'room_service' && !formData.price) {
      toast.error('Price is required for room service items');
      return;
    }

    setModalLoading(true);
    
    try {
      const endpoint = activeMenu === 'room_service' 
        ? buildStaffURL(hotelSlug, '', `room-service-items/${editingItem.id}/`)
        : buildStaffURL(hotelSlug, '', `breakfast-items/${editingItem.id}/`);

      // Prepare FormData for multipart upload
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('is_on_stock', formData.is_on_stock);

      if (activeMenu === 'room_service') {
        formDataToSend.append('price', parseFloat(formData.price));
      } else {
        formDataToSend.append('quantity', parseInt(formData.quantity));
      }

      // Add image if selected
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      }

      const response = await api.patch(endpoint, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.status === 200) {
        console.log('✅ Item updated successfully:', response.data);
        toast.success(`${formData.name} updated successfully!`);
        setShowEditModal(false);
        setEditingItem(null);
        
        // Refresh the menu items
        console.log('🔄 Refreshing menu items for:', activeMenu);
        if (activeMenu === 'room_service') {
          fetchRoomServiceMenu();
        } else {
          fetchBreakfastMenu();
        }
      }
    } catch (err) {
      console.error('Failed to update menu item:', err);
      toast.error('Failed to update menu item');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle delete item
  const handleDeleteItem = async () => {
    if (!editingItem) return;
    
    if (!confirm(`Are you sure you want to delete "${editingItem.name}"? This action cannot be undone.`)) {
      return;
    }

    setModalLoading(true);
    
    try {
      const endpoint = activeMenu === 'room_service' 
        ? buildStaffURL(hotelSlug, '', `room-service-items/${editingItem.id}/`)
        : buildStaffURL(hotelSlug, '', `breakfast-items/${editingItem.id}/`);

      const response = await api.delete(endpoint);
      
      if (response.status === 204 || response.status === 200) {
        console.log('✅ Item deleted successfully');
        toast.success(`${editingItem.name} deleted successfully!`);
        setShowEditModal(false);
        setEditingItem(null);
        
        // Refresh the menu items
        console.log('🔄 Refreshing menu items for:', activeMenu);
        if (activeMenu === 'room_service') {
          fetchRoomServiceMenu();
        } else {
          fetchBreakfastMenu();
        }
      }
    } catch (err) {
      console.error('Failed to delete menu item:', err);
      toast.error('Failed to delete menu item');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle form submission (for create)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (activeMenu === 'room_service' && !formData.price) {
      toast.error('Price is required for room service items');
      return;
    }

    setModalLoading(true);
    
    try {
      const endpoint = activeMenu === 'room_service' 
        ? buildStaffURL(hotelSlug, '', 'room-service-items/')
        : buildStaffURL(hotelSlug, '', 'breakfast-items/');

      // Prepare FormData for multipart upload
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('is_on_stock', formData.is_on_stock);

      if (activeMenu === 'room_service') {
        formDataToSend.append('price', parseFloat(formData.price));
      } else {
        formDataToSend.append('quantity', parseInt(formData.quantity));
      }

      // Add image if selected
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      }

      const response = await api.post(endpoint, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.status === 201) {
        console.log('✅ Item created successfully:', response.data);
        toast.success(`${formData.name} created successfully!`);
        setShowCreateModal(false);
        
        // Refresh the menu items
        console.log('🔄 Refreshing menu items for:', activeMenu);
        if (activeMenu === 'room_service') {
          fetchRoomServiceMenu();
        } else {
          fetchBreakfastMenu();
        }
      }
    } catch (err) {
      console.error('Failed to create menu item:', err);
      toast.error('Failed to create menu item');
    } finally {
      setModalLoading(false);
    }
  };

  // Render menu items
  const renderMenuItems = (items) => {
    console.log('🎨 Rendering menu items:', items);
    // Ensure items is an array
    if (!Array.isArray(items) || items.length === 0) {
      return (
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          {!Array.isArray(items) ? 'Error loading menu items.' : 'No menu items found.'}
        </div>
      );
    }

    return (
      <div className="row">
        {items.map((item) => (
          <div key={item.id} className="col-12 col-md-6 col-lg-4 mb-4">
            <div className="card h-100 shadow-sm overflow-hidden menus-card">
              {/* Enhanced Image Container */}
              <div className="position-relative menus-image-container">
                {buildImageUrl(item.image) ? (
                  <div className="w-100 h-100 position-relative overflow-hidden">
                    <img 
                      src={buildImageUrl(item.image)} 
                      alt={item.name}
                      className="menus-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentNode.nextSibling.style.display = 'flex';
                      }}
                    />
                    {/* Image overlay with gradient */}
                    <div className="position-absolute bottom-0 start-0 end-0 menus-image-overlay"></div>
                    {/* Stock status badge on image */}
                    <div className="position-absolute top-0 end-0 m-2">
                      <span className={`badge ${item.is_on_stock ? 'bg-success' : 'bg-danger'} fs-6 px-2 py-1 menus-stock-badge`}>
                        {item.is_on_stock ? (
                          <>
                            <i className="bi bi-check-circle me-1"></i>
                            In Stock
                          </>
                        ) : (
                          <>
                            <i className="bi bi-x-circle me-1"></i>
                            Out of Stock
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="d-flex flex-column align-items-center justify-content-center position-relative menus-no-image-container"
                    style={{ display: item.image ? 'none' : 'flex' }}
                  >
                    <div className="text-center">
                      <i className="bi bi-image text-muted mb-2 menus-no-image-icon"></i>
                      <p className="text-muted small mb-0">No Image</p>
                    </div>
                    {/* Stock status badge for no-image items */}
                    <div className="position-absolute top-0 end-0 m-2">
                      <span className={`badge ${item.is_on_stock ? 'bg-success' : 'bg-danger'} fs-6 px-2 py-1 menus-stock-badge`}>
                        {item.is_on_stock ? (
                          <>
                            <i className="bi bi-check-circle me-1"></i>
                            In Stock
                          </>
                        ) : (
                          <>
                            <i className="bi bi-x-circle me-1"></i>
                            Out of Stock
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="card-body">
                <div className="mb-3">
                  <h5 className="card-title mb-1 fw-bold">{item.name}</h5>
                  {item.category && (
                    <small className="menus-category-badge">
                      <i className="bi bi-tag me-1"></i>
                      {item.category}
                    </small>
                  )}
                </div>
                
                {item.description && (
                  <p className="card-text text-muted">{item.description}</p>
                )}
                
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="d-flex flex-column">
                    {item.price && (
                      <span className="h4 mb-0 fw-bold menus-price-text">
                        <i className="bi bi-currency-euro me-1"></i>
                        {Number(item.price).toFixed(2)}
                      </span>
                    )}
                    {item.quantity && (
                      <span className="h5 mb-0 text-info fw-medium">
                        <i className="bi bi-box me-1"></i>
                        Qty: {item.quantity}
                      </span>
                    )}
                  </div>
                  
                  <div className="btn-group" role="group">
                    <button 
                      className="btn btn-outline-primary btn-sm"
                      title="Edit Item"
                      onClick={() => handleEditItem(item)}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button 
                      className={`btn btn-sm ${item.is_on_stock ? 'btn-outline-warning' : 'btn-outline-success'}`}
                      title={item.is_on_stock ? 'Mark Out of Stock' : 'Mark In Stock'}
                    >
                      <i className={`bi ${item.is_on_stock ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container my-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="mb-1">
            <i className="bi bi-menu-button-wide me-2" style={{ color: mainColor || '#3498db' }}></i>
            Menus Management
          </h1>
          <p className="text-muted mb-0">Manage your hotel's food and beverage menus</p>
        </div>
      </div>

      {/* Menu Type Selection */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="d-flex justify-content-center gap-4">
            {/* Room Service Button */}
            <button
              className={`btn btn-lg px-5 py-3 ${
                activeMenu === 'room_service' 
                  ? 'btn-primary' 
                  : 'btn-outline-primary'
              }`}
              onClick={() => handleMenuSelect('room_service')}
              style={{
                borderColor: mainColor || '#3498db',
                ...(activeMenu === 'room_service' 
                  ? { backgroundColor: mainColor || '#3498db', borderColor: mainColor || '#3498db' }
                  : { color: mainColor || '#3498db' }
                )
              }}
            >
              <i className="bi bi-box me-2 fs-4"></i>
              <div>
                <div className="fw-bold">Room Service</div>
                <small className="d-block opacity-75">Main dining menu</small>
              </div>
            </button>

            {/* Breakfast Button */}
            <button
              className={`btn btn-lg px-5 py-3 ${
                activeMenu === 'breakfast' 
                  ? 'btn-primary' 
                  : 'btn-outline-primary'
              }`}
              onClick={() => handleMenuSelect('breakfast')}
              style={{
                borderColor: mainColor || '#3498db',
                ...(activeMenu === 'breakfast' 
                  ? { backgroundColor: mainColor || '#3498db', borderColor: mainColor || '#3498db' }
                  : { color: mainColor || '#3498db' }
                )
              }}
            >
              <i className="bi bi-egg-fried me-2 fs-4"></i>
              <div>
                <div className="fw-bold">Breakfast</div>
                <small className="d-block opacity-75">Morning menu</small>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {activeMenu && (
        <div>
          {/* Menu Header */}
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div className="d-flex align-items-center">
              <div 
                className="rounded-circle p-2 me-3"
                style={{ backgroundColor: `${mainColor || '#3498db'}20` }}
              >
                <i 
                  className={`bi ${activeMenu === 'room_service' ? 'bi-box' : 'bi-egg-fried'} fs-5`}
                  style={{ color: mainColor || '#3498db' }}
                ></i>
              </div>
              <div>
                <h3 className="mb-0">
                  {activeMenu === 'room_service' ? 'Room Service Menu' : 'Breakfast Menu'}
                </h3>
                <p className="text-muted mb-0">
                  {activeMenu === 'room_service' 
                    ? 'Manage main dining menu items' 
                    : 'Manage breakfast menu items'
                  }
                </p>
              </div>
            </div>
            
            <button 
              className="btn btn-primary"
              onClick={handleOpenCreateModal}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Add New Item
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Loading menu items...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="alert alert-danger">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
              <button 
                className="btn btn-sm btn-outline-danger ms-2"
                onClick={() => handleMenuSelect(activeMenu)}
              >
                Retry
              </button>
            </div>
          )}

          {/* Category Filter Buttons */}
          {!loading && !error && activeMenu && (
            <div className="mb-4">
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <span className="fw-bold me-2">Filter by Category:</span>
                <button 
                  className={`btn btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleCategoryFilter('all')}
                >
                  All ({activeMenu === 'room_service' ? allRoomServiceItems.length : allBreakfastItems.length})
                </button>
                {getCategoryOptions(activeMenu).map(cat => {
                  const count = activeMenu === 'room_service' 
                    ? allRoomServiceItems.filter(item => item.category === cat.value).length
                    : allBreakfastItems.filter(item => item.category === cat.value).length;
                  return (
                    <button 
                      key={cat.value}
                      className={`btn btn-sm ${selectedCategory === cat.value ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleCategoryFilter(cat.value)}
                    >
                      {cat.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Menu Items */}
          {!loading && !error && (
            <>
              {activeMenu === 'room_service' && renderMenuItems(roomServiceItems)}
              {activeMenu === 'breakfast' && renderMenuItems(breakfastItems)}
            </>
          )}
        </div>
      )}

      {/* Initial State */}
      {!activeMenu && (
        <div className="text-center py-5">
          <div 
            className="rounded-circle p-4 mx-auto mb-4 menus-hero-icon"
            style={{ backgroundColor: `${mainColor || '#3498db'}10` }}
          >
            <i 
              className="bi bi-menu-button-wide fs-1"
              style={{ color: mainColor || '#3498db' }}
            ></i>
          </div>
          <h3>Select a Menu to Manage</h3>
          <p className="text-muted">
            Choose between Room Service or Breakfast menus to view and manage items
          </p>
        </div>
      )}

      {/* Create Item Modal */}
      {showCreateModal && (
        <div className="modal fade show" style={{ display: 'block', zIndex: 1055 }}>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={() => setShowCreateModal(false)}></div>
          <div className="modal-dialog modal-lg" style={{ zIndex: 1060 }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`bi ${activeMenu === 'room_service' ? 'bi-box' : 'bi-egg-fried'} me-2`}></i>
                  Add New {activeMenu === 'room_service' ? 'Room Service' : 'Breakfast'} Item
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowCreateModal(false)}
                ></button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    {/* Item Name */}
                    <div className="col-12">
                      <label htmlFor="name" className="form-label">
                        Item Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter item name"
                        maxLength={255}
                        required
                      />
                    </div>

                    {/* Price (Room Service Only) */}
                    {activeMenu === 'room_service' && (
                      <div className="col-md-6">
                        <label htmlFor="price" className="form-label">
                          Price (€) <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          id="price"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                    )}

                    {/* Quantity (Breakfast Only) */}
                    {activeMenu === 'breakfast' && (
                      <div className="col-md-6">
                        <label htmlFor="quantity" className="form-label">
                          Default Quantity
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          id="quantity"
                          name="quantity"
                          value={formData.quantity}
                          onChange={handleInputChange}
                          min="1"
                          max="999"
                        />
                      </div>
                    )}

                    {/* Category */}
                    <div className="col-md-6">
                      <label htmlFor="category" className="form-label">
                        Category
                      </label>
                      <select
                        className="form-select"
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                      >
                        {getCategoryOptions(activeMenu).map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Image Upload */}
                    <div className="col-12">
                      <label className="form-label">
                        Item Image <small className="text-muted">(optional)</small>
                      </label>
                      
                      {/* Image Preview */}
                      {imagePreview && (
                        <div className="mb-3">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="img-thumbnail"
                            style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'cover' }}
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger ms-2"
                            onClick={removeImage}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      )}
                      
                      {/* File Input */}
                      <div className="d-flex gap-2 align-items-center">
                        <input
                          type="file"
                          className="form-control"
                          accept="image/*"
                          onChange={handleImageChange}
                          disabled={uploadingImage}
                        />
                        {uploadingImage && (
                          <div className="spinner-border spinner-border-sm text-primary" role="status">
                            <span className="visually-hidden">Uploading...</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="form-text">
                        <i className="bi bi-info-circle me-1"></i>
                        Select an image file (JPG, PNG, WebP) - Max 5MB
                      </div>
                      
                      {imageFile && (
                        <div className="mt-2">
                          <small className="text-success">
                            <i className="bi bi-check-circle me-1"></i>
                            Selected: {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)
                          </small>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div className="col-12">
                      <label htmlFor="description" className="form-label">
                        Description <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control"
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Enter item description or ingredients"
                        rows="4"
                        required
                      />
                    </div>

                    {/* Availability */}
                    <div className="col-12">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="is_on_stock"
                          name="is_on_stock"
                          checked={formData.is_on_stock}
                          onChange={handleInputChange}
                        />
                        <label className="form-check-label" htmlFor="is_on_stock">
                          <i className="bi bi-check-circle me-2"></i>
                          Item is available (in stock)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowCreateModal(false)}
                    disabled={modalLoading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={modalLoading}
                  >
                    {modalLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plus-circle me-2"></i>
                        Create Item
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && editingItem && (
        <div className="modal show d-block menus-modal-overlay">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleUpdateItem}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="bi bi-pencil me-2"></i>
                    Edit {activeMenu === 'room_service' ? 'Room Service' : 'Breakfast'} Item
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingItem(null);
                    }}
                  ></button>
                </div>
                
                <div className="modal-body">
                  <div className="row g-3">
                    {/* Name */}
                    <div className="col-md-6">
                      <label htmlFor="edit-name" className="form-label">
                        Item Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="edit-name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter item name"
                        maxLength={255}
                        required
                      />
                    </div>

                    {/* Price (Room Service Only) */}
                    {activeMenu === 'room_service' && (
                      <div className="col-md-6">
                        <label htmlFor="edit-price" className="form-label">
                          Price (€) <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          id="edit-price"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                    )}

                    {/* Quantity (Breakfast Only) */}
                    {activeMenu === 'breakfast' && (
                      <div className="col-md-6">
                        <label htmlFor="edit-quantity" className="form-label">
                          Default Quantity
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          id="edit-quantity"
                          name="quantity"
                          value={formData.quantity}
                          onChange={handleInputChange}
                          min="1"
                          max="999"
                        />
                      </div>
                    )}

                    {/* Category */}
                    <div className="col-md-6">
                      <label htmlFor="edit-category" className="form-label">Category</label>
                      <select
                        className="form-select"
                        id="edit-category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                      >
                        {getCategoryOptions(activeMenu).map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Description */}
                    <div className="col-12">
                      <label htmlFor="edit-description" className="form-label">
                        Description <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control"
                        id="edit-description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="Describe the item, ingredients, etc."
                        required
                      />
                    </div>

                    {/* Image Upload */}
                    <div className="col-12">
                      <label className="form-label">Item Image</label>
                      <div className="border rounded p-3">
                        {/* Current Image Preview */}
                        {imagePreview && (
                          <div className="mb-3">
                            <label className="form-label text-muted">Current Image:</label>
                            <div className="d-flex align-items-center gap-3">
                              <img
                                src={imagePreview}
                                alt="Current item"
                                style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                className="rounded border"
                              />
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={removeImage}
                              >
                                <i className="bi bi-trash"></i> Remove
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* File Upload */}
                        <div>
                          <input
                            type="file"
                            className="form-control"
                            id="edit-image"
                            accept="image/*"
                            onChange={handleImageChange}
                          />
                          <div className="form-text">
                            Choose a new image to replace the current one. Max size: 5MB
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stock Status */}
                    <div className="col-12">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="edit-is_on_stock"
                          name="is_on_stock"
                          checked={formData.is_on_stock}
                          onChange={handleInputChange}
                        />
                        <label className="form-check-label" htmlFor="edit-is_on_stock">
                          Item is currently in stock
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="modal-footer d-flex justify-content-between">
                  <button 
                    type="button" 
                    className="btn btn-danger"
                    onClick={handleDeleteItem}
                    disabled={modalLoading}
                  >
                    <i className="bi bi-trash me-2"></i>
                    Delete Item
                  </button>
                  
                  <div className="d-flex gap-2">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingItem(null);
                      }}
                      disabled={modalLoading}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={modalLoading}
                    >
                      {modalLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Updating...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle me-2"></i>
                          Update Item
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}