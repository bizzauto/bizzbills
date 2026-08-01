"use client";

import { useState, useRef, useCallback } from "react";

type SwipeableCardsProps = {
  children: React.ReactNode[];
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
};

export function SwipeableCards({
  children,
  onSwipeLeft,
  onSwipeRight,
}: SwipeableCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;
      const deltaX = e.touches[0].clientX - startX.current;
      setDragX(deltaX);
    },
    [isDragging]
  );

  const handleTouchEnd = useCallback(() => {
    if (Math.abs(dragX) > 50) {
      if (dragX < 0 && currentIndex < children.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        onSwipeLeft?.();
      } else if (dragX > 0 && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
        onSwipeRight?.();
      }
    }
    setDragX(0);
    setIsDragging(false);
  }, [dragX, currentIndex, children.length, onSwipeLeft, onSwipeRight]);

  return (
    <div className="relative overflow-hidden">
      {/* Cards Container */}
      <div
        className="flex transition-transform duration-300"
        style={{
          transform: `translateX(calc(-${currentIndex * 100}% + ${dragX}px))`,
          transition: isDragging ? "none" : "transform 0.3s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children.map((child, index) => (
          <div key={index} className="w-full flex-shrink-0">
            {child}
          </div>
        ))}
      </div>

      {/* Dot Indicators */}
      {children.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {children.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "w-6 bg-accent"
                  : "w-2 bg-[var(--input-border)]"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
