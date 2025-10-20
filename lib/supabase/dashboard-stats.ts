import { createClient } from './client'
import { ensureProfileExists } from './profile-utils'

export interface DashboardStats {
  apiKeysCount: number
  apiCallsCount: number
  tensorsCount: number
  projectsCount: number
  usagePercentage: number
  dataProcessingGB: number
  aiAgentCallsCount: number
}

export interface RecentActivity {
  id: string
  title: string
  type: 'tensor' | 'api_key' | 'upload' | 'profile' | 'query'
  timestamp: string
}

export interface DashboardStatsResponse {
  success: boolean
  stats?: DashboardStats
  recentActivity?: RecentActivity[]
  error?: string
}

// Plan limits for usage calculation
const PLAN_LIMITS = {
  free: {
    apiCalls: 1000,
    dataProcessingGB: 5,
    aiAgentCalls: 100,
  },
  pro: {
    apiCalls: 10000,
    dataProcessingGB: 50,
    aiAgentCalls: 5000,
  },
  enterprise: {
    apiCalls: 100000,
    dataProcessingGB: 500,
    aiAgentCalls: 50000,
  },
}

export const dashboardStatsService = {
  // Fetch user-specific dashboard statistics
  async getDashboardStats(): Promise<DashboardStatsResponse> {
    try {
      const profile = await ensureProfileExists()
      if (!profile) {
        return { success: false, error: 'Not authenticated' }
      }

      const supabase = createClient()

      // Fetch API keys count
      const { count: apiKeysCount } = await supabase
        .from('api_keys')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('status', 'active')

      // Fetch total API calls (sum of usage_count from all API keys)
      const { data: apiKeysData } = await supabase
        .from('api_keys')
        .select('usage_count')
        .eq('user_id', profile.id)

      const apiCallsCount = apiKeysData?.reduce((sum, key) => sum + (key.usage_count || 0), 0) || 0

      // Fetch tensors count
      const { count: tensorsCount } = await supabase
        .from('tensors')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)

      // Fetch projects count
      const { count: projectsCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)

      // Fetch queries count (AI agent calls)
      const { count: aiAgentCallsCount } = await supabase
        .from('queries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)

      // Calculate data processing (estimate based on projects file sizes)
      const { data: projectsData } = await supabase
        .from('projects')
        .select('file_size')
        .eq('user_id', profile.id)

      const totalBytes = projectsData?.reduce((sum, project) => sum + (project.file_size || 0), 0) || 0
      const dataProcessingGB = totalBytes / (1024 * 1024 * 1024) // Convert bytes to GB

      // Get plan limits
      const planLimits = PLAN_LIMITS[profile.plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free

      // Calculate usage percentage (average across all metrics)
      const apiCallsPercent = (apiCallsCount / planLimits.apiCalls) * 100
      const dataProcessingPercent = (dataProcessingGB / planLimits.dataProcessingGB) * 100
      const aiAgentCallsPercent = ((aiAgentCallsCount || 0) / planLimits.aiAgentCalls) * 100
      const usagePercentage = (apiCallsPercent + dataProcessingPercent + aiAgentCallsPercent) / 3

      const stats: DashboardStats = {
        apiKeysCount: apiKeysCount || 0,
        apiCallsCount,
        tensorsCount: tensorsCount || 0,
        projectsCount: projectsCount || 0,
        usagePercentage: Math.min(100, usagePercentage),
        dataProcessingGB,
        aiAgentCallsCount: aiAgentCallsCount || 0,
      }

      return { success: true, stats }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      return { success: false, error: 'Failed to fetch dashboard statistics' }
    }
  },

  // Fetch recent activity for the user
  async getRecentActivity(): Promise<DashboardStatsResponse> {
    try {
      const profile = await ensureProfileExists()
      if (!profile) {
        return { success: false, error: 'Not authenticated' }
      }

      const supabase = createClient()
      const recentActivity: RecentActivity[] = []

      // Fetch recent tensors
      const { data: tensorsData } = await supabase
        .from('tensors')
        .select('id, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5)

      tensorsData?.forEach((tensor) => {
        recentActivity.push({
          id: tensor.id,
          title: 'Tensor analysis completed',
          type: 'tensor',
          timestamp: tensor.created_at,
        })
      })

      // Fetch recent API keys
      const { data: apiKeysData } = await supabase
        .from('api_keys')
        .select('id, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5)

      apiKeysData?.forEach((key) => {
        recentActivity.push({
          id: key.id,
          title: 'API key generated',
          type: 'api_key',
          timestamp: key.created_at,
        })
      })

      // Fetch recent projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5)

      projectsData?.forEach((project) => {
        recentActivity.push({
          id: project.id,
          title: 'Data upload processed',
          type: 'upload',
          timestamp: project.created_at,
        })
      })

      // Fetch recent queries
      const { data: queriesData } = await supabase
        .from('queries')
        .select('id, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5)

      queriesData?.forEach((query) => {
        recentActivity.push({
          id: query.id,
          title: 'Natural language query executed',
          type: 'query',
          timestamp: query.created_at,
        })
      })

      // Sort all activities by timestamp and take the 4 most recent
      const sortedActivity = recentActivity
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 4)

      return { success: true, recentActivity: sortedActivity }
    } catch (error) {
      console.error('Error fetching recent activity:', error)
      return { success: false, error: 'Failed to fetch recent activity' }
    }
  },

  // Get usage statistics with plan-specific limits
  async getUsageStats(): Promise<{
    success: boolean
    usage?: {
      apiCalls: { used: number; total: number; percent: number }
      dataProcessing: { used: number; total: number; percent: number }
      aiAgentCalls: { used: number; total: number; percent: number }
    }
    plan?: string
    error?: string
  }> {
    try {
      const profile = await ensureProfileExists()
      if (!profile) {
        return { success: false, error: 'Not authenticated' }
      }

      const statsResponse = await this.getDashboardStats()
      if (!statsResponse.success || !statsResponse.stats) {
        return { success: false, error: statsResponse.error }
      }

      const stats = statsResponse.stats
      const planLimits = PLAN_LIMITS[profile.plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free

      const usage = {
        apiCalls: {
          used: stats.apiCallsCount,
          total: planLimits.apiCalls,
          percent: (stats.apiCallsCount / planLimits.apiCalls) * 100,
        },
        dataProcessing: {
          used: stats.dataProcessingGB,
          total: planLimits.dataProcessingGB,
          percent: (stats.dataProcessingGB / planLimits.dataProcessingGB) * 100,
        },
        aiAgentCalls: {
          used: stats.aiAgentCallsCount,
          total: planLimits.aiAgentCalls,
          percent: (stats.aiAgentCallsCount / planLimits.aiAgentCalls) * 100,
        },
      }

      return { success: true, usage, plan: profile.plan }
    } catch (error) {
      console.error('Error fetching usage stats:', error)
      return { success: false, error: 'Failed to fetch usage statistics' }
    }
  },
}
