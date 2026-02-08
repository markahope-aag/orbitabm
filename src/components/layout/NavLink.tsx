'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavLinkProps {
  href: string
  children: React.ReactNode
}

export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <li>
      <Link
        href={href}
        className={`
          flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
          ${isActive
            ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
            : 'text-navy-300 hover:text-white hover:bg-navy-800'
          }
        `}
      >
        {children}
      </Link>
    </li>
  )
}
