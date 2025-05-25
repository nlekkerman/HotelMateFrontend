// src/context/UIContext.jsx
import { createContext, useContext, useState } from 'react';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
  // Initialize visibility states for rooms and guests
  const [visibility, setVisibility] = useState({
    rooms: false,
    guests: false,
  });

  const toggleVisibility = (view) => {
    setVisibility((prev) => ({
      ...prev,
      [view]: !prev[view],
    }));
  };

  return (
    <UIContext.Provider value={{ visibility, toggleVisibility }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => useContext(UIContext);
