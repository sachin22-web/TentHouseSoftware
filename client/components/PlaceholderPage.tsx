import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Construction, ArrowRight } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function PlaceholderPage({ 
  title, 
  description, 
  icon: Icon = Construction 
}: PlaceholderPageProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
            <Icon className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-center">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-gray-500 mb-4">
            This page is under development. The backend API is ready and functional.
          </p>
          <Button variant="outline" className="w-full">
            Continue Building This Page
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
