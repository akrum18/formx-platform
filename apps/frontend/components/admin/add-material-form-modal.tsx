"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast" // Assuming you have a toast notification system

interface AddMaterialFormModalProps {
  onMaterialAdded: () => void; // Callback to refresh data after adding
}

export function AddMaterialFormModal({ onMaterialAdded }: AddMaterialFormModalProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    cost: 0,
    markup: 0,
    density: 0,
    unit: "lb",
    active: true,
    category: "", // IMPORTANT: This should ideally be category_id (UUID) in a real app
    description: "",
    supplier: "",
    material_grade: "",
    specifications: "", // JSON string or object
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type, checked } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [id]: type === "checkbox" ? checked : value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: parseFloat(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Basic validation
      if (!formData.name || !formData.category) {
        toast({
          title: "Validation Error",
          description: "Material Name and Category are required.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Get authentication token (assuming it's stored in localStorage)
      const authToken = localStorage.getItem('access_token'); // Adjust this based on where your token is stored
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "No authentication token found. Please log in.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Convert specifications to JSON if it's a string
      let specificationsToSend: object = {};
      if (typeof formData.specifications === 'string' && formData.specifications.trim() !== '') {
        try {
          specificationsToSend = JSON.parse(formData.specifications);
        } catch (jsonError) {
          toast({
            title: "Input Error",
            description: "Specifications must be valid JSON.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      } else if (typeof formData.specifications === 'object' && formData.specifications !== null) {
        specificationsToSend = formData.specifications; // If it's already an object, use it directly
      }

      const payload = {
        name: formData.name,
        cost: formData.cost,
        markup: formData.markup,
        density: formData.density,
        unit: formData.unit,
        active: formData.active,
        category_id: formData.category, // IMPORTANT: Backend expects category_id (UUID), frontend sends string 'category'
                                        // You might need to fetch categories and map name to ID, or handle this on backend.
        description: formData.description,
        supplier: formData.supplier,
        material_grade: formData.material_grade,
        specifications: specificationsToSend,
      };

      const res = await fetch('http://localhost:8000/api/admin/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`, // Authentication header added here
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || `Failed to add material: ${res.statusText}`);
      }

      const result = await res.json();
      toast({
        title: "Success!",
        description: result.message || "Material added successfully.",
      });
      setIsOpen(false); // Close modal on success
      onMaterialAdded(); // Trigger refresh in parent component
      // Reset form
      setFormData({
        name: "", cost: 0, markup: 0, density: 0, unit: "lb", active: true,
        category: "", description: "", supplier: "", material_grade: "", specifications: ""
      });

    } catch (error: any) {
      console.error("Error adding material:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred while adding material.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Add New Material</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] overflow-y-scroll max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add New Material</DialogTitle>
          <DialogDescription>
            Fill in the details for the new material. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" value={formData.name} onChange={handleChange} className="col-span-3" required />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <Input id="category" value={formData.category} onChange={handleChange} className="col-span-3" required />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cost" className="text-right">
              Cost
            </Label>
            <Input id="cost" type="number" step="0.01" value={formData.cost} onChange={handleNumberChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="markup" className="text-right">
              Markup (%)
            </Label>
            <Input id="markup" type="number" step="0.01" value={formData.markup} onChange={handleNumberChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="density" className="text-right">
              Density
            </Label>
            <Input id="density" type="number" step="0.001" value={formData.density} onChange={handleNumberChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="unit" className="text-right">
              Unit
            </Label>
            <Input id="unit" value={formData.unit} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="supplier" className="text-right">
              Supplier
            </Label>
            <Input id="supplier" value={formData.supplier} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="material_grade" className="text-right">
              Material Grade
            </Label>
            <Input id="material_grade" value={formData.material_grade} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="specifications" className="text-right pt-2">
              Specifications (JSON)
            </Label>
            <Textarea id="specifications" value={formData.specifications} onChange={handleChange} className="col-span-3" placeholder='{"key": "value"}' />
          </div>
          <div className="flex items-center space-x-2 col-span-4 justify-end">
            <Checkbox id="active" checked={formData.active} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked as boolean }))} />
            <Label htmlFor="active">Is Active</Label>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Material"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}