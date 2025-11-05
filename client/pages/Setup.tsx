import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Tent,
  User,
  Phone,
  Lock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function Setup() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<
    "checking" | "connected" | "disconnected" | null
  >(null);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Check database status on component mount
  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  const checkDatabaseStatus = async () => {
    try {
      setDbStatus("checking");
      const response = await authAPI.checkSetupStatus();
      setDbStatus(
        response.data.databaseConnected ? "connected" : "disconnected",
      );
    } catch (error: any) {
      if (error.response?.status === 503) {
        setDbStatus("disconnected");
      } else {
        setDbStatus("connected"); // Assume connected if we get other responses
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await authAPI.setup(formData.name, formData.phone, formData.password);
      toast.success("Admin account created successfully!");
      setRetryAttempts(0); // Reset retry attempts on success

      // Auto-login after setup
      const loginResponse = await authAPI.login(
        formData.phone,
        formData.password,
      );
      const { token, admin } = loginResponse.data;

      login(token, admin);
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Setup error:", error);
      setRetryAttempts((prev) => prev + 1);

      if (error.response?.status === 503) {
        // Database connectivity issue
        const errorData = error.response.data;
        setDbStatus("disconnected");
        toast.error(
          errorData?.details ||
            "Database connection unavailable. Please try again in a few moments.",
          { duration: 8000 },
        );

        // Show suggestion after a delay
        if (errorData?.suggestion) {
          setTimeout(() => {
            toast.info(errorData.suggestion, { duration: 10000 });
          }, 1000);
        }
      } else if (error.response?.status === 400) {
        // Validation or business logic error
        toast.error(
          error.response.data?.error ||
            "Invalid input. Please check your information.",
        );
      } else if (
        error.message?.includes("Network Error") ||
        error.message?.includes("Failed to fetch")
      ) {
        // Network connectivity issue
        toast.error(
          "Network connection error. Please check your internet connection and try again.",
        );
      } else {
        // General error
        toast.error(
          error.response?.data?.error || "Setup failed. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    await checkDatabaseStatus();
    if (dbStatus === "connected") {
      toast.info(
        "Database connection restored. You can now proceed with setup.",
      );
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-4">
            <Tent className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mannat Tent House
          </h1>
          <p className="text-gray-600">Initial Setup</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-semibold text-center">
              Create Admin Account
            </CardTitle>
            <CardDescription className="text-center">
              Set up your administrator account to get started
            </CardDescription>

            {/* Database Status Indicator */}
            {dbStatus && (
              <div className="mt-4">
                {dbStatus === "checking" && (
                  <Alert>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      Checking database connection...
                    </AlertDescription>
                  </Alert>
                )}

                {dbStatus === "connected" && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Database connected. Ready for setup.
                    </AlertDescription>
                  </Alert>
                )}

                {dbStatus === "disconnected" && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      Database connection unavailable. Setup may fail.
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetry}
                        className="ml-2 h-6 text-xs"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Create a secure password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={loading || dbStatus === "disconnected"}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Account...
                  </div>
                ) : dbStatus === "disconnected" ? (
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Database Required
                  </div>
                ) : (
                  "Create Admin Account"
                )}
              </Button>

              {dbStatus === "disconnected" && (
                <div className="text-center mt-4 space-y-2">
                  <p className="text-sm text-gray-500">
                    Please ensure database connectivity before proceeding with
                    setup.
                    {retryAttempts > 0 && ` (Attempt ${retryAttempts + 1})`}
                  </p>

                  <div className="flex flex-col space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRetry}
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Check Database Connection
                    </Button>

                    <div className="text-xs text-gray-400 mt-2">
                      <details className="cursor-pointer">
                        <summary className="hover:text-gray-600">
                          Database Connection Help
                        </summary>
                        <div className="mt-2 text-left bg-gray-50 p-3 rounded text-xs">
                          <p>
                            <strong>Common solutions:</strong>
                          </p>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Check if your MongoDB database is running</li>
                            <li>Verify database connection string</li>
                            <li>
                              Ensure IP whitelist includes your current IP
                            </li>
                            <li>Wait a few moments and try again</li>
                          </ul>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-gray-500">
          <p>© 2024 Mannat Tent House. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
