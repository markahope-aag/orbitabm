'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavLinkProps {
  href: string
  children: React.ReactNode
  variant?: 'default' | 'magenta'
}

const variants = {
  default: {
    active: 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25',
    inactive: 'text-navy-300 hover:text-white hover:bg-navy-800',
  },
  magenta: {
    active: 'bg-navy-800 text-fuchsia-300',
    inactive: 'text-fuchsia-300 hover:text-white hover:bg-navy-800',
  },
}

export function NavLink({ href, children, variant = 'default' }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href
  const colors = variants[variant]

  return (
    <li>
      <Link
        href={href}
        className={`
          flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
          ${isActive ? colors.active : colors.inactive}
        `}
      >
        {children}
      </Link>
    </li>
  )
}
