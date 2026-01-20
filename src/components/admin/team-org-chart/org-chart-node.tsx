import { Badge } from '@/components/ui/badge'
import { Crown } from 'lucide-react'
import type { OrgChartNode } from './types'

interface OrgChartNodeProps {
  node: OrgChartNode
  onClick?: () => void
}

export function OrgChartNodeComponent({ node, onClick }: OrgChartNodeProps) {
  const modelBadgeClasses = node.model.includes('haiku')
    ? 'border-green-500 text-green-600'
    : node.model.includes('sonnet')
    ? 'border-blue-500 text-blue-600'
    : node.model.includes('opus')
    ? 'border-purple-500 text-purple-600'
    : ''

  const modelLabel = node.model.split('-').pop() || node.model

  if (node.isHead) {
    return (
      <div
        className="absolute flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-primary bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
        style={{
          left: node.x,
          top: node.y,
          width: node.width,
        }}
        onClick={onClick}
      >
        <div className="relative">
          {node.avatarUrl ? (
            <img
              src={node.avatarUrl}
              alt={node.name}
              className="h-12 w-12 rounded-full"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {node.name.charAt(0).toUpperCase()}
            </div>
          )}
          <Crown className="h-4 w-4 text-yellow-500 absolute -top-1 -right-1" />
        </div>
        <span className="font-medium text-sm text-center">{node.name}</span>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className={`text-xs ${modelBadgeClasses}`}>
            {modelLabel}
          </Badge>
          {!node.isEnabled && (
            <Badge variant="secondary" className="text-xs">
              Disabled
            </Badge>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="absolute flex flex-col items-center gap-2 p-3 rounded-lg border bg-card cursor-pointer hover:bg-muted transition-colors"
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
      }}
      onClick={onClick}
    >
      {node.avatarUrl ? (
        <img
          src={node.avatarUrl}
          alt={node.name}
          className="h-10 w-10 rounded-full"
        />
      ) : (
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-medium">
          {node.name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="font-medium text-sm text-center">{node.name}</span>
      <div className="flex items-center gap-1">
        <Badge variant="outline" className={`text-xs ${modelBadgeClasses}`}>
          {modelLabel}
        </Badge>
        {!node.isEnabled && (
          <Badge variant="secondary" className="text-xs">
            Disabled
          </Badge>
        )}
      </div>
    </div>
  )
}
