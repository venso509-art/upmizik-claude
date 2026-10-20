"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Rann yon pop-up dirèkteman nan <body>. San sa, si yon paran gen yon efè tankou
// "backdrop-blur" oswa "transform", pop-up "fixed" la pozisyone dapre paran an (pa ekran an),
// e li ka koupe oswa glise anba header a.
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}
