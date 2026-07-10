import { inView } from "motion";
import { useLayoutEffect, type DependencyList, type RefObject } from "react";

export function useEntranceAnimations(
  rootRef: RefObject<HTMLElement | null>,
  dependencies: DependencyList = [],
) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const markedItems = Array.from(root.querySelectorAll<HTMLElement>("[data-entrance-item]"));
    const items = markedItems.length > 0 ? markedItems : Array.from(root.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
    const stopObservers: Array<() => void> = [];

    items.forEach((item, index) => {
      item.classList.add("entrance-pending");
      item.style.animationDelay = `${Math.min(index * 60, 220)}ms`;
      item.style.animationFillMode = "both";

      let stop = () => {};
      stop = inView(item, () => {
        item.classList.add("animate__animated", "animate__fadeInUp");
        item.classList.remove("entrance-pending");
        stop();
      });
      stopObservers.push(stop);
    });

    return () => {
      stopObservers.forEach((stop) => stop());
      items.forEach((item) => {
        item.classList.remove("entrance-pending", "animate__animated", "animate__fadeInUp");
        item.style.removeProperty("animation-delay");
        item.style.removeProperty("animation-fill-mode");
      });
    };
  }, dependencies);
}
