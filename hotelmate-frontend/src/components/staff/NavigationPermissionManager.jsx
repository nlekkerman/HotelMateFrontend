import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { toast } from 'react-toastify';

const NavigationPermissionManager = ({ staffId }) => {
  const [availableNavItems, setAvailableNavItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Get hotel_slug from localStorage
  const getHotelSlug = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.hotel_slug || 'hotel-killarney';
    } catch {
      return 'hotel-killarney';
    }
  };

  useEffect(() => {
    if (staffId) {
      fetchAvailableNavItems();
      fetchStaffPermissions();
    }
  }, [staffId]);

  const fetchAvailableNavItems = async () => {
    const hotelSlug = getHotelSlug();
    try {
      const response = await api.get(`/staff/navigation-items/?hotel_slug=${hotelSlug}`);
      console.log('Available navigation items:', response.data);
      
      // Backend returns array of navigation items directly
      const items = Array.isArray(response.data) ? response.data : [];
      console.log(`Loaded ${items.length} navigation items`);
      
      setAvailableNavItems(items);
      setApiError(null);
    } catch (error) {
      console.error('Error fetching navigation items:', error);
      setApiError('Navigation items API endpoint not implemented yet. Please check backend.');
      toast.error('Failed to load navigation items');
      setAvailableNavItems([]);
    }
  };

  const fetchStaffPermissions = async () => {
    setInitialLoading(true);
    try {
      const response = await api.get(`/staff/staff/${staffId}/navigation-permissions/`);
      console.log('Staff permissions response:', response.data);
      
      // Use navigation_item_ids directly from backend (as per CHECKBOX_SELECTION_GUIDE.md)
      const ids = response.data.navigation_item_ids || [];
      console.log('Selected navigation item IDs:', ids);
      
      setSelectedIds(ids);
      setApiError(null);
    } catch (error) {
      console.error('Error fetching staff permissions:', error);
      setApiError('Staff navigation permissions API endpoint not implemented yet.');
      toast.error('Failed to load staff permissions');
      setSelectedIds([]);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleToggle = (navItemId) => {
    setSelectedIds(prev => 
      prev.includes(navItemId)
        ? prev.filter(id => id !== navItemId)
        : [...prev, navItemId]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(availableNavItems.map(item => item.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await api.put(
        `/staff/staff/${staffId}/navigation-permissions/`,
        { navigation_item_ids: selectedIds }
      );
      
      toast.success('Navigation permissions updated successfully!');
      await fetchStaffPermissions();
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error(error.response?.data?.message || 'Failed to update navigation permissions');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Show error message if API endpoints don't exist
  if (apiError) {
    return (
      <div className="alert alert-warning p-4">
        <h5 className="alert-heading">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Backend API Not Ready
        </h5>
        <p>{apiError}</p>
        <hr />
        <p className="mb-0">
          <strong>Required API Endpoints:</strong>
        </p>
        <ul className="mb-0">
          <li><code>GET /api/staff/navigation-items/</code></li>
          <li><code>GET /api/staff/staff/{'{staffId}'}/navigation-permissions/</code></li>
          <li><code>PUT /api/staff/staff/{'{staffId}'}/navigation-permissions/</code></li>
        </ul>
      </div>
    );
  }

  return (
    <div className="navigation-permission-manager card p-4 shadow-sm">
      <h4 className="mb-3">
        <i className="bi bi-list-ul me-2"></i>
        Assign Navigation Items
      </h4>
      <p className="text-muted mb-4">
        Select which navigation items this staff member can access. 
        The staff member will need to re-login to see changes.
      </p>

      {/* Select All / Deselect All */}
      <div className="btn-group mb-3">
        <button 
          className="btn btn-outline-primary btn-sm"
          onClick={handleSelectAll}
          disabled={loading}
        >
          <i className="bi bi-check-all me-1"></i>
          Select All
        </button>
        <button 
          className="btn btn-outline-secondary btn-sm"
          onClick={handleDeselectAll}
          disabled={loading}
        >
          <i className="bi bi-x-circle me-1"></i>
          Deselect All
        </button>
      </div>

      {/* Stats */}
      <div className="alert alert-info mb-3">
        <i className="bi bi-info-circle me-2"></i>
        {selectedIds.length} of {availableNavItems.length} navigation items selected
      </div>

      {/* Checkbox list */}
      <div className="list-group mb-4">
        {availableNavItems.length > 0 ? (
          availableNavItems.map(item => (
            <div 
              key={item.id} 
              className={`list-group-item ${selectedIds.includes(item.id) ? 'list-group-item-success' : ''}`}
            >
              <div className="d-flex align-items-center">
                <div className="form-check me-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`nav-item-${item.id}`}
                    checked={selectedIds.includes(item.id)}
                    onChange={() => handleToggle(item.id)}
                    disabled={loading}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center mb-1">
                    <i className={`bi bi-${item.icon || 'circle'} me-2 fs-5`}></i>
                    <strong>{item.name}</strong>
                  </div>
                  <div className="d-flex align-items-center gap-3 flex-wrap">
                    <small className="text-muted">
                      <i className="bi bi-tag me-1"></i>
                      Slug: <code>{item.slug}</code>
                    </small>
                    <small className="text-muted">
                      <i className="bi bi-link-45deg me-1"></i>
                      Path: <code>{item.path || 'N/A'}</code>
                    </small>
                  </div>
                  {item.description && (
                    <small className="d-block mt-1 text-muted">
                      {item.description}
                    </small>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="alert alert-warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            No navigation items available. Please check backend configuration.
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="d-flex justify-content-end gap-2">
        <button 
          className="btn btn-secondary"
          onClick={() => fetchStaffPermissions()}
          disabled={loading}
        >
          <i className="bi bi-arrow-clockwise me-1"></i>
          Reset
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          disabled={loading || selectedIds.length === 0}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Saving...
            </>
          ) : (
            <>
              <i className="bi bi-save me-1"></i>
              Save Permissions
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default NavigationPermissionManager;
