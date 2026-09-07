"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Icon from "@/components/Icon";

/* ------------------------------------------------------------------
   Root Error Boundary — catches runtime errors in the React tree.
   Next.js automatically wraps the root layout with this.
   ------------------------------------------------------------------ */

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const router = useRouter();

  useEffect(() => {
    console.error("[ChargeSure Error Boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg" size="sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
            <Icon name="AlertTriangle" className="h-7 w-7 text-red-400" />
          </div>
          <CardTitle className="text-lg font-bold">Something went wrong</CardTitle>
          <CardDescription className="text-sm">
            ChargeSure encountered an unexpected error. This may be temporary — try reloading the page.
          </CardDescription>
        </CardHeader>

        {error.digest && (
          <CardContent className="pb-2">
            <div className="rounded-lg bg-muted/60 p-2 text-center">
              <p className="text-[10px] font-mono text-muted-foreground">
                Error ID: {error.digest}
              </p>
            </div>
          </CardContent>
        )}

        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={reset}
            className="w-full gap-1.5"
            variant="default"
          >
            <Icon name="RefreshCw" className="h-4 w-4" />
            Reload page
          </Button>
          <Button
            onClick={() => router.push("/")}
            className="w-full gap-1.5"
            variant="outline"
          >
            <Icon name="LayoutDashboard" className="h-4 w-4" />
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}