"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Database, Key, Activity, Settings, BarChart3, Users, Zap, Clock, TrendingUp, Shield, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { dashboardStatsService, type DashboardStats, type RecentActivity } from "@/lib/supabase/dashboard-stats"

interface DashboardOverviewProps {
  user: any
}

export function DashboardOverview({ user }: DashboardOverviewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        const [statsResponse, activityResponse] = await Promise.all([
          dashboardStatsService.getDashboardStats(),
          dashboardStatsService.getRecentActivity(),
        ])

        if (statsResponse.success && statsResponse.stats) {
          setStats(statsResponse.stats)
        }

        if (activityResponse.success && activityResponse.recentActivity) {
          setRecentActivity(activityResponse.recentActivity)
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <section>
        <h2 className="mb-2 text-3xl font-bold">Welcome back, {user.name.split(" ")[0]}!</h2>
        <p className="text-muted-foreground">Here's an overview of your Tensorus account and recent activity.</p>
      </section>

      {/* Quick stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Key} label="API Keys" value={stats?.apiKeysCount.toString() || "0"} />
        <StatCard icon={Activity} label="API Calls" value={stats?.apiCallsCount.toLocaleString() || "0"} iconClass="text-green-600" />
        <StatCard icon={Database} label="Tensors" value={stats?.tensorsCount.toString() || "0"} iconClass="text-blue-600" />
        <StatCard icon={TrendingUp} label="Usage" value={`${Math.round(stats?.usagePercentage || 0)}%`} iconClass="text-orange-600" />
      </div>

      {/* Two-column grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AccountOverview user={user} />
        <UsageStats user={user} stats={stats} />
        <QuickActions />
        <RecentActivityCard recentActivity={recentActivity} />
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  iconClass = "",
}: {
  icon: typeof Database
  label: string
  value: string
  iconClass?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center space-x-2 p-6">
        <Icon className={`h-5 w-5 ${iconClass}`} />
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function AccountOverview({ user }: { user: any }) {
  const Row = ({
    label,
    children,
  }: {
    label: string
    children: React.ReactNode
  }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Account Overview
        </CardTitle>
        <CardDescription>Your account details and subscription status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Row label="Plan">
          <Badge variant={user.plan === "enterprise" ? "default" : user.plan === "pro" ? "secondary" : "outline"}>
            {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
          </Badge>
        </Row>

        <Row label="Email Status">
          <Badge variant="default">
            Verified
          </Badge>
        </Row>

        <Row label="2FA">
          <Badge variant="outline">
            Disabled
          </Badge>
        </Row>

        <Row label="Member Since">{new Date(user.created_at).toLocaleDateString()}</Row>

        <Button variant="outline" className="w-full bg-transparent">
          <Settings className="mr-2 h-4 w-4" />
          Account Settings
        </Button>
      </CardContent>
    </Card>
  )
}

function UsageStats({ user, stats }: { user: any; stats: DashboardStats | null }) {
  const [usageData, setUsageData] = useState<any>(null)

  useEffect(() => {
    const fetchUsageData = async () => {
      const response = await dashboardStatsService.getUsageStats()
      if (response.success && response.usage) {
        setUsageData(response.usage)
      }
    }
    fetchUsageData()
  }, [])

  const UsageRow = ({
    label,
    percent,
    used,
    total,
  }: {
    label: string
    percent: number
    used: string
    total: string
  }) => (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">
          {used} / {total}
        </span>
      </div>
      <Progress value={percent} className="h-2" />
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Usage Statistics
        </CardTitle>
        <CardDescription>Your API usage for the current month</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {usageData ? (
          <>
            <UsageRow
              label="API Calls"
              percent={usageData.apiCalls.percent}
              used={usageData.apiCalls.used.toLocaleString()}
              total={usageData.apiCalls.total.toLocaleString()}
            />
            <UsageRow
              label="Data Processing"
              percent={usageData.dataProcessing.percent}
              used={`${usageData.dataProcessing.used.toFixed(1)} GB`}
              total={`${usageData.dataProcessing.total} GB`}
            />
            <UsageRow
              label="AI Agent Calls"
              percent={usageData.aiAgentCalls.percent}
              used={usageData.aiAgentCalls.used.toLocaleString()}
              total={usageData.aiAgentCalls.total.toLocaleString()}
            />
          </>
        ) : (
          <div className="flex items-center justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        )}

        <div className="border-t pt-4">
          <p className="mb-3 text-sm text-muted-foreground">
            You're on the <strong>{user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}</strong> plan. {user.plan !== 'enterprise' ? 'Upgrade for higher limits.' : 'You have the highest plan.'}
          </p>
          <Button variant="outline" className="w-full bg-transparent">
            <Zap className="mr-2 h-4 w-4" />
            Upgrade Plan
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickActions() {
  const QuickLink = ({
    href,
    icon: Icon,
    text,
  }: {
    href: string
    icon: typeof Database
    text: string
  }) => (
    <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
      <Link href={href}>
        <Icon className="mr-2 h-4 w-4" />
        {text}
      </Link>
    </Button>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Actions
        </CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <QuickLink href="/developer/keys" icon={Key} text="Manage API Keys" />
        <QuickLink href="/demo" icon={Database} text="Try Demo" />
        <QuickLink href="/guide" icon={Users} text="View Documentation" />

        <Button variant="outline" className="w-full justify-start bg-transparent">
          <Plus className="mr-2 h-4 w-4" />
          Create New Project
        </Button>
      </CardContent>
    </Card>
  )
}

function RecentActivityCard({ recentActivity }: { recentActivity: RecentActivity[] }) {
  const getActivityColor = (type: string) => {
    switch (type) {
      case 'tensor':
        return 'green-500'
      case 'api_key':
        return 'blue-500'
      case 'upload':
        return 'orange-500'
      case 'query':
        return 'purple-500'
      case 'profile':
        return 'pink-500'
      default:
        return 'gray-500'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    }
  }
  const Item = ({
    color,
    title,
    time,
  }: {
    color: string
    title: string
    time: string
  }) => (
    <div className="flex items-center space-x-3">
      <div className={`h-2 w-2 rounded-full bg-${color}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>Your latest API calls and operations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentActivity.length > 0 ? (
          recentActivity.map((activity) => (
            <Item
              key={activity.id}
              color={getActivityColor(activity.type)}
              title={activity.title}
              time={formatTimeAgo(activity.timestamp)}
            />
          ))
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No recent activity
          </div>
        )}
      </CardContent>
    </Card>
  )
}