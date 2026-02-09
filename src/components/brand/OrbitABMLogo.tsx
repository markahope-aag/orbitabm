import React from 'react'

interface OrbitABMLogoProps {
  variant?: 'sidebar' | 'header' | 'light'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function OrbitABMLogo({ 
  variant = 'sidebar', 
  size = 'md',
  className = ''
}: OrbitABMLogoProps) {
  const iconSize = {
    sm: 24,
    md: 32,
    lg: 48
  }[size]

  const fontSize = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  }[size]

  // Color variants
  const colors = {
    sidebar: {
      orbit: 'text-orange-500', // Signal Orange for dark sidebar
      abm: 'text-cyan-400',     // Electric Cyan
      icon: '#22d3ee'           // Electric Cyan
    },
    light: {
      orbit: 'text-orange-600', // Darker orange for light backgrounds  
      abm: 'text-cyan-600',     // Darker cyan
      icon: '#0891b2'           // Darker cyan
    },
    header: {
      orbit: 'text-orange-500',
      abm: 'text-cyan-400', 
      icon: '#22d3ee'
    }
  }

  const currentColors = colors[variant]

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Enhanced Orbit Icon */}
      <svg 
        width={iconSize} 
        height={iconSize} 
        viewBox="0 0 48 48" 
        fill="none"
      >
        <circle cx="24" cy="24" r="4" fill={currentColors.icon}/>
        <ellipse 
          cx="24" cy="24" rx="17" ry="7" 
          stroke={currentColors.icon} 
          strokeWidth="2.0" 
          transform="rotate(-20 24 24)" 
          opacity="0.7"
        />
        <ellipse 
          cx="24" cy="24" rx="21" ry="9" 
          stroke={currentColors.icon} 
          strokeWidth="2.5" 
          transform="rotate(25 24 24)" 
          opacity="0.9"
        />
      </svg>
      
      {/* Enhanced Wordmark */}
      <div className={`font-bold tracking-tight ${fontSize}`}>
        <span className={currentColors.orbit}>Orbit</span>
        <span className={currentColors.abm}>ABM</span>
      </div>
    </div>
  )
}
