import React, { useState } from "react";

/**
 * Reusable Staff Field Row Component
 * Handles display and editing of individual staff profile fields
 */
export default function StaffFieldRow({ 
  icon, 
  label, 
  fieldKey, 
  valueDisplay, 
  type = "text", 
  options = [], 
  canEdit = false, 
  onSave 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(valueDisplay || "");
    setEditError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue("");
    setEditError(null);
  };

  const handleSave = async () => {
    setEditError(null);
    setSaving(true);
    
    try {
      await onSave(fieldKey, editValue);
      setIsEditing(false);
      setEditValue("");
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.detail) {
        setEditError("You are not allowed to update this profile.");
      } else {
        setEditError("Failed to update. Try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const renderEditControl = () => {
    if (type === "select") {
      return (
        <select 
          value={editValue} 
          onChange={e => setEditValue(e.target.value)} 
          className="form-select d-inline w-auto"
          disabled={saving}
        >
          <option value="">-- Select {label} --</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }
    
    return (
      <input 
        value={editValue} 
        onChange={e => setEditValue(e.target.value)} 
        className="form-control d-inline w-auto"
        disabled={saving}
      />
    );
  };

  return (
    <li className="list-group-item staff-field-row d-flex align-items-center">
      <span className="staff-field-icon me-2">
        {icon}
      </span>
      <span className="flex-grow-1 staff-field-label">{label}:</span>
      
      {isEditing ? (
        <span className="staff-field-value">
          {renderEditControl()}
          <button 
            className="hm-btn hm-btn-confirm ms-2" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button 
            className="hm-btn hm-btn-outline ms-1" 
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </button>
          {editError && (
            <div className="text-danger small ms-2">{editError}</div>
          )}
        </span>
      ) : (
        <span className="staff-field-value">
          <span className="fw-semibold">{valueDisplay || "N/A"}</span>
          {canEdit && (
            <button 
              className="btn btn-link btn-sm ms-1" 
              onClick={handleEdit}
            >
              Edit
            </button>
          )}
        </span>
      )}
    </li>
  );
}