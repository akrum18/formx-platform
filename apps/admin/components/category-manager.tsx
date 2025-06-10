"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, X } from "lucide-react"
import { toast } from "sonner"

// The Category interface is no longer directly used within this component's state,
// as it now only manages category names (strings).
// The parent component will be responsible for mapping between full Category objects and names.

interface CategoryManagerProps {
  isOpen: boolean
  onClose: () => void
  categories: string[] // Now expects an array of strings (category names)
  onCategoriesUpdate: (categories: string[]) => void // Callback for updated list of names
  title: string
  description: string
  // The 'entityType' prop is removed as this component no longer handles API calls
  // and thus doesn't need to know the category type for API endpoints.
}

export function CategoryManager({
  isOpen,
  onClose,
  categories, // Now an array of strings
  onCategoriesUpdate,
  title,
  description,
}: CategoryManagerProps) {
  const [newCategoryName, setNewCategoryName] = useState("")
  // localCategories now stores only names (strings)
  const [localCategories, setLocalCategories] = useState<string[]>(categories)

  // Synchronize localCategories with props.categories when props change
  // This ensures that if the parent updates the categories list, this component reflects it.
  useEffect(() => {
    setLocalCategories(categories)
  }, [categories])

  // Removed fetchCategories and its useEffect, as API interaction is now handled by the parent.
  // Removed isLoading and error states as they were tied to internal API calls.

  const handleAddCategory = () => {
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) {
      toast.error("Category name cannot be empty.")
      return
    }

    const categoryExists = localCategories.some(
      (catName) => catName.toLowerCase() === trimmedName.toLowerCase(),
    )
    if (categoryExists) {
      toast.error("Category with this name already exists.")
      return
    }

    const updatedCategories = [...localCategories, trimmedName]
    setLocalCategories(updatedCategories)
    setNewCategoryName("")
    onCategoriesUpdate(updatedCategories) // Inform parent about the change
    toast.success(`Category '${trimmedName}' added successfully.`)
  }

  const handleRemoveCategory = (categoryNameToRemove: string) => {
    if (!window.confirm(`Are you sure you want to delete category '${categoryNameToRemove}'? This cannot be undone.`)) {
      return
    }

    const updatedCategories = localCategories.filter((catName) => catName !== categoryNameToRemove)
    setLocalCategories(updatedCategories)
    onCategoriesUpdate(updatedCategories) // Inform parent about the change
    toast.success(`Category '${categoryNameToRemove}' deleted successfully.`)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddCategory()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Removed error display as API calls are handled by parent */}
          <div className="space-y-2">
            <Label htmlFor="newCategoryName">Add New Category</Label>
            <div className="flex gap-2">
              <Input
                id="newCategoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter category name..."
                className="border-[#908d8d] focus:border-[#d4c273] focus:ring-[#d4c273]"
                // Removed disabled={isLoading} as isLoading is no longer managed here
              />
              <Button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()} // Only disable if input is empty
                className="bg-[#d4c273] hover:bg-[#d4c273]/90 text-[#fefefe]"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Current Categories</Label>
            <div className="flex flex-wrap gap-2 min-h-[60px] p-3 border rounded-md bg-muted/20">
              {/* Removed isLoading check */}
              {localCategories.length === 0 ? (
                <span className="text-muted-foreground text-sm">No categories defined</span>
              ) : (
                localCategories.map((categoryName) => (
                  <Badge key={categoryName} variant="secondary" className="flex items-center gap-1">
                    {categoryName}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                      onClick={() => handleRemoveCategory(categoryName)}
                      // Removed disabled={isLoading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} /* Removed disabled={isLoading} */>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}