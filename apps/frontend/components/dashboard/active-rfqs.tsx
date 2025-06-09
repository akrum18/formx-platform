"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Search, Filter, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import type { RFQ } from "@/types/dashboard"

interface ActiveRFQsProps {
  rfqs: RFQ[]
}

export default function ActiveRFQs({ rfqs }: ActiveRFQsProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredRFQs = rfqs.filter((rfq) => {
    const matchesSearch =
      rfq.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rfq.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || rfq.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Draft":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            Draft
          </Badge>
        )
      case "Submitted":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            Submitted
          </Badge>
        )
      case "In Review":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            In Review
          </Badge>
        )
      case "Quoted":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
            Quoted
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between p-4 bg-muted/10">
        <div className="flex w-full max-w-sm items-center space-x-2 relative">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search RFQs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 border-muted bg-white"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] border-muted bg-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="in review">In Review</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="border-muted bg-white">
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="border-muted bg-white">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {filteredRFQs.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-medium mb-1">No RFQs found</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            We couldn't find any RFQs matching your search criteria. Try adjusting your filters or create a new RFQ.
          </p>
          <Button className="mt-4 bg-brand-dark-gold hover:bg-brand-dark-gold/90 text-white" asChild>
            <Link href="/rfq/new">Create New RFQ</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/20 border-b border-muted">
                <th className="py-3 px-4 text-left font-medium text-muted-foreground">RFQ ID</th>
                <th className="py-3 px-4 text-left font-medium text-muted-foreground">Name</th>
                <th className="py-3 px-4 text-left font-medium text-muted-foreground">Date</th>
                <th className="py-3 px-4 text-left font-medium text-muted-foreground">Parts</th>
                <th className="py-3 px-4 text-left font-medium text-muted-foreground">Status</th>
                <th className="py-3 px-4 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRFQs.map((rfq, index) => (
                <tr
                  key={rfq.id}
                  className={`border-b border-muted hover:bg-muted/5 transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-muted/5"
                  }`}
                >
                  <td className="py-3 px-4 font-medium">{rfq.id}</td>
                  <td className="py-3 px-4">{rfq.name}</td>
                  <td className="py-3 px-4 text-muted-foreground">{rfq.date}</td>
                  <td className="py-3 px-4">{rfq.parts}</td>
                  <td className="py-3 px-4">{getStatusBadge(rfq.status)}</td>
                  <td className="py-3 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="text-brand-dark-gold hover:text-brand-dark-gold/90 hover:bg-brand-dark-gold/10"
                    >
                      <Link href={`/rfq/${rfq.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between p-4 bg-muted/10">
        <p className="text-sm text-muted-foreground">
          Showing <strong>{filteredRFQs.length}</strong> of <strong>{rfqs.length}</strong> RFQs
        </p>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" disabled className="border-muted bg-white">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button variant="outline" size="sm" className="border-muted bg-white">
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}