import { useRef, useEffect, useMemo, useState } from "react";
import "./sticker.css";

const EASE_TAU_MS = 110;
const PEEL_THRESHOLD = 80;

const StickerPeel = ({
  imageSrc,
  rotate = 30,
  peelBackHoverPct = 15,
  width = 200,
  shadowIntensity = 0.6,
  peelDirection = 0,
  className = "",
}) => {
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [displayedPeel, setDisplayedPeel] = useState(0);
  const [isPeeled, setIsPeeled] = useState(false);
  const [isFalling, setIsFalling] = useState(false);
  const [isTouchActive, setIsTouchActive] = useState(false);
  const defaultPadding = 10;

  const isDraggingRef = useRef(false);
  const isPeeledRef = useRef(false);
  const startYRef = useRef(0);
  const targetPeelRef = useRef(0);
  const displayedPeelRef = useRef(0);
  const peelTriggeredRef = useRef(false);
  const rafRef = useRef(null);
  const lastTsRef = useRef(null);
  const fallTimeoutRef = useRef(null);
  const resetTimeoutRef = useRef(null);
  const hoverPctRef = useRef(peelBackHoverPct);

  hoverPctRef.current = peelBackHoverPct;

  const stopEaseLoop = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTsRef.current = null;
  };

  const beginPeelFall = () => {
    if (peelTriggeredRef.current) return;
    peelTriggeredRef.current = true;
    isPeeledRef.current = true;
    isDraggingRef.current = false;
    setIsPeeled(true);
    setIsDragging(false);
    stopEaseLoop();

    fallTimeoutRef.current = setTimeout(() => {
      setIsFalling(true);
    }, 500);

    resetTimeoutRef.current = setTimeout(() => {
      setIsPeeled(false);
      setIsFalling(false);
      setIsDragging(false);
      setIsTouchActive(false);
      setDisplayedPeel(0);
      targetPeelRef.current = 0;
      displayedPeelRef.current = 0;
      isDraggingRef.current = false;
      isPeeledRef.current = false;
      peelTriggeredRef.current = false;
      startYRef.current = 0;
    }, 1200);
  };

  const beginPeelFallRef = useRef(beginPeelFall);
  beginPeelFallRef.current = beginPeelFall;

  const tick = (ts) => {
    const last = lastTsRef.current ?? ts;
    lastTsRef.current = ts;
    const dt = Math.min(ts - last, 50);

    const target = targetPeelRef.current;
    const current = displayedPeelRef.current;
    const next = current + (target - current) * (1 - Math.exp(-dt / EASE_TAU_MS));
    const displayed = Math.abs(target - next) < 0.05 ? target : next;

    displayedPeelRef.current = displayed;
    setDisplayedPeel(displayed);

    if (displayed >= PEEL_THRESHOLD && !peelTriggeredRef.current) {
      beginPeelFallRef.current();
      return;
    }

    const stillEasing = Math.abs(target - displayed) >= 0.05;
    if (isDraggingRef.current || stillEasing) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = null;
      lastTsRef.current = null;
    }
  };

  const ensureEaseLoop = () => {
    if (rafRef.current == null) {
      lastTsRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const setTargetPeel = (value) => {
    targetPeelRef.current = Math.min(100, Math.max(0, value));
    ensureEaseLoop();
  };

  const peelFromPointerY = (clientY) => {
    const container = containerRef.current;
    if (!container) return hoverPctRef.current;

    const downDistance = Math.max(0, clientY - startYRef.current);
    const maxDrag = container.getBoundingClientRect().height * 0.8;
    const hoverPct = hoverPctRef.current;
    return hoverPct + (downDistance / maxDrag) * (100 - hoverPct);
  };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handlePointerDown = (clientY, { touch = false } = {}) => {
      if (isPeeledRef.current) return;

      const hoverPct = hoverPctRef.current;
      startYRef.current = clientY;
      isDraggingRef.current = true;
      targetPeelRef.current = hoverPct;
      displayedPeelRef.current = hoverPct;
      setDisplayedPeel(hoverPct);
      setIsDragging(true);
      if (touch) setIsTouchActive(true);
      ensureEaseLoop();
    };

    const handlePointerMove = (clientY) => {
      if (!isDraggingRef.current || isPeeledRef.current) return;
      setTargetPeel(peelFromPointerY(clientY));
    };

    const handlePointerUp = () => {
      if (isPeeledRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        setIsTouchActive(false);
        return;
      }

      if (isDraggingRef.current) {
        const hoverPct = hoverPctRef.current;
        targetPeelRef.current = hoverPct;
        displayedPeelRef.current = hoverPct;
        setDisplayedPeel(hoverPct);
        stopEaseLoop();
      }

      isDraggingRef.current = false;
      setIsDragging(false);
      setIsTouchActive(false);
    };

    const handleMouseDown = (e) => {
      handlePointerDown(e.clientY);
      e.preventDefault();
    };

    const handleMouseMove = (e) => {
      handlePointerMove(e.clientY);
    };

    const handleTouchStart = (e) => {
      handlePointerDown(e.touches[0].clientY, { touch: true });
    };

    const handleTouchMove = (e) => {
      if (!isDraggingRef.current || isPeeledRef.current) return;
      e.preventDefault();
      handlePointerMove(e.touches[0].clientY);
    };

    wrapper.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handlePointerUp);
    wrapper.addEventListener("touchstart", handleTouchStart, { passive: true });
    wrapper.addEventListener("touchmove", handleTouchMove, { passive: false });
    wrapper.addEventListener("touchend", handlePointerUp);
    wrapper.addEventListener("touchcancel", handlePointerUp);

    return () => {
      wrapper.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handlePointerUp);
      wrapper.removeEventListener("touchstart", handleTouchStart);
      wrapper.removeEventListener("touchmove", handleTouchMove);
      wrapper.removeEventListener("touchend", handlePointerUp);
      wrapper.removeEventListener("touchcancel", handlePointerUp);
      stopEaseLoop();
      if (fallTimeoutRef.current) clearTimeout(fallTimeoutRef.current);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  const cssVars = useMemo(
    () => ({
      "--sticker-rotate": `${rotate}deg`,
      "--sticker-p": `${defaultPadding}px`,
      "--sticker-peelback-hover": `${peelBackHoverPct}%`,
      "--sticker-peelback-drag": `${displayedPeel}%`,
      "--sticker-width": `${width}px`,
      "--sticker-shadow-opacity": shadowIntensity,
      "--peel-direction": `${peelDirection}deg`,
    }),
    [rotate, peelBackHoverPct, displayedPeel, width, shadowIntensity, peelDirection]
  );

  const containerClassName = [
    "sticker-container",
    isDragging && !isPeeled ? "dragging" : "",
    isPeeled ? "peeled" : "",
    isTouchActive ? "touch-active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const wrapperClassName = [className, isFalling ? "falling" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClassName} ref={wrapperRef} style={cssVars}>
      <svg width="0" height="0">
        <defs>
          <filter id="dropShadow">
            <feDropShadow
              dx="2"
              dy="4"
              stdDeviation={3 * shadowIntensity}
              floodColor="black"
              floodOpacity={shadowIntensity}
            />
          </filter>

          <filter id="expandAndFill">
            <feOffset dx="0" dy="0" in="SourceAlpha" result="shape" />
            <feFlood floodColor="rgb(179,179,179)" result="flood" />
            <feComposite operator="in" in="flood" in2="shape" />
          </filter>
        </defs>
      </svg>

      <div className={containerClassName} ref={containerRef}>
        <div className="sticker-main">
          <img
            src={imageSrc}
            alt=""
            className="sticker-image"
            draggable="false"
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>

        <div className="flap">
          <img
            src={imageSrc}
            alt=""
            className="flap-image"
            draggable="false"
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
      </div>
    </div>
  );
};

export default StickerPeel;
