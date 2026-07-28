import { React, useState, useEffect, useMemo } from "react";
import "./MarqueeFooter.css";

// Grab every image in src/assets/footer-icons at build time.
// Drop new files in that folder and they'll show up automatically —
// no import list to maintain.
// (Put the folder in src/assets since Vite needs it there to process
// the glob — see the note below about public/ if yours must live there.)
const iconModules = import.meta.glob(
  "/src/assets/stars/*.{png,jpg,jpeg,gif,svg,webp,ico}",
  { eager: true, import: "default" }
);

const allImages = Object.values(iconModules);

// Seconds per image — tune this to taste. Total loop duration scales
// with item count so the per-icon speed feels the same as you add more.
const SECONDS_PER_IMAGE = 3;

// Fisher-Yates shuffle — returns a new array, doesn't mutate the input
function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function MarqueeFooter() {
  // Shuffle once per mount, not on every re-render
  const images = useMemo(() => shuffle(allImages), []);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (images.length === 0) return;

    // Preload every image before we show the track. Without this,
    // the browser fetches all icons at once, but only a handful
    // load in parallel — the rest pop in late, which looks like
    // a gap chasing the animation.
    let cancelled = false;
    Promise.all(
      images.map(
        (src) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve; // don't block forever on a bad file
            img.src = src;
          })
      )
    ).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [images]);

  if (images.length === 0 || !ready) return null;

  // Duplicate the (already shuffled) array so the loop has no visible seam
  const track = [...images, ...images];
  const speed = images.length * SECONDS_PER_IMAGE;

  return (
    <footer className="marquee-footer">
      <div
        className="marquee-track"
        style={{ animationDuration: `${speed}s` }}
      >
        {track.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="marquee-img"
            draggable={false}
          />
        ))}
      </div>
    </footer>
  );
}
