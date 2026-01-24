'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bot, Wrench, Calendar, Cpu, ArrowRight } from 'lucide-react'

const quickActions = [
  {
    type: 'agent' as const,
    label: 'Test Agent',
    description: 'Interactive chat testing with any agent',
    icon: Bot,
    href: '/admin/testing/agents',
    color: 'text-blue-600'
  },
  {
    type: 'tool' as const,
    label: 'Test Tools',
    description: 'Validate schemas and run MCP execution tests',
    icon: Wrench,
    href: '/admin/testing/tools',
    color: 'text-orange-600'
  },
  {
    type: 'schedule' as const,
    label: 'Test Schedule',
    description: 'Run schedules and test notifications',
    icon: Calendar,
    href: '/admin/testing/schedules',
    color: 'text-purple-600'
  },
  {
    type: 'provider' as const,
    label: 'Test Provider',
    description: 'Verify API key connectivity',
    icon: Cpu,
    href: '/admin/testing/providers',
    color: 'text-green-600'
  }
]

export function QuickTestPanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.type} href={action.href}>
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex flex-col items-start gap-2 hover:border-primary/50"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Icon className={`h-5 w-5 ${action.color}`} />
                    <span className="font-medium">{action.label}</span>
                    <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground text-left font-normal">
                    {action.description}
                  </span>
                </Button>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
