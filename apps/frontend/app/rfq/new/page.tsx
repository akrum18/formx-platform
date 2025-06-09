// This file will contain the form for creating a new RFQ
// It will likely import and use a reusable RFQ form component.

import { RFQForm } from "@/components/rfq/rfq-form"; // Assuming a new RFQ form component

export default function NewRFQPage() {
  return (
    <div className="container py-8 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-6">Create New RFQ</h1>
      <RFQForm />
    </div>
  );
}