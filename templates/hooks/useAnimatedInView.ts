// @ts-nocheck
"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

interface UseAnimatedInViewOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

export function useAnimatedInView<T extends HTMLElement = HTMLDivElement>(
  options: UseAnimatedInViewOptions = {}
): [RefObject<T>, boolean] {
  const { threshold = 0.1, rootMargin = "0px 0px -50px 0px", once = true } = options;
  const ref = useRef<T>(null!) as RefObject<T>;
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, inView];
}
