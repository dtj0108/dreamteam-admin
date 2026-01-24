'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  Building2,
  Flag,
  Key,
  BarChart3,
  ScrollText,
  Settings,
  Shield,
  LogOut,
  Bot,
  Plug,
  Wrench,
  BookOpen,
  GraduationCap,
  Zap,
  Calendar,
  UsersRound,
  CreditCard,
  Cpu,
  FlaskConical,
  Brain
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/workspaces', label: 'Workspaces', icon: Building2 },
  { href: '/admin/feature-flags', label: 'Feature Flags', icon: Flag },
  { href: '/admin/api-keys', label: 'API Keys', icon: Key },
  { href: '/admin/model-providers', label: 'Model Providers', icon: Cpu },
  { href: '/admin/testing', label: 'Testing', icon: FlaskConical },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

const agentBuilderItems = [
  { href: '/admin/agents', label: 'Agents', icon: Bot },
  { href: '/admin/teams', label: 'Teams', icon: UsersRound },
  { href: '/admin/plans', label: 'Plans', icon: CreditCard },
  { href: '/admin/scheduled-tasks', label: 'Scheduled Tasks', icon: Calendar },
  { href: '/admin/memory', label: 'Memory', icon: Brain },
  { href: '/admin/skills', label: 'Skills', icon: BookOpen },
  { href: '/admin/tools', label: 'Tools', icon: Wrench },
  { href: '/admin/mcp', label: 'MCP Integrations', icon: Plug },
  { href: '/admin/teachings', label: 'Teachings', icon: GraduationCap },
  { href: '/admin/teaching-patterns', label: 'Learning Patterns', icon: Zap },
]

interface AdminSidebarProps {
  user: {
    email: string
    name?: string | null
  }
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-muted/30">
      <div className="flex items-center gap-2 border-b px-6 py-4">
        <Shield className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">Admin Panel</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="mt-6">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Agent Builder
          </p>
          <div className="space-y-1">
            {agentBuilderItems.map((item) => {
              const isActive = pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      <div className="border-t p-4">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium truncate">{user.name || user.email}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
