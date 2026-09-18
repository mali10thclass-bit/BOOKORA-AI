import React from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ArrowLeft,
  Home,
  FileQuestion,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <Card className="max-w-lg border-slate-200/80 shadow-2xl shadow-slate-200/50">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-lg">
            <FileQuestion className="h-12 w-12 text-slate-400" />
          </div>

          <div className="mb-2 flex items-baseline gap-2">
            <h1 className="text-7xl font-bold text-slate-900">404</h1>
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold text-slate-900">Page Not Found</h2>
              <p className="text-sm text-slate-500">The page you're looking for doesn't exist.</p>
            </div>
          </div>

          <p className="mb-8 max-w-md text-sm text-slate-500">
            The URL may be incorrect, the page may have been moved, or it may never have existed.
            Try searching or navigating back to the dashboard.
          </p>

          <div className="mb-8 flex w-full max-w-sm items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100">
            <Search className="h-5 w-5 text-slate-400" />
            <span className="flex-1 text-sm text-slate-400">Search Bookora...</span>
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-600/20" asChild>
              <a href="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </a>
            </Button>
          </div>

          <div className="mt-8 flex items-center gap-6 text-sm text-slate-400">
            <a href="/dashboard" className="transition-colors hover:text-emerald-600">Dashboard</a>
            <a href="/appointments" className="transition-colors hover:text-emerald-600">Appointments</a>
            <a href="/customers" className="transition-colors hover:text-emerald-600">Customers</a>
            <a href="/analytics" className="transition-colors hover:text-emerald-600">Analytics</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
