import React from "react";
import "./MarqueeFooter.css";

// Grab every image in src/assets/footer-icons at build time.
// Drop new files in that folder and they'll show up automatically —
// no import list to maintain.
// (Put the folder in src/assets since Vite needs it there to process
// the glob — see the note below about public/ if yours must live there.)
const iconModules = import.meta.glob(
  "/src/assets/footer-icons/*.{png,jpg,jpeg,gif,svg,webp}",
  { eager: true, import: "default" }
);

const images = Object.values(iconModules);

// Seconds per image — tune this to taste. Total loop duration scales
// with item count so the per-icon speed feels the same as you add more.
const SECONDS_PER_IMAGE = 3;

export default function MarqueeFooter() {
  if (images.length === 0) return null;

  // Duplicate the array so the loop has no visible seam
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
