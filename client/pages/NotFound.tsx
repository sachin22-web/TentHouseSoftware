import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="flex gap-4 justify-center">
          <Button asChild variant="outline">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Link>
          </Button>
          <Button asChild>
            <Link to="/dashboard" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
