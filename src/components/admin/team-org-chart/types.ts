export interface OrgChartAgent {
  id: string
  name: string
  avatarUrl: string | null
  model: string
  isEnabled: boolean
}

export interface OrgChartNode extends OrgChartAgent {
  isHead: boolean
  x: number
  y: number
  width: number
  height: number
}

export interface OrgChartConnection {
  fromId: string
  toId: string
  type: 'hierarchy' | 'delegation'
  label?: string
}

export interface OrgChartDelegation {
  from_agent_id: string
  to_agent_id: string
  condition?: string | null
}

export interface OrgChartProps {
  agents: OrgChartAgent[]
  delegations: OrgChartDelegation[]
  headAgentId: string | null
  onAgentClick?: (agentId: string) => void
}
