import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";

/**
 * Staff Image Upload Component
 * Handles profile image upload with React Query invalidation
 */
export default function StaffImageUploader({ staff, hotelSlug, isOwnProfile, onUpdated }) {
  const [imageUploading, setImageUploading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageError, setImageError] = useState(null);
  
  const queryClient = useQueryClient();

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
    setImageError(null);
  };

  const handleImageUpload = async () => {
    if (!imageFile) return;
    
    setImageUploading(true);
    setImageError(null);
    
    const formData = new FormData();
    formData.append("profile_image", imageFile);
    
    try {
      await api.patch(`/staff/${hotelSlug}/${staff.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      // Invalidate queries to refresh staff data
      await queryClient.invalidateQueries({ queryKey: ["staffMe", hotelSlug] });
      
      // Reset state
      setImageFile(null);
      
      if (onUpdated) onUpdated();
      
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.detail) {
        setImageError("You are not allowed to update this profile.");
      } else {
        setImageError("Failed to upload image.");
      }
    } finally {
      setImageUploading(false);
    }
  };

  if (!isOwnProfile) {
    return null;
  }

  return (
    <div className="staff-image-uploader">
      <label className="btn btn-sm btn-light">
        Edit Image
        <input 
          type="file" 
          accept="image/*" 
          style={{ display: "none" }} 
          onChange={handleImageChange} 
        />
      </label>
      {imageFile && (
        <button 
          className="hm-btn hm-btn-confirm ms-2" 
          onClick={handleImageUpload} 
          disabled={imageUploading}
        >
          {imageUploading ? "Uploading..." : "Save Image"}
        </button>
      )}
      {imageError && (
        <div className="text-danger small mt-1">{imageError}</div>
      )}
    </div>
  );
}