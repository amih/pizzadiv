// Subitizing layout patterns — normalized (0-1) coordinates for counts 1-10
// Each pattern is an array of {x, y} positions
const SUBITIZE_PATTERNS = {
  1: [{x: 0.5, y: 0.5}],
  2: [{x: 0.3, y: 0.5}, {x: 0.7, y: 0.5}],
  3: [{x: 0.5, y: 0.25}, {x: 0.25, y: 0.72}, {x: 0.75, y: 0.72}],
  4: [{x: 0.28, y: 0.28}, {x: 0.72, y: 0.28}, {x: 0.28, y: 0.72}, {x: 0.72, y: 0.72}],
  5: [
    {x: 0.25, y: 0.22}, {x: 0.75, y: 0.22},
    {x: 0.5, y: 0.5},
    {x: 0.25, y: 0.78}, {x: 0.75, y: 0.78}
  ],
  6: [
    {x: 0.3, y: 0.2}, {x: 0.7, y: 0.2},
    {x: 0.3, y: 0.5}, {x: 0.7, y: 0.5},
    {x: 0.3, y: 0.8}, {x: 0.7, y: 0.8}
  ],
  7: [
    {x: 0.22, y: 0.2}, {x: 0.5, y: 0.2}, {x: 0.78, y: 0.2},
    {x: 0.5, y: 0.5},
    {x: 0.22, y: 0.8}, {x: 0.5, y: 0.8}, {x: 0.78, y: 0.8}
  ],
  8: [
    {x: 0.18, y: 0.3}, {x: 0.39, y: 0.3}, {x: 0.61, y: 0.3}, {x: 0.82, y: 0.3},
    {x: 0.18, y: 0.7}, {x: 0.39, y: 0.7}, {x: 0.61, y: 0.7}, {x: 0.82, y: 0.7}
  ],
  9: [
    {x: 0.22, y: 0.2}, {x: 0.5, y: 0.2}, {x: 0.78, y: 0.2},
    {x: 0.22, y: 0.5}, {x: 0.5, y: 0.5}, {x: 0.78, y: 0.5},
    {x: 0.22, y: 0.8}, {x: 0.5, y: 0.8}, {x: 0.78, y: 0.8}
  ],
  10: [
    {x: 0.5, y: 0.1},
    {x: 0.35, y: 0.32}, {x: 0.65, y: 0.32},
    {x: 0.22, y: 0.56}, {x: 0.5, y: 0.56}, {x: 0.78, y: 0.56},
    {x: 0.14, y: 0.82}, {x: 0.38, y: 0.82}, {x: 0.62, y: 0.82}, {x: 0.86, y: 0.82}
  ]
};

// Position children of a container using subitizing pattern
// container: DOM element (position: relative)
// count: number of children to position
// itemSize: size of each item in px (used to center them on their positions)
function applyPattern(container, count, itemSize) {
  const pattern = SUBITIZE_PATTERNS[count] || SUBITIZE_PATTERNS[Math.min(count, 10)];
  if (!pattern) return;
  const children = Array.from(container.children);
  children.forEach((child, i) => {
    if (i >= pattern.length) return;
    const pos = pattern[i];
    child.style.position = 'absolute';
    child.style.left = `calc(${pos.x * 100}% - ${itemSize / 2}px)`;
    child.style.top = `calc(${pos.y * 100}% - ${itemSize / 2}px)`;
  });
}
