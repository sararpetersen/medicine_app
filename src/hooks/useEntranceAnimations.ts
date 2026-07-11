import { inView } from "motion";
import { useLayoutEffect, type DependencyList, type RefObject } from "react";

export function useEntranceAnimations(
  rootRef: RefObject<HTMLElement | null>,
  dependencies: DependencyList = [],
) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const isMobileViewport = window.matchMedia("(max-width: 767px)").matches;
    const markedItems = Array.from(root.querySelectorAll<HTMLElement>("[data-entrance-item]"));
    const items = Array.from(root.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
    const staggerGroups = Array.from(root.querySelectorAll<HTMLElement>("[data-entrance-stagger]"));
    const stopObservers: Array<() => void> = [];
    const registeredItems = new Set<HTMLElement>();

    const registerItems = (animationItems: HTMLElement[], duration: string, staggerMs = 60, animationClass = "animate__fadeInUp") => animationItems.forEach((item, index) => {
      if (registeredItems.has(item)) return;
      registeredItems.add(item);
      item.classList.add("entrance-pending");
      const delayMs = index * staggerMs;
      const normalizedDelay = isMobileViewport ? Math.min(delayMs, staggerMs === 60 ? 220 : 360) : delayMs;

      item.style.animationDelay = `${normalizedDelay}ms`;
      item.style.animationDuration = duration;
      item.style.animationFillMode = "both";

      let stop = () => {};
      stop = inView(item, () => {
        item.classList.add("animate__animated", animationClass);
        item.classList.remove("entrance-pending");
        stop();
      });
      stopObservers.push(stop);
    });

    registerItems(items, isMobileViewport ? "1s" : "1.6s");
    registerItems(markedItems, isMobileViewport ? "0.95s" : "1.3s", 60, "animate__fadeIn");
    staggerGroups.forEach((group) => {
      const groupItems = Array.from(group.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
      registerItems(groupItems, isMobileViewport ? "0.95s" : "1.3s", 120, "animate__fadeIn");
    });

    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.target !== root) return;
        Array.from(record.addedNodes).forEach((node) => {
          if (node instanceof HTMLElement) {
            registerItems([node], isMobileViewport ? "1s" : "1.6s");
          }
        });
      });
      root.querySelectorAll<HTMLElement>("[data-entrance-item]").forEach((item) => {
        registerItems([item], isMobileViewport ? "0.95s" : "1.3s", 60, "animate__fadeIn");
      });
      root.querySelectorAll<HTMLElement>("[data-entrance-stagger]").forEach((group) => {
        const groupItems = Array.from(group.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
        registerItems(groupItems, isMobileViewport ? "0.95s" : "1.3s", 120, "animate__fadeIn");
      });
    });
    mutationObserver.observe(root, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      stopObservers.forEach((stop) => stop());
      registeredItems.forEach((item) => {
        item.classList.remove("entrance-pending", "animate__animated", "animate__fadeInUp", "animate__fadeIn");
        item.style.removeProperty("animation-delay");
        item.style.removeProperty("animation-duration");
        item.style.removeProperty("animation-fill-mode");
      });
    };
  }, dependencies);
}
