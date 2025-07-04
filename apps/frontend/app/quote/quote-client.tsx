"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileUploader } from "@/components/file-uploader"
import { manufacturingProcesses } from "@/lib/manufacturing-processes"
import type { User } from "@/lib/auth"
import Link from "next/link"
import { Info, FileCheck, ArrowLeft, HelpCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface QuoteClientProps {
  user: User
}

export default function QuoteClient({ user }: QuoteClientProps) {
  const router = useRouter()
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleFileChange = (file: File | null) => {
    setUploadedFile(file)

    if (file) {
      const fileMetadata = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      }
      localStorage.setItem("uploadedFileMetadata", JSON.stringify(fileMetadata))

      toast({
        title: "File uploaded successfully",
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      })
    } else {
      localStorage.removeItem("uploadedFileMetadata")
    }
  }

  const handleAnalyzeFile = async () => {
    if (!uploadedFile) {
      toast({
        title: "No file selected",
        description: "Please upload a CAD file to continue.",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)

    try {
      // Simulate file analysis
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const mockPartId = `part_${Date.now()}`
      localStorage.setItem("hasUploadedFile", "true")

      toast({
        title: "File analyzed successfully",
        description: "Redirecting to configuration...",
      })

      router.push(`/configure/${mockPartId}`)
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: "There was an error analyzing your file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <main className="bg-white min-h-screen">
      {/* Header */}
      <div className="border-b">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <div className="text-sm text-gray-600">Welcome, {user.name}</div>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Get Your Instant Quote</h1>
          <p className="text-gray-600 mt-2">
            Upload your CAD files and we'll help you find the perfect manufacturing process
          </p>
        </div>

        <Tabs defaultValue="upload-file" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="upload-file" className="text-base py-3">
              Upload File
            </TabsTrigger>
            <TabsTrigger value="select-process" className="text-base py-3">
              Select Process First
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload-file">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card className="border border-gray-200 shadow-sm overflow-hidden">
                  <CardContent className="p-6">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Your CAD Files</h2>
                      <p className="text-gray-600 text-sm">
                        We'll analyze your files and recommend the best manufacturing processes
                      </p>
                    </div>

                    <FileUploader
                      onFileChange={handleFileChange}
                      acceptedTypes={[".step", ".stp", ".iges", ".igs", ".stl", ".dxf", ".dwg", ".pdf", ".svg", ".ai"]}
                      maxSize={50}
                    />

                    <div className="mt-8">
                      <h3 className="text-base font-medium mb-3">Supported File Formats</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="bg-gray-50 p-3 rounded-md">
                          <h4 className="font-medium text-sm mb-1">3D Models</h4>
                          <p className="text-xs text-gray-600">.STEP, .STP, .IGES, .IGS, .STL</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md">
                          <h4 className="font-medium text-sm mb-1">2D Drawings</h4>
                          <p className="text-xs text-gray-600">.DXF, .DWG, .SVG, .AI, .PDF</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md">
                          <h4 className="font-medium text-sm mb-1">Assembly Files</h4>
                          <p className="text-xs text-gray-600">.SLDASM, .ASM, .STEP, .STP</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex justify-center">
                      <Button
                        size="lg"
                        className="bg-brand-dark-gold hover:bg-brand-dark-gold/90 text-white px-8"
                        onClick={handleAnalyzeFile}
                        disabled={!uploadedFile || isAnalyzing}
                      >
                        <FileCheck className="mr-2 h-5 w-5" />
                        {isAnalyzing ? "Analyzing..." : "Analyze Files & Get Quote"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <Card className="border border-gray-200 shadow-sm overflow-hidden mb-6">
                  <CardContent className="p-6">
                    <div className="flex items-start">
                      <Info className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">How Our Process Works</h4>
                        <ol className="text-sm text-gray-600 space-y-2 list-decimal pl-4">
                          <li>Upload your CAD files</li>
                          <li>Our system analyzes your design</li>
                          <li>We recommend optimal manufacturing processes</li>
                          <li>Select materials, finishes, and quantities</li>
                          <li>Receive your instant quote</li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 shadow-sm overflow-hidden">
                  <CardContent className="p-6">
                    <h4 className="font-medium text-gray-900 mb-2">Need Help?</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Our team is available to assist you with your manufacturing needs.
                    </p>
                    <Button variant="outline" className="w-full justify-center" asChild>
                      <Link href="/contact">
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Contact Support
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="select-process">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {manufacturingProcesses.map((process) => (
                <Card
                  key={process.id}
                  className="border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="h-40 bg-gray-100 relative">
                    <img
                      src={`/abstract-geometric-shapes.png?key=x9j1c&height=160&width=320&query=${process.name}`}
                      alt={process.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-gray-900 mb-1">{process.name}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{process.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {process.leadTimeRange.min}-{process.leadTimeRange.max} days
                      </span>
                      <Button className="bg-brand-dark-gold hover:bg-brand-dark-gold/90 text-white" size="sm" asChild>
                        <Link href={`/upload?process=${process.id}`}>Select</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
