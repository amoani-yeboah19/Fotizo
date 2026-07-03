import { AlertCircle } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <EmptyState
        icon={<AlertCircle className="h-12 w-12" />}
        title="404 Page Not Found"
        description="The page you're looking for doesn't exist or has been moved."
      />
    </div>
  );
}
