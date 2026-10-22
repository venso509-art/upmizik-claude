"use client";

import { useEffect } from "react";

// iPhone (Safari) inyore "user-scalable=no" nan viewport la: nou bloke jès zoom yo dirèkteman.
// Moun nan ka toujou woule paj la ak yon dwèt; se sèlman zoom ak 2 dwèt ki bloke.
export function NoZoom() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    // Jès "pinch" Safari yo
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("gesturestart", stop, { passive: false });
    document.addEventListener("gesturechange", stop, { passive: false });
    document.addEventListener("gestureend", stop, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("gestureend", stop);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, []);
  return null;
}
