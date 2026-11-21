import { PhotoRenderer } from './background-renderer.js';
import { MOTION, SOURCE } from './scene-config.js';

// Keep the supplied procedural motion continuous: no restart, fade-out or
// time wrap that could introduce a visible seam.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const forcedColors = matchMedia('(forced-colors: active)');
const home = document.querySelector('body.home-page');

// CSS background lists contain commas inside gradients and color functions.
function layers(value) {
  let depth = 0;
  let start = 0;
  const parts = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    if (value[i] === ')') depth--;
    if (value[i] === ',' && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts;
}

async function animateBackground() {
  if (!home || reducedMotion.matches || forcedColors.matches) return;
  const image = new Image();
  image.src = '/assets/tcl-homepage-background.webp';
  try { await image.decode(); } catch { return; }
  if (reducedMotion.matches || forcedColors.matches) return;

  const scene = document.createElement('div');
  scene.className = 'home-background-animation';
  scene.setAttribute('aria-hidden', 'true');
  scene.inert = true;
  scene.hidden = true;
  const canvas = document.createElement('canvas');
  const shade = document.createElement('div');
  shade.className = 'home-background-shade';
  scene.append(canvas, shade);
  home.append(scene);

  let renderer;
  let frame = 0;
  let elapsed = 0;
  let previousFrame;
  let lastDraw = -Infinity;
  let visible = false;
  let finished = false;
  let observer;
  let resizeObserver;

  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    resizeObserver?.disconnect();
    document.removeEventListener('visibilitychange', visibilityChanged);
    reducedMotion.removeEventListener('change', preferenceChanged);
    forcedColors.removeEventListener('change', preferenceChanged);
    window.removeEventListener('pagehide', finish);
    canvas.removeEventListener('webglcontextlost', finish);
    scene.remove();
    renderer?.destroy();
  }

  function align() {
    const styles = getComputedStyle(home);
    const images = layers(styles.backgroundImage);
    const sizes = layers(styles.backgroundSize);
    const positions = layers(styles.backgroundPosition);
    const imageIndex = images.length - 1;
    if (!images[imageIndex]?.includes('tcl-homepage-background.webp')) {
      finish();
      return;
    }
    const position = positions[imageIndex % positions.length];
    scene.style.backgroundImage = images[imageIndex];
    scene.style.backgroundSize = sizes[imageIndex % sizes.length];
    scene.style.backgroundPosition = position;
    // Reuse the host's computed gradients above both the photo and effects.
    // The host's image, background styles and foreground are never modified.
    shade.style.backgroundImage = images.slice(0, -1).join(', ');
    shade.style.backgroundSize = images.slice(0, -1).map((_, i) => sizes[i % sizes.length]).join(', ');
    shade.style.backgroundPosition = images.slice(0, -1).map((_, i) => positions[i % positions.length]).join(', ');
    const width = scene.getBoundingClientRect().height * SOURCE.width / SOURCE.height;
    const scale = width / SOURCE.width;
    const left = (scene.getBoundingClientRect().width - width) * parseFloat(position) / 100;
    canvas.style.width = `${width}px`;
    canvas.style.left = `${left}px`;
    // Only the union of the shader's three effect fields may cover the host.
    const outline = [[1024,178],[1145,178],[1145,277],[1160,277],[1160,180],[1550,180],[1550,440],[1339,440],[1339,542],[1090,542],[1090,398],[1024,398]];
    scene.style.clipPath = `polygon(${outline.map(([x, y]) => `${left + x * scale}px ${y * scale}px`).join(', ')})`;
  }

  function draw(now) {
    frame = 0;
    if (finished || !visible || document.hidden) return;
    if (previousFrame !== undefined) elapsed += now - previousFrame;
    previousFrame = now;
    if (now - lastDraw >= 1000 / MOTION.fps) {
      const fade = MOTION.fadeSeconds * 1000;
      const amount = Math.min(1, elapsed / fade);
      const smooth = amount * amount * (3 - 2 * amount);
      try { renderer.render(elapsed / 1000, smooth); } catch { finish(); return; }
      lastDraw = now;
    }
    frame = requestAnimationFrame(draw);
  }

  function visibilityChanged() {
    cancelAnimationFrame(frame);
    frame = 0;
    // Freeze the scene's clock while suspended so returning to it stays smooth.
    previousFrame = undefined;
    if (!finished && visible && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function preferenceChanged() {
    if (reducedMotion.matches || forcedColors.matches) finish();
  }

  try {
    renderer = new PhotoRenderer(canvas, image);
    scene.hidden = false;
    align();
    if (finished) return;
    observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      visibilityChanged();
    });
    observer.observe(scene);
    resizeObserver = new ResizeObserver(align);
    resizeObserver.observe(scene);
    document.addEventListener('visibilitychange', visibilityChanged);
    reducedMotion.addEventListener('change', preferenceChanged);
    forcedColors.addEventListener('change', preferenceChanged);
    window.addEventListener('pagehide', finish, { once: true });
    canvas.addEventListener('webglcontextlost', finish, { once: true });
  } catch { finish(); }
}

animateBackground();
