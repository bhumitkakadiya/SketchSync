import { useEffect, useRef } from 'react';

function drawRoundedStar(ctx, cx, cy, size) {
  ctx.beginPath();
  // Start at top point
  ctx.moveTo(cx, cy - size);
  // Curve to right point, using center as control point
  ctx.quadraticCurveTo(cx, cy, cx + size, cy);
  // Curve to bottom point
  ctx.quadraticCurveTo(cx, cy, cx, cy + size);
  // Curve to left point
  ctx.quadraticCurveTo(cx, cy, cx - size, cy);
  // Curve back to top point
  ctx.quadraticCurveTo(cx, cy, cx, cy - size);
  ctx.closePath();
}

export default function DashboardBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    let animationFrameId;
    let particles = [];
    
    let isDark = document.documentElement.classList.contains('dark');
    const observer = new MutationObserver(() => {
      isDark = document.documentElement.classList.contains('dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 12000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 4 + 2,
          baseAlpha: Math.random() * 0.5 + 0.3,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const dotColor = isDark ? '34, 197, 94' : '16, 185, 129';
      const lineColor = isDark ? '34, 197, 94' : '16, 185, 129';

      ctx.lineWidth = 1.0;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 150) {
            const alpha = ((150 - dist) / 150) * (isDark ? 0.35 : 0.5);
            ctx.strokeStyle = `rgba(${lineColor}, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.phase += 0.02;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        const currentAlpha = p.baseAlpha + Math.sin(p.phase) * 0.3;
        const boundedAlpha = Math.max(0.1, Math.min(1, currentAlpha));

        ctx.fillStyle = `rgba(${dotColor}, ${boundedAlpha})`;
        drawRoundedStar(ctx, p.x, p.y, p.size * 1.5);
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = `rgba(${dotColor}, 0.8)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
    };
  }, []);

  return (
    <div 
      className="absolute inset-x-0 top-0 h-[75vh] z-0 pointer-events-none opacity-60 dark:opacity-100 mix-blend-normal dark:mix-blend-screen"
      style={{
        maskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-teal-500/10 dark:from-brand-500/15 dark:via-transparent dark:to-teal-500/15" />
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
