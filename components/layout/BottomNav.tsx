'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Users, Settings, LucideIcon } from 'lucide-react'
import { Role } from '@prisma/client'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  adminOnly?: boolean
}

const allNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/meetings', label: 'Meetings', icon: Calendar },
  { href: '/members', label: 'Members', icon: Users, adminOnly: true },
  { href: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
]

export default function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname()

  const navItems = allNavItems.filter(item =>
    !item.adminOnly || role === 'ADMIN'
  )

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <div className="flex items-center justify-around max-w-[428px] mx-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 min-w-[64px] py-1 transition-colors duration-150"
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={`w-[22px] h-[22px] transition-colors duration-150 ${
                  isActive ? 'text-ios-blue' : 'text-ios-gray'
                }`}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span className={`text-[10px] leading-none mt-0.5 transition-colors duration-150 ${
                isActive ? 'text-ios-blue font-semibold' : 'text-ios-gray font-medium'
              }`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
