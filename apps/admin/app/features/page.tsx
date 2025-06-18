"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ToggleLeft, Search, Filter, Loader2 } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useFeatureFlags } from "@/hooks/useFeatureFlags"
import { toast } from "@/components/ui/use-toast"

export default function FeaturesPage() {
  const {
    items: features,
    ui,
    filters,
    stats,
    actions
  } = useFeatureFlags();

  // Fetch features on mount
  useEffect(() => {
    actions.fetchFlags();
  }, [actions.fetchFlags]);

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await actions.toggleFlag(id, enabled);
      toast({
        title: "Success",
        description: `Feature ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to toggle feature",
        variant: "destructive"
      });
    }
  };

  const handleRolloutUpdate = async (id: string, percentage: number) => {
    try {
      await actions.updateRollout(id, percentage);
      toast({
        title: "Success",
        description: `Rollout percentage updated successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update rollout percentage",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <SidebarTrigger className="bg-white border border-slate-200 hover:bg-slate-50 rounded-xl p-2 shadow-sm" />
            <div className="flex items-center justify-between w-full">
              <div className="space-y-1">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900">Feature Flags</h1>
                <p className="text-lg text-slate-600">Control quoting modules and experimental features</p>
              </div>
              <div className="flex items-center gap-3">{/* No action buttons for this page */}</div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d4c273] rounded-lg flex items-center justify-center">
                  <ToggleLeft className="w-5 h-5 text-[#fefefe]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Features</p>
                  <p className="text-xl font-bold text-slate-900">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <ToggleLeft className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Enabled Features</p>
                  <p className="text-xl font-bold text-slate-900">{stats.enabled}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <ToggleLeft className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Experimental</p>
                  <p className="text-xl font-bold text-slate-900">{stats.experimental}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <ToggleLeft className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Categories</p>
                  <p className="text-xl font-bold text-slate-900">{stats.categories}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card className="bg-white shadow-sm border-0 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#e8dcaa]/30 to-[#fefefe] border-b border-[#908d8d] pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <ToggleLeft className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-slate-900">Feature Configuration</CardTitle>
                <CardDescription className="text-slate-600 mt-1">
                  Control quoting modules and experimental features
                </CardDescription>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search features..."
                  value={filters.searchTerm}
                  onChange={(e) => actions.updateSearchTerm(e.target.value)}
                  className="pl-10 border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                />
              </div>
              <Button variant="outline" size="sm" className="border-[#908d8d] hover:bg-[#e8dcaa]/50 text-[#525253]">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {ui.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : ui.error ? (
              <div className="text-center py-8 text-red-600">
                {ui.error}
              </div>
            ) : (
              <div className="grid gap-6">
                {Object.entries(
                  features.reduce((acc, feature) => {
                    if (!acc[feature.category]) {
                      acc[feature.category] = [];
                    }
                    acc[feature.category].push(feature);
                    return acc;
                  }, {} as Record<string, typeof features>)
                ).map(([category, categoryFeatures]) => (
                  <Card
                    key={category}
                    className="bg-gradient-to-br from-slate-50/50 to-white border border-slate-200 rounded-2xl"
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            category === "Experimental"
                              ? "bg-orange-100"
                              : category === "Pricing"
                                ? "bg-green-100"
                                : category === "Processes"
                                  ? "bg-blue-100"
                                  : "bg-purple-100"
                          }`}
                        >
                          <ToggleLeft
                            className={`w-4 h-4 ${
                              category === "Experimental"
                                ? "text-orange-600"
                                : category === "Pricing"
                                  ? "text-green-600"
                                  : category === "Processes"
                                    ? "text-blue-600"
                                    : "text-purple-600"
                            }`}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-slate-900">{category}</CardTitle>
                          <CardDescription className="text-slate-600">
                            {category === "Experimental"
                              ? "Features in testing phase with limited rollout"
                              : `Core ${category.toLowerCase()} functionality controls`}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      {categoryFeatures.map((feature, index) => (
                        <div key={feature.id}>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Label htmlFor={feature.id} className="font-medium text-slate-900">
                                  {feature.name}
                                </Label>
                                <Badge
                                  variant={feature.enabled ? "default" : "secondary"}
                                  className={
                                    feature.enabled ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                                  }
                                >
                                  {feature.enabled ? "Enabled" : "Disabled"}
                                </Badge>
                                {feature.category === "Experimental" && (
                                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                    Experimental
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-600">{feature.description}</p>
                            </div>
                            <Switch
                              id={feature.id}
                              checked={feature.enabled}
                              onCheckedChange={(checked) => handleToggle(feature.id, checked)}
                              disabled={ui.isSubmitting}
                            />
                          </div>

                          {feature.enabled && feature.category === "Experimental" && (
                            <div className="mt-3 pl-4 border-l-2 border-orange-200 bg-orange-50/50 rounded-r-lg p-3">
                              <div className="flex items-center gap-4">
                                <Label htmlFor={`${feature.id}-rollout`} className="text-sm font-medium text-slate-700">
                                  Rollout Percentage:
                                </Label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    id={`${feature.id}-rollout`}
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={feature.rolloutPercentage}
                                    onChange={(e) => handleRolloutUpdate(feature.id, Number(e.target.value))}
                                    className="w-20 h-8 border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                                    disabled={ui.isSubmitting}
                                  />
                                  <span className="text-sm text-slate-600">%</span>
                                </div>
                              </div>
                              <p className="text-xs text-slate-600 mt-1">
                                Feature will be shown to {feature.rolloutPercentage}% of users
                              </p>
                            </div>
                          )}

                          {index < categoryFeatures.length - 1 && <Separator className="mt-4" />}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}