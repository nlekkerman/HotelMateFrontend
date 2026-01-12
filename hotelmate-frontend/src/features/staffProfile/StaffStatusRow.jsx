import React, { useState } from "react";
import { FaToggleOn, FaToggleOff } from "react-icons/fa";

/**
 * Staff Status Row Component
 * Handles is_active and is_on_duty toggle fields
 */
export default function StaffStatusRow({ 
  label, 
  value, 
  fieldKey, 
  canEdit = false, 
  onSave,
  isStatusBadge = false
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(value ? "true" : "false");
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
      await onSave(fieldKey, editValue === "true");
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

  const getBadgeClass = () => {
    if (fieldKey === "current_status" && value && value.status) {
      switch (value.status) {
        case 'off_duty':
          return "bg-secondary";
        case 'on_duty':
          return "bg-success";
        case 'on_break':
          return "bg-warning";
        default:
          return "bg-secondary";
      }
    } else if (fieldKey === "is_active") {
      return value ? "bg-success" : "bg-secondary";
    } else if (fieldKey === "is_on_duty") {
      return value ? "bg-success" : "bg-danger";
    }
    return "bg-secondary";
  };

  const getDisplayText = () => {
    if (fieldKey === "current_status" && value && value.status) {
      const breakTime = value.is_on_break && value.break_start 
        ? ` (${Math.round((Date.now() - new Date(value.break_start)) / 60000)}min)`
        : '';
      return `${value.label}${breakTime}`;
    } else if (fieldKey === "is_active") {
      return value ? "Active" : "Inactive";
    } else if (fieldKey === "is_on_duty") {
      return value ? "On Duty" : "Off Duty";
    }
    return value ? "Yes" : "No";
  };

  const getSelectOptions = () => {
    if (fieldKey === "is_active") {
      return [
        { value: "true", label: "Active" },
        { value: "false", label: "Inactive" }
      ];
    } else if (fieldKey === "is_on_duty") {
      return [
        { value: "true", label: "On Duty" },
        { value: "false", label: "Off Duty" }
      ];
    }
    return [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" }
    ];
  };

  return (
    <li className="list-group-item staff-field-row d-flex align-items-center">
      <span className="staff-field-icon me-2">
        {fieldKey === "current_status" && value && value.status ? (
          <span className={`status-icon ${
            value.status === 'off_duty' ? 'text-secondary' :
            value.status === 'on_duty' ? 'text-success' :
            value.status === 'on_break' ? 'text-warning' : 'text-secondary'
          }`}>
            {value.status === 'off_duty' ? '🔴' :
             value.status === 'on_duty' ? '🟢' :
             value.status === 'on_break' ? '🟡' : '⚪'}
          </span>
        ) : value ? (
          <FaToggleOn className="text-success" />
        ) : (
          <FaToggleOff className={fieldKey === "is_on_duty" ? "text-danger" : "text-secondary"} />
        )}
      </span>
      <span className="flex-grow-1 staff-field-label text-dark">{label}:</span>
      
      {isEditing ? (
        <span className="staff-field-value">
          <select 
            value={editValue} 
            onChange={e => setEditValue(e.target.value)} 
            className="form-select d-inline w-auto"
            disabled={saving}
          >
            {getSelectOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
          <span className={`badge staff-status-badge ${getBadgeClass()} text-capitalize`}>
            {getDisplayText()}
          </span>
          {canEdit && !isStatusBadge && (
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