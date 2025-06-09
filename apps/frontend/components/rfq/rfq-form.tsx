"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, Save } from "lucide-react"

// Define schemas for dynamic data
interface Process {
  id: string;
  name: string;
}

interface Material {
  id: string;
  name: string;
}

interface Finish {
  id: string;
  name: string;
}

// Zod schema for the RFQ form
const rfqFormSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  description: z.string().optional(),
  process_types: z.array(z.string()).min(1, { message: "Please select at least one process." }),
  materials: z.array(z.string()).min(1, { message: "Please select at least one material." }),
  quantity_range: z.string().min(1, { message: "Please select a quantity range." }),
  budget_range: z.string().optional(),
  deadline: z.date().optional(),
  priority: z.string().min(1, { message: "Please select a priority." }),
  confidentiality_level: z.string().min(1, { message: "Please select a confidentiality level." }),
  notes: z.string().optional(),
});

type RFQFormValues = z.infer<typeof rfqFormSchema>;

export function RFQForm() {
  const router = useRouter();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [finishes, setFinishes] = useState<Finish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RFQFormValues>({
    resolver: zodResolver(rfqFormSchema),
    defaultValues: {
      title: "",
      description: "",
      process_types: [],
      materials: [],
      quantity_range: "",
      budget_range: "",
      priority: "normal",
      confidentiality_level: "standard",
      notes: "",
    },
  });

  const { handleSubmit, register, formState: { isSubmitting }, setValue } = form;

  useEffect(() => {
    async function fetchData() {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

        // Fetch processes
        const processesRes = await fetch(`${apiBaseUrl}/api/admin/processes`);
        if (!processesRes.ok) throw new Error("Failed to fetch processes");
        const processesData = await processesRes.json();
        setProcesses(processesData);

        // Fetch materials
        const materialsRes = await fetch(`${apiBaseUrl}/api/admin/materials`);
        if (!materialsRes.ok) throw new Error("Failed to fetch materials");
        const materialsData = await materialsRes.json();
        setMaterials(materialsData);

        // Fetch finishes (if applicable for new RFQ, though typically part of quote)
        const finishesRes = await fetch(`${apiBaseUrl}/api/admin/finishes`);
        if (!finishesRes.ok) throw new Error("Failed to fetch finishes");
        const finishesData = await finishesRes.json();
        setFinishes(finishesData);

      } catch (err: any) {
        setError(err.message);
        toast({
          title: "Error loading form data",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function onSubmit(values: RFQFormValues) {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      // In a real app, this would call an API to create the RFQ
      const response = await fetch(`${apiBaseUrl}/rfqs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create RFQ");
      }

      const newRfq = await response.json();

      toast({
        title: "RFQ created successfully!",
        description: `RFQ ${newRfq.rfq_number} has been submitted.`,
      });

      router.push(`/rfq/${newRfq.id}`);
    } catch (error: any) {
      console.error("Error creating RFQ:", error);
      toast({
        title: "Error creating RFQ",
        description: error.message || "There was an error creating your RFQ. Please try again.",
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading form data...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">Error: {error}</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">RFQ Title</Label>
            <Input id="title" {...register("title")} required />
            {form.formState.errors.title && <p className="text-red-500 text-sm">{form.formState.errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} className="min-h-[100px]" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="process_types">Manufacturing Process(es)</Label>
            <Select onValueChange={(value) => setValue("process_types", [value])} value={form.watch("process_types")[0] || ""}>
              <SelectTrigger id="process_types">
                <SelectValue placeholder="Select process" />
              </SelectTrigger>
              <SelectContent>
                {processes.map((process) => (
                  <SelectItem key={process.id} value={process.name}>
                    {process.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.process_types && <p className="text-red-500 text-sm">{form.formState.errors.process_types.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="materials">Material(s)</Label>
            <Select onValueChange={(value) => setValue("materials", [value])} value={form.watch("materials")[0] || ""}>
              <SelectTrigger id="materials">
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((material) => (
                  <SelectItem key={material.id} value={material.name}>
                    {material.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.materials && <p className="text-red-500 text-sm">{form.formState.errors.materials.message}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quantity_range">Quantity Range</Label>
            <Select onValueChange={(value) => setValue("quantity_range", value)} value={form.watch("quantity_range")}>
              <SelectTrigger id="quantity_range">
                <SelectValue placeholder="Select quantity range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-10">1-10</SelectItem>
                <SelectItem value="11-50">11-50</SelectItem>
                <SelectItem value="51-200">51-200</SelectItem>
                <SelectItem value="201-500">201-500</SelectItem>
                <SelectItem value="500+">500+</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.quantity_range && <p className="text-red-500 text-sm">{form.formState.errors.quantity_range.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget_range">Budget Range (Optional)</Label>
            <Input id="budget_range" {...register("budget_range")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Submission Deadline (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.watch("deadline") && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch("deadline") ? format(form.watch("deadline")!, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={form.watch("deadline")}
                  onSelect={(date) => setValue("deadline", date!)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select onValueChange={(value) => setValue("priority", value)} value={form.watch("priority")}>
              <SelectTrigger id="priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.priority && <p className="text-red-500 text-sm">{form.formState.errors.priority.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confidentiality_level">Confidentiality Level</Label>
            <Select onValueChange={(value) => setValue("confidentiality_level", value)} value={form.watch("confidentiality_level")}>
              <SelectTrigger id="confidentiality_level">
                <SelectValue placeholder="Select confidentiality level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="nda_required">NDA Required</SelectItem>
                <SelectItem value="internal_only">Internal Only</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.confidentiality_level && <p className="text-red-500 text-sm">{form.formState.errors.confidentiality_level.message}</p>}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea id="notes" {...register("notes")} className="min-h-[100px]" />
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-brand-dark-gold hover:bg-brand-dark-gold/90 text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating RFQ..." : "Create RFQ"}
        </Button>
      </div>
    </form>
  );
}