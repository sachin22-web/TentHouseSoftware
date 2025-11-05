import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { authAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Tent, Phone, Lock } from "lucide-react";

export default function Login() {
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    // Check if setup is required
    const checkSetupStatus = async () => {
      try {
        const response = await authAPI.checkSetupStatus();

        if (response.data.setupRequired) {
          // Only navigate to setup if we're confident about the status
          // If database is disconnected, still show setup but don't force navigation
          if (
            response.data.databaseConnected ||
            !response.data.databaseConnected
          ) {
            navigate("/setup", { replace: true });
            return;
          }
        }
      } catch (error: any) {
        console.error("Setup status check error:", error);

        // If we get a 503 or database connectivity issue, redirect to setup
        if (
          error.response?.status === 503 ||
          error.response?.data?.databaseConnected === false ||
          error.message?.includes("Failed to fetch")
        ) {
          console.warn(
            "Database connectivity issue detected, redirecting to setup",
          );
          navigate("/setup", { replace: true });
          return;
        }

        // For other errors, continue to login page
      } finally {
        setCheckingSetup(false);
      }
    };

    checkSetupStatus();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.login(formData.phone, formData.password);
      const { token, admin } = response.data;

      login(token, admin);
      toast.success("Login successful!");
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage = error.response?.data?.error || "Login failed";

      if (error.response?.status === 401) {
        toast.error(
          "Invalid phone number or password. Please check your credentials.",
        );
      } else if (error.response?.status === 503) {
        toast.error(
          "Database connection unavailable. Please try again later.",
          { duration: 8000 },
        );
        // Optionally redirect to setup page to show database status
        setTimeout(() => {
          toast.info("You may need to check database connectivity.", {
            duration: 6000,
          });
        }, 2000);
      } else if (
        error.message?.includes("Network Error") ||
        error.message?.includes("Failed to fetch")
      ) {
        toast.error(
          "Network connection error. Please check your internet connection.",
        );
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking setup status...</p>
        </div>
      </div>
    );
  }

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
          <p className="text-gray-600">Admin Portal</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-semibold text-center">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center">
              Sign in to your admin account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-gray-500">
            Need to create an admin account?{" "}
            <button
              onClick={() => navigate("/setup")}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Setup Admin Account
            </button>
          </p>
          <p className="text-xs text-gray-400">
            © 2024 Mannat Tent House. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
