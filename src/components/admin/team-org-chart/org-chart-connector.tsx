import type { OrgChartNode, OrgChartConnection } from './types'

interface OrgChartConnectorProps {
  connection: OrgChartConnection
  nodes: Map<string, OrgChartNode>
  isBidirectional?: boolean
}

export function OrgChartConnector({
  connection,
  nodes,
  isBidirectional = false,
}: OrgChartConnectorProps) {
  const fromNode = nodes.get(connection.fromId)
  const toNode = nodes.get(connection.toId)

  if (!fromNode || !toNode) return null

  // Calculate connection points
  const fromX = fromNode.x + fromNode.width / 2
  const fromY = fromNode.y + fromNode.height
  const toX = toNode.x + toNode.width / 2
  const toY = toNode.y

  // For hierarchy connections (head to member), use orthogonal routing
  if (connection.type === 'hierarchy') {
    const midY = fromY + (toY - fromY) / 2
    const path = `M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`

    return (
      <path
        d={path}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth={2}
        className="transition-colors"
      />
    )
  }

  // For delegation connections, use curved paths with arrows
  // Calculate offset for bidirectional connections to prevent overlap
  const offset = isBidirectional ? 20 : 0

  // Determine if this is a "forward" or "backward" delegation for curve direction
  const isReverse = fromNode.x > toNode.x

  // For delegations between members, draw curved lines on the side
  // Connect from bottom-right of source to bottom-left of target (or vice versa)
  const sourceX = isReverse
    ? fromNode.x + (isBidirectional ? offset : 0)
    : fromNode.x + fromNode.width - (isBidirectional ? offset : 0)
  const sourceY = fromNode.y + fromNode.height * 0.7
  const targetX = isReverse
    ? toNode.x + toNode.width - (isBidirectional ? offset : 0)
    : toNode.x + (isBidirectional ? offset : 0)
  const targetY = toNode.y + toNode.height * 0.7

  // Calculate control points for curved path
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const curvature = Math.min(Math.abs(dx) * 0.3, 60)

  // Curve below for delegations (to keep the chart clean)
  const controlY1 = sourceY + curvature
  const controlY2 = targetY + curvature

  const path = `M ${sourceX} ${sourceY} C ${sourceX} ${controlY1}, ${targetX} ${controlY2}, ${targetX} ${targetY}`

  // Calculate midpoint for label
  const labelX = (sourceX + targetX) / 2
  const labelY = Math.max(sourceY, targetY) + curvature * 0.6

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeDasharray="6 4"
        markerEnd="url(#delegation-arrow)"
        className="transition-colors"
      />
      {connection.label && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          className="text-xs fill-muted-foreground"
        >
          {connection.label.length > 20
            ? connection.label.substring(0, 20) + '...'
            : connection.label}
        </text>
      )}
    </g>
  )
}

export function OrgChartConnectorDefs() {
  return (
    <defs>
      <marker
        id="delegation-arrow"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
      </marker>
    </defs>
  )
}
