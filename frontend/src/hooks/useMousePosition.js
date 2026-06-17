// What this file does: smoothed mouse position hook using requestAnimationFrame lerp
// Returns a cursorPos {x, y} that eases toward the actual mouse at 10% per frame
import { useState, useEffect, useRef } from 'react';

export function useMousePosition() {
  // mouse: raw target position; smooth: lerped display position
  const mouse  = useRef({ x: -999, y: -999 });
  const smooth = useRef({ x: -999, y: -999 });
  const rafRef = useRef(null);

  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 });

  useEffect(() => {
    // Store the raw mouse position on every move
    function handleMove(e) {
      mouse.current = { x: e.clientX, y: e.clientY };
    }

    // Lerp smooth toward mouse every animation frame, then sync to state
    function animate() {
      smooth.current.x += (mouse.current.x - smooth.current.x) * 0.1;
      smooth.current.y += (mouse.current.y - smooth.current.y) * 0.1;
      setCursorPos({ x: smooth.current.x, y: smooth.current.y });
      rafRef.current = requestAnimationFrame(animate);
    }

    window.addEventListener('mousemove', handleMove);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return cursorPos;
}
