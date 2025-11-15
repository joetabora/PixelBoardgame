import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";

/**
 * PixelGrid renders a blocky, retro-inspired pixel canvas using div elements.
 * Pointer events are used so users can click or drag to paint multiple pixels.
 * Particle bursts are drawn on a transparent canvas layered above the grid.
 *
 * The component also shows hover tooltips indicating which player last painted
 * a pixel, fading them out shortly after the cursor leaves the cell.
 */
const PixelGrid = forwardRef(({ board, owners, onPaint, canDraw = true }, ref) => {
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [hoverInfo, setHoverInfo] = useState(null);
  const wrapperRef = useRef(null);
  const gridRef = useRef(null);
  const particleCanvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationFrameRef = useRef(null);
  const hideHoverTimeoutRef = useRef(null);

  const createNeonColor = useCallback((hex) => {
    if (!hex || typeof hex !== "string") {
      return "rgba(255, 255, 255, 0.75)";
    }
    const value = hex.replace("#", "");
    if (value.length !== 6) {
      return hex;
    }
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    const neonBoost = 35;
    const neonColor = `rgba(${Math.min(r + neonBoost, 255)}, ${Math.min(
      g + neonBoost,
      255
    )}, ${Math.min(b + neonBoost, 255)}, 0.9)`;
    return neonColor;
  }, []);

  const spawnParticles = useCallback(
    (x, y, color) => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const columns = board[0]?.length ?? 0;
      const rows = board.length ?? 0;
      if (!columns || !rows) return;

      const width = wrapper.clientWidth;
      const height = wrapper.clientHeight;
      if (!width || !height) return;

      const originX = ((x + 0.5) / columns) * width;
      const originY = ((y + 0.5) / rows) * height;
      const particleColor = createNeonColor(color);

      const newParticles = Array.from({ length: 14 }, () => ({
        x: originX,
        y: originY,
        vx: (Math.random() - 0.5) * 220,
        vy: (Math.random() - 0.5) * 220 - 80,
        life: 0.45,
        maxLife: 0.45,
        color: particleColor,
        size: 4 + Math.random() * 3
      }));

      particlesRef.current = [...particlesRef.current, ...newParticles];
    },
    [board, createNeonColor]
  );

  useImperativeHandle(
    ref,
    () => ({
      /**
       * Allows parent components to trigger a particle burst at a grid coordinate.
       */
      burstAt(x, y, color) {
        spawnParticles(x, y, color);
      }
    }),
    [spawnParticles]
  );

  useEffect(() => {
    const stopPainting = () => setIsPointerDown(false);
    window.addEventListener("pointerup", stopPainting);
    window.addEventListener("pointercancel", stopPainting);
    return () => {
      window.removeEventListener("pointerup", stopPainting);
      window.removeEventListener("pointercancel", stopPainting);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (hideHoverTimeoutRef.current) {
        clearTimeout(hideHoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return undefined;

    const resize = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      canvas.width = wrapper.clientWidth;
      canvas.height = wrapper.clientHeight;
    };

    resize();
    const Observer = typeof ResizeObserver !== "undefined" ? ResizeObserver : null;
    const observer = Observer ? new Observer(resize) : null;
    if (observer && wrapperRef.current) {
      observer.observe(wrapperRef.current);
    } else {
      window.addEventListener("resize", resize);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      } else {
        window.removeEventListener("resize", resize);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let lastTime = performance.now();

    const render = (timestamp) => {
      const delta = Math.min((timestamp - lastTime) / 1000, 0.032);
      lastTime = timestamp;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter((particle) => {
        const nextLife = particle.life - delta;
        if (nextLife <= 0) {
          return false;
        }
        particle.life = nextLife;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.vy += 320 * delta;

        const intensity = particle.life / particle.maxLife;
        ctx.globalAlpha = Math.max(intensity, 0);
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * (intensity + 0.25), 0, Math.PI * 2);
        ctx.fill();
        return true;
      });

      ctx.globalAlpha = 1;
      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const pointToCell = (event) => {
    const canvas = wrapperRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const columns = board[0]?.length ?? 0;
    const rows = board.length ?? 0;
    if (!columns || !rows) return null;

    const x = Math.floor(((event.clientX - rect.left) / width) * columns);
    const y = Math.floor(((event.clientY - rect.top) / height) * rows);

    if (x < 0 || y < 0 || x >= columns || y >= rows) {
      return null;
    }
    return { x, y, columns, rows, rect };
  };

  const showHover = useCallback((cell) => {
    if (hideHoverTimeoutRef.current) {
      clearTimeout(hideHoverTimeoutRef.current);
      hideHoverTimeoutRef.current = null;
    }
    if (!cell) {
      setHoverInfo(null);
      return;
    }
    const { x, y, columns, rows, rect } = cell;
    const owner = owners?.[y]?.[x];
    if (!owner) {
      setHoverInfo(null);
      return;
    }
    const width = rect.width;
    const height = rect.height;
    const left = ((x + 0.5) / columns) * width;
    const top = ((y + 0.5) / rows) * height;

    setHoverInfo({
      left,
      top,
      username: owner
    });
  }, [owners]);

  const scheduleHoverHide = useCallback(() => {
    if (hideHoverTimeoutRef.current) {
      clearTimeout(hideHoverTimeoutRef.current);
    }
    hideHoverTimeoutRef.current = setTimeout(() => {
      setHoverInfo(null);
    }, 800);
  }, []);

  const handlePointerDown = (event, x, y) => {
    event.preventDefault();
    if (!canDraw) return;
    setIsPointerDown(true);
    onPaint(x, y);
    const cell = pointToCell(event) ?? {
      x,
      y,
      columns: board[0]?.length ?? 0,
      rows: board.length ?? 0,
      rect: wrapperRef.current?.getBoundingClientRect() ?? { width: 1, height: 1 }
    };
    showHover(cell);
  };

  const handlePointerEnter = (event, x, y) => {
    event.preventDefault();
    const cell = pointToCell(event);
    if (cell) {
      showHover(cell);
      if (isPointerDown && canDraw) {
        onPaint(cell.x, cell.y);
      }
    }
  };

  const handlePointerMove = (event) => {
    const cell = pointToCell(event);
    if (cell) {
      showHover(cell);
      if (isPointerDown && canDraw) {
        onPaint(cell.x, cell.y);
      }
    } else {
      scheduleHoverHide();
    }
  };

  const handlePointerLeave = () => {
    scheduleHoverHide();
  };

  return (
    <div ref={wrapperRef} className="pixel-grid-wrapper" onPointerLeave={handlePointerLeave}>
      <div
        ref={gridRef}
        className="pixel-grid"
        style={{ gridTemplateColumns: `repeat(${board[0]?.length ?? 0}, 1fr)` }}
        onContextMenu={(event) => event.preventDefault()}
        onPointerMove={handlePointerMove}
      >
        {board.map((row, y) =>
          row.map((color, x) => (
            <button
              key={`${x}-${y}`}
              type="button"
              className={`pixel-cell ${color ? "filled" : "empty"} ${!canDraw ? "disabled" : ""}`}
              style={{ backgroundColor: color || "transparent" }}
              onPointerDown={(event) => handlePointerDown(event, x, y)}
              onPointerEnter={(event) => handlePointerEnter(event, x, y)}
              onPointerUp={() => setIsPointerDown(false)}
              disabled={!canDraw}
              aria-label={`Pixel ${x + 1}, ${y + 1}`}
            >
              <span className="sr-only">
                Pixel {x + 1}, {y + 1}
              </span>
            </button>
          ))
        )}
      </div>
      <canvas ref={particleCanvasRef} className="particle-layer" />
      {hoverInfo ? (
        <div
          className="pixel-tooltip"
          style={{ left: `${hoverInfo.left}px`, top: `${hoverInfo.top}px` }}
        >
          {hoverInfo.username}
        </div>
      ) : null}
    </div>
  );
});

export default PixelGrid;

