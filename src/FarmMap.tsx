import { useLayoutEffect, useRef, useState } from "react";
import { Pond, pondStatus, number } from "./game";

export function FishArt({
  color = "#eab09c",
  className = "",
}: {
  color?: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 110 56"
      fill="none"
      aria-hidden="true"
    >
      <path d="M79 28 103 12 98 29 103 43Z" fill={color} />
      <path d="M18 28C33 5 66 7 83 28 65 49 32 50 18 28Z" fill={color} />
      <path d="m44 14 14-9 8 11M45 42l14 8 5-11" fill={color} opacity=".75" />
      <path
        d="M36 17q-8 11 1 23"
        stroke="#274d43"
        strokeWidth="1.8"
        opacity=".4"
      />
      <path d="M43 28h30" stroke="#fff" strokeWidth="2" opacity=".5" />
      <circle cx="28" cy="26" r="2.4" fill="#21483f" />
    </svg>
  );
}
const trees = [
  [75, 170, 24],
  [107, 188, 18],
  [51, 209, 20],
  [159, 82, 17],
  [202, 56, 24],
  [266, 49, 19],
  [325, 53, 23],
  [365, 35, 17],
  [490, 51, 20],
  [532, 35, 23],
  [776, 88, 19],
  [812, 111, 25],
  [838, 151, 20],
  [797, 205, 18],
  [850, 261, 23],
  [820, 293, 21],
  [789, 331, 17],
  [824, 465, 19],
  [871, 420, 23],
  [690, 456, 21],
  [715, 470, 18],
  [90, 417, 25],
  [123, 453, 19],
  [51, 456, 22],
  [195, 475, 16],
  [392, 459, 19],
  [455, 465, 20],
  [464, 102, 14],
];
const positions = [
  [275, 183],
  [620, 183],
  [275, 378],
  [620, 378],
];
export default function FarmMap({
  ponds,
  selected,
  select,
}: {
  ponds: Pond[];
  selected: number;
  select: (id: number) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 520 });
  useLayoutEffect(() => {
    const node = frame.current;
    if (!node) return;
    setSize({ width: node.clientWidth, height: node.clientHeight });
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const scale = Math.min(size.width / 900, size.height / 520);
  const offsetX = (size.width - 900 * scale) / 2;
  const offsetY = (size.height - 520 * scale) / 2;
  return (
    <div ref={frame} className="farm-map-frame">
    <svg
      className="farm-map"
      viewBox="0 0 900 520"
      role="group"
      aria-label="Carte interactive de votre exploitation"
    >
      <defs>
        <pattern
          id="grass"
          width="44"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="m12 23 2-4 2 4m21 9 2-3"
            stroke="#718d57"
            strokeWidth="1"
            opacity=".26"
          />
          <circle cx="30" cy="8" r="1" fill="#eef0c9" opacity=".55" />
        </pattern>
        <linearGradient id="water" x2=".9" y2="1">
          <stop stopColor="#76b4b0" />
          <stop offset="1" stopColor="#427f85" />
        </linearGradient>
        <linearGradient id="river" x2="1" y2="1">
          <stop stopColor="#a1cac5" />
          <stop offset="1" stopColor="#7eaead" />
        </linearGradient>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="3"
            floodColor="#345646"
            floodOpacity=".15"
          />
        </filter>
      </defs>
      <rect width="900" height="520" fill="#d4ddba" />
      <path d="M0 0H900V520H0Z" fill="url(#grass)" />
      <path d="M0 90Q185 111 270 45T571 15L900 95V0H0Z" fill="#c2d0a6" />
      <path
        d="M662-40q-18 54 69 75t119 27 82 106"
        fill="none"
        stroke="#ebdfbf"
        strokeWidth="76"
      />
      <path
        d="M662-40q-18 54 69 75t119 27 82 106"
        fill="none"
        stroke="url(#river)"
        strokeWidth="59"
      />
      <path
        d="M673-40q-18 54 69 75t119 27 82 106"
        fill="none"
        stroke="#d5e8d9"
        strokeWidth="2"
        strokeDasharray="20 25 50 20"
        opacity=".7"
      />
      <path
        d="M-15 305Q250 272 435 278t480 8M445 85q-3 191 0 247t7 200M97 95l38 142 1 51"
        fill="none"
        stroke="#b9bf93"
        strokeWidth="36"
        opacity=".5"
      />
      <path
        d="M-15 300Q250 267 435 273t480 8M440 85q-3 191 0 247t7 200M92 95l38 142 1 51"
        fill="none"
        stroke="#eae2bf"
        strokeWidth="28"
      />
      <path
        d="M-15 298Q250 265 435 271t480 8"
        fill="none"
        stroke="#d8cea8"
        strokeWidth="1.5"
        strokeDasharray="4 9"
      />
      <g transform="translate(65 60)" filter="url(#shadow)">
        <path d="M-8 41 31 12 75 39V89H-8Z" fill="#e7dabb" />
        <path d="M-19 42 29 1 87 38 76 46 30 15-9 51Z" fill="#b87961" />
        <path d="M30 15 77 45V90H30Z" fill="#cec3a4" />
        <rect x="2" y="54" width="17" height="35" rx="2" fill="#688374" />
        <rect x="43" y="51" width="17" height="18" rx="2" fill="#839e91" />
        <path d="M51 51v18M43 59h17" stroke="#e7dabb" strokeWidth="2" />
        <path d="M59 17V4h9v22" fill="#b89b7e" />
      </g>
      <g opacity=".55" stroke="#8c9c6d" strokeWidth="2">
        <path d="M32 348h78m-80 13h77m-77 13h77m-79 13h77" />
        <path d="m42 338-14 62m34-62-14 62m34-62-14 62m34-62-14 62" />
      </g>
      {trees.map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <ellipse
            cx="5"
            cy="10"
            rx={r}
            ry={r * 0.65}
            fill="#526e43"
            opacity=".12"
          />
          <path d="M0 3v18" stroke="#8b8e61" strokeWidth="5" />
          <circle r={r} fill={i % 3 ? "#95ad78" : "#789966"} />
          <circle
            cx={-r * 0.28}
            cy={-r * 0.2}
            r={r * 0.72}
            fill={i % 3 ? "#a4bb86" : "#88a673"}
          />
          <path
            d={`M-4 ${-r * 0.6}q-9 6-6 12`}
            stroke="#d2ddac"
            strokeWidth="2"
            strokeLinecap="round"
            opacity=".4"
          />
        </g>
      ))}
      {ponds.map((pond, i) => {
        const [x, y] = positions[i];
        const active = selected === pond.id;
        const status = pondStatus(pond);
        return (
          <g
            key={pond.id}
            transform={`translate(${x} ${y})`}
            role="button"
            tabIndex={0}
            aria-label={`Bassin ${pond.id}, ${pond.name}, ${status.label}${pond.count ? `, ${number(pond.count)} poissons de ${number(pond.weight * 1000)} g` : ""}`}
            aria-pressed={active}
            onClick={() => select(pond.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                select(pond.id);
              }
            }}
            className={`map-pond ${active ? "selected" : ""}`}
          >
            <rect
              className="pond-focus"
              x="-139"
              y="-80"
              width="278"
              height="166"
              rx="39"
              fill="none"
              stroke={active ? "#315f49" : "transparent"}
              strokeWidth="2"
              strokeDasharray={active ? "6 5" : "none"}
            />
            {pond.built ? (
              <>
                <rect
                  x="-129"
                  y="-70"
                  width="258"
                  height="141"
                  rx="33"
                  fill="#839f79"
                  filter="url(#shadow)"
                />
                <rect
                  x="-123"
                  y="-67"
                  width="246"
                  height="132"
                  rx="28"
                  fill="#ede7ca"
                />
                <rect
                  x="-117"
                  y="-61"
                  width="234"
                  height="120"
                  rx="24"
                  fill="url(#water)"
                />
                <path
                  d="M-95-47h149q46 0 46 25"
                  stroke="#cbe2cb"
                  strokeWidth="3"
                  fill="none"
                  opacity=".5"
                />
                <g
                  fill="none"
                  stroke="#acd6cf"
                  strokeWidth="1.4"
                  opacity=".5"
                  className="water-ripples"
                >
                  <path d="M-77-26q10-6 20 0t20 0M24-36q10-5 20 0t20 0M-8 40q10-5 20 0t20 0M57 11q10-5 20 0t20 0M-82 23q8-5 16 0" />
                  <ellipse cx="40" cy="-5" rx="20" ry="5" />
                </g>
                {pond.count > 0 &&
                  [
                    [-65, -15, 20],
                    [5, 17, -15],
                    [57, -21, 30],
                    [-32, 35, -10],
                  ].map(([fx, fy, angle], j) => (
                    <g
                      key={j}
                      transform={`translate(${fx} ${fy}) rotate(${angle})`}
                    >
                      <g className={`map-fish fish-${j}`}>
                        <path
                          d="M-13 0q14-14 28 0Q1 14-13 0l-9 7v-14Z"
                          fill={
                            pond.species === "carp"
                              ? "#dfc17c"
                              : pond.species === "tilapia"
                                ? "#b6d3d6"
                                : "#e7baa8"
                          }
                          opacity=".85"
                        />
                        <circle cx="9" cy="-1" r="1" fill="#436c61" />
                      </g>
                    </g>
                  ))}
                <g transform="translate(98 50)">
                  <path d="M-13 0H16V34H-13Z" fill="#bb9973" />
                  <path
                    d="M-9 0v34m8-34v34m8-34v34"
                    stroke="#917e5e"
                    strokeWidth="1"
                  />
                  <circle cx="-11" cy="32" r="3" fill="#796d52" />
                  <circle cx="14" cy="32" r="3" fill="#796d52" />
                </g>
                {pond.upgrade > 0 && (
                  <g transform="translate(-102 36)">
                    <circle r="9" fill="#dbe8d8" />
                    <circle r="4" fill="#739889" />
                    <circle cy="-18" r="2" fill="#d6efdf" />
                    <circle
                      cx="5"
                      cy="-27"
                      r="2.5"
                      fill="#d6efdf"
                      className="bubble"
                    />
                  </g>
                )}
              </>
            ) : (
              <>
                <rect
                  x="-125"
                  y="-64"
                  width="250"
                  height="134"
                  rx="22"
                  fill="#bfcea5"
                  fillOpacity=".35"
                  stroke="#92a77c"
                  strokeDasharray="6 6"
                  strokeWidth="1.5"
                />
                <g stroke="#8c9e76" strokeWidth="2" opacity=".45">
                  <path d="m-90 30 3-9 4 8m150-60 3-9 4 8m-105-4 3-9 4 8m28 77 3-9 4 8" />
                </g>
                <circle cy="-5" r="22" fill="#eef0da" fillOpacity=".8" />
                <path d="M-8-5H8M0-13V3" stroke="#718566" strokeWidth="1.6" />
              </>
            )}
          </g>
        );
      })}
      <g transform="translate(773 378)" filter="url(#shadow)">
        <path d="M0 22 34 2 69 22V65H0Z" fill="#ddd1a9" />
        <path d="m-9 24 44-31 43 31-9 6-34-22-34 22Z" fill="#5e7a62" />
        <rect x="19" y="35" width="30" height="30" fill="#9ba586" />
        <path d="M34 35v30" stroke="#ddd1a9" strokeWidth="2" />
      </g>
      <g transform="translate(857 48)" stroke="#5a735c" fill="none">
        <circle r="17" strokeOpacity=".35" />
        <path d="m0-11 5 17-5-3-5 3Z" fill="#5a735c" stroke="none" />
      </g>

    </svg>
    {ponds.map((pond, i) => <span key={pond.id} className="map-name" aria-hidden="true"
      data-selected={pond.id === selected}
      style={{ left: offsetX + positions[i][0] * scale, top: offsetY + (positions[i][1] + (pond.built ? -72 : 32)) * scale }}>
      {pond.name}
    </span>)}
    </div>
  );
}
