let workspaceCounter = 0

export interface Workspace {
  id: string
  name: string
  slug: string
  description: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export function createWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  workspaceCounter++

  return {
    id: overrides.id ?? `workspace-${workspaceCounter}`,
    name: overrides.name ?? `Test Workspace ${workspaceCounter}`,
    slug: overrides.slug ?? `test-workspace-${workspaceCounter}`,
    description: overrides.description ?? `Description for test workspace ${workspaceCounter}`,
    avatar_url: overrides.avatar_url ?? null,
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
    ...overrides,
  }
}

export function createWorkspaceList(count: number, overrides: Partial<Workspace> = {}): Workspace[] {
  return Array.from({ length: count }, () => createWorkspace(overrides))
}

export function resetWorkspaceCounter() {
  workspaceCounter = 0
}
