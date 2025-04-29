import React, { useEffect, useState } from "react";
import { Route, useLocation } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

export default function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const adminAuthenticated = sessionStorage.getItem("adminAuthenticated") === "true";
    setIsAuthenticated(adminAuthenticated);
    setIsLoading(false);
    
    // If not authenticated, redirect to login
    if (!adminAuthenticated) {
      setLocation("/admin-login");
    }
  }, [setLocation]);

  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : isAuthenticated ? (
        <Component />
      ) : null}
    </Route>
  );
}