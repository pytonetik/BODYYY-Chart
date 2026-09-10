import { useEffect, useState } from "react";

export const NARROW_MAX = 767;

export function useNarrow() {
  const [narrow, setNarrow] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${NARROW_MAX}px)`);
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return narrow;
}
