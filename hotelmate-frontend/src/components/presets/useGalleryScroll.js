import { useState, useRef, useEffect } from 'react';

/**
 * Custom hook for gallery scrolling functionality
 */
export const useGalleryScroll = (displayedImages) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      setMaxScroll(container.scrollWidth - container.clientWidth);
    }
  }, [displayedImages]);

  const handleScroll = (direction) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = 300;
      const newPosition = direction === 'left' 
        ? Math.max(0, scrollPosition - scrollAmount)
        : Math.min(maxScroll, scrollPosition + scrollAmount);
      
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  return {
    scrollPosition,
    setScrollPosition,
    maxScroll,
    scrollContainerRef,
    handleScroll
  };
};
