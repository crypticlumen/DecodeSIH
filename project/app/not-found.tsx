import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Icon from "@/components/Icon";

/* ------------------------------------------------------------------
   404 Not Found — friendly branded page with return-to-dashboard link.
   ------------------------------------------------------------------ */

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg" size="sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
            <Icon name="MapPinOff" className="h-7 w-7 text-amber-400" />
          </div>
          <CardTitle className="text-lg font-bold">Page not found</CardTitle>
          <CardDescription className="text-sm">
            The page you are looking for doesn&apos;t exist or has been moved.
            Let&apos;s get you back on track.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-5xl font-extrabold text-muted-foreground/30">404</p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="default" className="w-full gap-1.5">
            <Link href="/">
              <Icon name="LayoutDashboard" className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full gap-1.5">
            <Link href="/plan">
              <Icon name="Route" className="h-4 w-4" />
              Plan a Route
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}