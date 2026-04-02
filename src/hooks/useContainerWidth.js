import { useEffect, useState } from "react";

/**
 * @param {React.RefObject<HTMLElement | null>} ref
 * @param {number} [fallback=640]
 */
export function useContainerWidth(ref, fallback = 640) {
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      setWidth(Math.max(280, el.clientWidth));
    });
    ro.observe(el);
    setWidth(Math.max(280, el.clientWidth));
    return () => ro.disconnect();
  }, [ref]);

  return width;
}
