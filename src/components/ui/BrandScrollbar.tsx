import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

interface ScrollbarMetrics {
  visible: boolean;
  top: number;
  height: number;
  maxThumbTop: number;
  maxScroll: number;
}

const TRACK_INSET = 6;
const MIN_THUMB_HEIGHT = 48;

export default function BrandScrollbar() {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerY: number; scrollY: number } | null>(null);
  const metricsRef = useRef<ScrollbarMetrics>({ visible: false, top: TRACK_INSET, height: 0, maxThumbTop: 0, maxScroll: 0 });
  const [metrics, setMetrics] = useState(metricsRef.current);

  const update = useCallback(() => {
    const viewportHeight = window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;
    const maxScroll = Math.max(0, pageHeight - viewportHeight);
    const trackHeight = Math.max(0, viewportHeight - TRACK_INSET * 2);
    const height = Math.max(MIN_THUMB_HEIGHT, trackHeight * (viewportHeight / pageHeight));
    const maxThumbTop = Math.max(0, trackHeight - height);
    const top = TRACK_INSET + (maxScroll > 0 ? (window.scrollY / maxScroll) * maxThumbTop : 0);
    const next = { visible: maxScroll > 1, top, height, maxThumbTop, maxScroll };
    metricsRef.current = next;
    setMetrics(next);
  }, []);

  useEffect(() => {
    let frame = 0;
    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(document.documentElement);
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    scheduleUpdate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [update]);

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerY: event.clientY, scrollY: window.scrollY };
  };

  const drag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current || metricsRef.current.maxThumbTop <= 0) return;
    const delta = event.clientY - dragRef.current.pointerY;
    const scrollDelta = (delta / metricsRef.current.maxThumbTop) * metricsRef.current.maxScroll;
    window.scrollTo({ top: dragRef.current.scrollY + scrollDelta, behavior: 'auto' });
  };

  const stopDrag = () => {
    dragRef.current = null;
  };

  const jumpTo = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== trackRef.current || metricsRef.current.maxThumbTop <= 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const desiredTop = event.clientY - bounds.top - metricsRef.current.height / 2;
    const ratio = Math.max(0, Math.min(1, desiredTop / metricsRef.current.maxThumbTop));
    window.scrollTo({ top: ratio * metricsRef.current.maxScroll, behavior: 'smooth' });
  };

  return (
    <div
      ref={trackRef}
      className={`brand-scrollbar-track ${metrics.visible ? 'brand-scrollbar-visible' : ''}`}
      onPointerDown={jumpTo}
      aria-hidden="true"
    >
      <button
        type="button"
        tabIndex={-1}
        className="brand-scrollbar-thumb"
        style={{ height: metrics.height, transform: `translateY(${metrics.top - TRACK_INSET}px)` }}
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      />
    </div>
  );
}
