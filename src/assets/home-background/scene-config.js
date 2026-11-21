// All coordinates belong to the supplied photograph, never the viewport.
export const SOURCE = Object.freeze({ width: 1672, height: 941 });
export const MOTION = Object.freeze({ fps: 30, maxPixelShift: 7.5, leafFieldScale: 1.25, fadeSeconds: 1.2 });
export const STEAM = Object.freeze({ left: 1024, right: 1145, top: 178, bottom: 398 });

// Smooth influence fields, not hard-edged leaf cutouts. Values are source pixels.
// [center x, center y, radius x, radius y, angle radians, phase, amplitude]
export const LEAVES = Object.freeze([
  [1237, 266, 48, 21, -0.43, 0.2, 5.8],
  [1270, 299, 39, 26, -0.67, 1.8, 4.5],
  [1305, 213, 48, 14, 0.22, 0.8, 7.0],
  [1347, 220, 26, 21, -0.12, 2.7, 5.8],
  [1326, 267, 41, 24, -0.22, 3.8, 3.5],
  [1365, 298, 29, 22, 0.2, 1.3, 3.2],
  [1319, 337, 29, 42, 0.34, 4.5, 4.8],
  [1415, 361, 34, 43, -0.25, 3.2, 4.5],
  [1438, 300, 44, 27, 0.54, 5.1, 6.0],
  [1495, 396, 32, 23, 0.45, 2.1, 6.8]
]);
