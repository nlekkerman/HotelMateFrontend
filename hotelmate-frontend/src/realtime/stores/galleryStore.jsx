// src/realtime/stores/galleryStore.js
import React, { createContext, useContext, useState } from 'react';

const GalleryContext = createContext(null);

export function GalleryStoreProvider({ children }) {
  const [galleryData, setGalleryData] = useState({
    galleries: [],
    images: []
  });

  // Placeholder for migration - will be implemented in Phase 6
  const handleEvent = (normalizedEvent) => {
    console.log('🖼️ Gallery store received event:', normalizedEvent);
    // TODO: Implement gallery event handling in Phase 6
  };

  const value = {
    galleryData,
    handleEvent
  };

  return (
    <GalleryContext.Provider value={value}>
      {children}
    </GalleryContext.Provider>
  );
}

export function useGalleryStore() {
  const context = useContext(GalleryContext);
  if (!context) {
    throw new Error('useGalleryStore must be used within GalleryStoreProvider');
  }
  return context;
}