// Testing Hub Types

export type TestType = 'agent' | 'tool' | 'schedule' | 'provider'

export type TestStatus = 'pending' | 'running' | 'passed' | 'failed'

export interface TestHistoryEntry {
  id: string
  type: TestType
  target_id: string
  target_name: string
  success: boolean
  duration_ms: number
  error?: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface TestingStats {
  active_sessions: number
  tests_today: number
  pass_rate_24h: number
  tool_health: {
    total: number
    passing: number
  }
  schedule_health: {
    total: number
    passing: number
  }
  provider_status: {
    anthropic: boolean
    xai: boolean
  }
}

export interface ProviderTestResult {
  provider: string
  success: boolean
  latency_ms?: number
  error?: string
  tested_at: string
}

export interface TestRunConfig {
  workspace_id?: string
  tool_mode?: 'mock' | 'simulate' | 'live'
}

// Quick test action types
export type QuickTestType = 'agent' | 'tool' | 'schedule' | 'provider'

export interface QuickTestAction {
  type: QuickTestType
  label: string
  description: string
  href: string
}

// Component prop types
export interface TestStatsOverviewProps {
  stats: TestingStats
  loading?: boolean
}

export interface QuickTestPanelProps {
  onTestClick?: (type: QuickTestType) => void
}

export interface TestHistoryTableProps {
  entries: TestHistoryEntry[]
  loading?: boolean
  limit?: number
}

// API response types
export interface TestingStatsResponse {
  stats: TestingStats
}

export interface TestingHistoryResponse {
  tests: TestHistoryEntry[]
  total: number
}
