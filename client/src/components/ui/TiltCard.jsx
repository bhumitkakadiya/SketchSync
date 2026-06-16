import React, { useRef, useState, useMemo } from 'react';

const STUDY_ICONS = [
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.17 3.22a2.41 2.41 0 00-3.41 0L3.22 17.76a2.41 2.41 0 000 3.41 2.41 2.41 0 003.41 0L21.17 6.63a2.41 2.41 0 000-3.41zM18.8 8.4l-1.4-1.4M15.4 11.8l-1.4-1.4M12 15.2l-1.4-1.4"/></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 7l4 12M12 7L8 19M5 16c0 0 3 3 7 3s7-3 7-3"/></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v12l-4 4H4V4z"/><path d="M16 16v4"/><path d="M4 8h16"/><path d="M4 12h10"/></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
];

export default function TiltCard({ children, className = '' }) {
  const cardRef = useRef(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // Pick random icons for this specific card
  const iconIndices = useMemo(() => {
    return [
      Math.floor(Math.random() * STUDY_ICONS.length),
      Math.floor(Math.random() * STUDY_ICONS.length),
      Math.floor(Math.random() * STUDY_ICONS.length)
    ];
  }, []);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate rotation based on cursor position relative to the center of the card
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -4; // Max tilt 4deg
    const rotateY = ((x - centerX) / centerX) * 4;

    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseEnter = () => setIsHovering(true);
  
  const handleMouseLeave = () => {
    setIsHovering(false);
    setRotation({ x: 0, y: 0 }); // Reset to flat
  };

  return (
    <div className={`perspective-1000 ${className}`}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="preserve-3d w-full h-full will-change-transform"
        style={{
          transform: isHovering 
            ? `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` 
            : 'rotateX(0deg) rotateY(0deg)',
          transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      >
        <div className="w-full h-full relative" style={{ transform: 'translateZ(30px)' }}>
          {/* Subtle background icons layer */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl z-0 pointer-events-none transition-opacity duration-300 opacity-50 group-hover:opacity-100">
             <div className="absolute -top-4 -right-4 w-24 h-24 text-brand-500/20 dark:text-brand-500/10 rotate-12">{STUDY_ICONS[iconIndices[0]]}</div>
             <div className="absolute -bottom-6 -left-2 w-32 h-32 text-brand-500/20 dark:text-brand-500/10 -rotate-45">{STUDY_ICONS[iconIndices[1]]}</div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 text-brand-500/10 dark:text-brand-500/5 rotate-[30deg]">{STUDY_ICONS[iconIndices[2]]}</div>
          </div>
          
          <div className="relative z-10 w-full h-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
