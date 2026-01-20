'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import { OrgChartNodeComponent } from './org-chart-node'
import { OrgChartConnector, OrgChartConnectorDefs } from './org-chart-connector'
import type { OrgChartProps, OrgChartNode, OrgChartConnection } from './types'
import { AlertTriangle, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Layout constants
const NODE_WIDTH = 120
const HEAD_NODE_HEIGHT = 120
const MEMBER_NODE_HEIGHT = 100
const VERTICAL_GAP = 60
const HORIZONTAL_GAP = 24
const PADDING = 20

interface LayoutResult {
  nodes: OrgChartNode[]
  connections: OrgChartConnection[]
  width: number
  height: number
}

function calculateLayout(
  agents: OrgChartProps['agents'],
  delegations: OrgChartProps['delegations'],
  headAgentId: string | null,
  containerWidth: number
): LayoutResult {
  if (agents.length === 0) {
    return { nodes: [], connections: [], width: 0, height: 0 }
  }

  const nodes: OrgChartNode[] = []
  const connections: OrgChartConnection[] = []

  const headAgent = headAgentId
    ? agents.find((a) => a.id === headAgentId)
    : null
  const memberAgents = agents.filter((a) => a.id !== headAgentId)

  // Calculate available width for member layout
  const availableWidth = Math.max(containerWidth - PADDING * 2, NODE_WIDTH * 2)
  const maxNodesPerRow = Math.max(
    1,
    Math.floor((availableWidth + HORIZONTAL_GAP) / (NODE_WIDTH + HORIZONTAL_GAP))
  )

  // Group members into rows if needed
  const memberRows: typeof memberAgents[] = []
  for (let i = 0; i < memberAgents.length; i += maxNodesPerRow) {
    memberRows.push(memberAgents.slice(i, i + maxNodesPerRow))
  }

  let currentY = PADDING

  // Position head agent at top center if exists
  if (headAgent) {
    const headX = (containerWidth - NODE_WIDTH) / 2
    nodes.push({
      ...headAgent,
      isHead: true,
      x: headX,
      y: currentY,
      width: NODE_WIDTH,
      height: HEAD_NODE_HEIGHT,
    })
    currentY += HEAD_NODE_HEIGHT + VERTICAL_GAP
  }

  // Position member agents in rows
  memberRows.forEach((row) => {
    const totalRowWidth =
      row.length * NODE_WIDTH + (row.length - 1) * HORIZONTAL_GAP
    const startX = (containerWidth - totalRowWidth) / 2

    row.forEach((agent, index) => {
      const x = startX + index * (NODE_WIDTH + HORIZONTAL_GAP)
      nodes.push({
        ...agent,
        isHead: false,
        x,
        y: currentY,
        width: NODE_WIDTH,
        height: MEMBER_NODE_HEIGHT,
      })

      // Add hierarchy connection from head to each member
      if (headAgent) {
        connections.push({
          fromId: headAgent.id,
          toId: agent.id,
          type: 'hierarchy',
        })
      }
    })

    currentY += MEMBER_NODE_HEIGHT + VERTICAL_GAP
  })

  // Add delegation connections
  delegations.forEach((delegation) => {
    connections.push({
      fromId: delegation.from_agent_id,
      toId: delegation.to_agent_id,
      type: 'delegation',
      label: delegation.condition || undefined,
    })
  })

  const totalHeight = currentY - VERTICAL_GAP + PADDING

  return {
    nodes,
    connections,
    width: containerWidth,
    height: totalHeight,
  }
}

export function TeamOrgChart({
  agents,
  delegations,
  headAgentId,
  onAgentClick,
  onAddAgents,
}: OrgChartProps & { onAddAgents?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(400)

  // Observe container resize
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Calculate layout
  const layout = useMemo(
    () => calculateLayout(agents, delegations, headAgentId, containerWidth),
    [agents, delegations, headAgentId, containerWidth]
  )

  // Create node map for connector lookups
  const nodeMap = useMemo(() => {
    const map = new Map<string, OrgChartNode>()
    layout.nodes.forEach((node) => map.set(node.id, node))
    return map
  }, [layout.nodes])

  // Track bidirectional delegations for curved path offsets
  const bidirectionalPairs = useMemo(() => {
    const pairs = new Set<string>()
    const delegationMap = new Map<string, string[]>()

    delegations.forEach((d) => {
      const key = `${d.from_agent_id}-${d.to_agent_id}`
      const reverseKey = `${d.to_agent_id}-${d.from_agent_id}`
      if (delegationMap.has(reverseKey)) {
        pairs.add(key)
        pairs.add(reverseKey)
      }
      delegationMap.set(key, [d.from_agent_id, d.to_agent_id])
    })

    return pairs
  }, [delegations])

  // Empty state
  if (agents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Bot className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p>No agents in this team yet.</p>
        {onAddAgents && (
          <Button variant="outline" className="mt-4" onClick={onAddAgents}>
            Add Agents
          </Button>
        )}
      </div>
    )
  }

  // Filter connections by type
  const hierarchyConnections = layout.connections.filter(
    (c) => c.type === 'hierarchy'
  )
  const delegationConnections = layout.connections.filter(
    (c) => c.type === 'delegation'
  )

  return (
    <div ref={containerRef} className="w-full">
      {/* Warning for no head agent */}
      {!headAgentId && agents.length > 0 && (
        <div className="text-center py-2 px-4 rounded-md bg-yellow-50 text-yellow-800 text-sm mb-4">
          <AlertTriangle className="h-4 w-4 inline mr-1" />
          No head agent assigned. Select one in settings below.
        </div>
      )}

      <div
        className="relative"
        style={{ height: Math.max(layout.height, 200) }}
      >
        {/* SVG layer for connections (behind nodes) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <OrgChartConnectorDefs />

          {/* Render hierarchy connections first (solid lines) */}
          {hierarchyConnections.map((connection) => (
            <OrgChartConnector
              key={`${connection.fromId}-${connection.toId}-${connection.type}`}
              connection={connection}
              nodes={nodeMap}
            />
          ))}

          {/* Render delegation connections (dashed lines with arrows) */}
          {delegationConnections.map((connection) => (
            <OrgChartConnector
              key={`${connection.fromId}-${connection.toId}-${connection.type}`}
              connection={connection}
              nodes={nodeMap}
              isBidirectional={bidirectionalPairs.has(
                `${connection.fromId}-${connection.toId}`
              )}
            />
          ))}
        </svg>

        {/* Nodes layer (on top of connections) */}
        {layout.nodes.map((node) => (
          <OrgChartNodeComponent
            key={node.id}
            node={node}
            onClick={() => onAgentClick?.(node.id)}
          />
        ))}
      </div>
    </div>
  )
}
