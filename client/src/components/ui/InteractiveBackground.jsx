import { useEffect, useRef } from 'react';

export default function InteractiveBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let polygons = [];
    let mouse = { x: null, y: null };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initPolygons();
    };

    const initPolygons = () => {
      polygons = [];
      // Calculate how many polygons based on screen size, increased density slightly for smaller shapes
      const count = Math.min(30, Math.floor((canvas.width * canvas.height) / 50000));
      for (let i = 0; i < count; i++) {
        polygons.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: Math.random() * 200 + 15, // Any size from 15px to 365px
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.01,
          sides: Math.floor(Math.random() * 6) + 3, // 3 to 8 sides (triangle to octagon)
          isCircle: Math.random() > 0.8, // 20% chance to be a perfect circle
          opacity: Math.random() * 0.1 + 0.01, // Very low opacity (0.01 - 0.11)
        });
      }
    };

    const onMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const onMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < polygons.length; i++) {
        const p = polygons[i];

        // Move and rotate
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Wrap around screen smoothly
        if (p.x < -p.radius * 2) p.x = canvas.width + p.radius * 2;
        if (p.x > canvas.width + p.radius * 2) p.x = -p.radius * 2;
        if (p.y < -p.radius * 2) p.y = canvas.height + p.radius * 2;
        if (p.y > canvas.height + p.radius * 2) p.y = -p.radius * 2;

        // Subtle parallax effect: push polygons away from mouse very slightly
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 400) {
            const force = (400 - dist) / 400; // 0 to 1
            p.x -= (dx / dist) * force * 1.5;
            p.y -= (dy / dist) * force * 1.5;
          }
        }

        // Draw shape
        ctx.beginPath();
        if (p.isCircle) {
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        } else {
          for (let j = 0; j < p.sides; j++) {
            const angle = p.rotation + (j * Math.PI * 2) / p.sides;
            const px = p.x + Math.cos(angle) * p.radius;
            const py = p.y + Math.sin(angle) * p.radius;

            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
        }
        ctx.closePath();

        // Fill and stroke
        ctx.fillStyle = `rgba(34, 197, 94, ${p.opacity})`; // Green fill
        ctx.fill();
        
        ctx.strokeStyle = `rgba(134, 239, 172, ${p.opacity * 2})`; // Light Green border
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);

    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden isolate">
      {/* Background ambient glow to anchor the scene */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
      <canvas
        ref={canvasRef}
        className="block w-full h-full mix-blend-screen"
      />
    </div>
  );
}
