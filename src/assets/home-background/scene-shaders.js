import { LEAVES, MOTION } from './scene-config.js';

export const vertexShader = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = vec2((a_position.x + 1.0) * 0.5, (1.0 - a_position.y) * 0.5);
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

export const fragmentShader = `
precision highp float;
uniform sampler2D u_image;
uniform float u_time;
uniform float u_amount;
varying vec2 v_uv;
const vec2 SIZE = vec2(1672.0, 941.0);

vec3 photo(vec2 p) { return texture2D(u_image, p / SIZE).rgb; }
float ellipse(vec2 p, vec2 c, vec2 r, float angle) {
  vec2 d = p - c;
  float co = cos(angle), si = sin(angle);
  d = vec2(co*d.x + si*d.y, -si*d.x + co*d.y) / r;
  return 1.0 - smoothstep(0.2, 1.0, dot(d, d));
}
vec2 leaf(vec2 p, vec2 c, vec2 r, float a, float phase, float amplitude) {
  // Reach beyond the photographed silhouette so the leaf outline moves too.
  // The former small field mostly shifted interior detail and hid the sway.
  float field = ellipse(p, c, r * ${MOTION.leafFieldScale.toFixed(2)}, a);
  float breeze = sin(u_time * 0.76 + phase) * 0.8
    + sin(u_time * 1.23 + phase * 1.7) * 0.2;
  return field * amplitude * breeze * vec2(1.0, 0.42);
}
float hash(float n) { return fract(sin(n) * 43758.5453); }
float noise(float x) {
  float a = floor(x), f = fract(x);
  return mix(hash(a), hash(a + 1.0), f*f*(3.0 - 2.0*f));
}
float steamRibbon(vec2 p, float phase, float offset) {
  float h = (397.0 - p.y) / 215.0;
  float sway = sin(h * 9.4 - u_time * 0.84 + phase) * (2.0 + h * 17.0);
  sway += sin(h * 16.0 - u_time * 1.18 + phase * 2.0) * h * 7.0;
  sway += sin(u_time * 0.47 + phase) * h * 4.0;
  float x = 1101.0 + offset + sway;
  float width = 1.15 + h * 3.0 + noise(h * 9.0 - u_time * 1.1 + phase) * 1.25;
  float distance = (p.x - x) / width;
  float ribbon = exp(-distance * distance * 0.62);
  float gauze = exp(-distance * distance * 0.08) * 0.16;
  float envelope = smoothstep(0.0, 0.045, h) * (1.0 - smoothstep(0.61, 1.0, h));
  float billow = 0.35 + 0.65 * noise(h * 11.0 - u_time * 1.7 + phase * 4.0);
  return (ribbon + gauze) * envelope * billow;
}
void main() {
  vec2 p = v_uv * SIZE;
  vec3 original = photo(p);
  vec3 color = original;
  float coverage = 0.0;

  // A smooth inverse warp preserves every photographed leaf and its texture.
  // Influence reaches zero at each boundary; the pot and furniture remain fixed.
  if (p.x > 1160.0 && p.x < 1550.0 && p.y > 180.0 && p.y < 440.0) {
    coverage = 1.0;
    vec2 shift = vec2(0.0);
    ${LEAVES.map(([x,y,rx,ry,a,phase,amp]) => `shift += leaf(p, vec2(${x.toFixed(1)}, ${y.toFixed(1)}), vec2(${rx.toFixed(1)}, ${ry.toFixed(1)}), ${a.toFixed(2)}, ${phase.toFixed(2)}, ${amp.toFixed(2)});`).join('\n    ')}
    // Keep the planter and glass stationary even where leaf fields overlap them.
    float planter = smoothstep(1321.0, 1330.0, p.x) * (1.0 - smoothstep(1437.0, 1446.0, p.x));
    shift *= 1.0 - planter * smoothstep(349.0, 363.0, p.y);
    shift *= 1.0 - ellipse(p, vec2(1216.0, 399.0), vec2(83.0, 91.0), 0.0);
    float pictureFrame = smoothstep(1439.0, 1447.0, p.x) * (1.0 - smoothstep(276.0, 284.0, p.y));
    float chairEdge = 1518.0 + (425.0 - p.y) * 1.2;
    float chair = smoothstep(chairEdge - 8.0, chairEdge, p.x) * smoothstep(382.0, 395.0, p.y);
    shift *= (1.0 - pictureFrame) * (1.0 - chair);
    shift = clamp(shift, vec2(-${MOTION.maxPixelShift}), vec2(${MOTION.maxPixelShift}));
    color = photo(p + shift);
  }

  // The original steam is flattened into the photo. Reconstruct only its small
  // wall region from neighboring scanlines, then advect new fine vapor through it.
  if (p.x > 1024.0 && p.x < 1145.0 && p.y > 178.0 && p.y < 398.0) {
    coverage = 1.0;
    float across = clamp((p.x - 1046.0) / 87.0, 0.0, 1.0);
    vec3 wall = mix(photo(vec2(1046.0, p.y)), photo(vec2(1133.0, p.y)), across);
    float feather = smoothstep(1046.0, 1063.0, p.x) * (1.0 - smoothstep(1126.0, 1137.0, p.x));
    feather *= smoothstep(216.0, 233.0, p.y) * (1.0 - smoothstep(394.0, 398.0, p.y));
    float vapor = steamRibbon(p, 0.0, -4.0) * 0.65
      + steamRibbon(p, 1.8, 2.0) * 0.85
      + steamRibbon(p, 3.9, 7.0) * 0.5;
    // Reconstruction remains restricted to the old plume; new vapor can rise
    // higher without replacing the surrounding wall with an interpolated patch.
    color = mix(original, wall, feather) + vec3(0.11, 0.11, 0.095) * vapor;
  }

  // Bounded, continuous brightness drift. No hard flash, pulse or global wash.
  if (p.x > 1090.0 && p.x < 1339.0 && p.y > 277.0 && p.y < 542.0) {
    coverage = 1.0;
    float drift = 0.48*sin(u_time*1.21) + 0.30*sin(u_time*2.07 + 1.2)
      + 0.22*(noise(u_time*2.3 + 31.0)*2.0 - 1.0);
    float glass = ellipse(p, vec2(1216.0, 399.0), vec2(72.0, 78.0), 0.0);
    float halo = ellipse(p, vec2(1213.0, 394.0), vec2(121.0, 115.0), 0.0);
    float reflection = ellipse(p, vec2(1208.0, 518.0), vec2(56.0, 19.0), 0.0);
    // Exposure changes reveal the ribbed amber glass, including darker ribs;
    // a small warm spill follows it on the wall and tabletop.
    color *= 1.0 + glass * drift * 0.18;
    color += drift * (glass*0.025 + halo*0.010 + reflection*0.015) * vec3(1.0, 0.57, 0.16);
  }
  // Transparent everywhere else: the browser displays the actual original file.
  gl_FragColor = vec4(mix(original, color, u_amount) * coverage, coverage);
}`;
