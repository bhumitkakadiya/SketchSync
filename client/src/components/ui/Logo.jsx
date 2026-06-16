export default function Logo({ className = "w-8 h-8" }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#84cc16" />
        </linearGradient>
      </defs>
      <rect x="15" y="20" width="55" height="70" rx="8" className="fill-white dark:fill-black" stroke="url(#logo-gradient)" strokeWidth="6" />
      <path d="M25 35H55M25 50H55M25 65H40" stroke="url(#logo-gradient)" strokeWidth="6" strokeLinecap="round" />
      <path d="M90 15L65 40L55 55L65 45L90 20C92.7614 17.2386 92.7614 12.7614 90 10C87.2386 7.23858 82.7614 7.23858 80 10L60 30" fill="url(#logo-gradient)" stroke="url(#logo-gradient)" strokeWidth="6" strokeLinejoin="round" />
      <path d="M55 55L50 60" stroke="url(#logo-gradient)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="85" cy="15" r="2" fill="url(#logo-gradient)" />
    </svg>
  );
}
