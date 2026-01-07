"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function CreateAdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const createAdmin = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: `Admin user created successfully! Email: ${data.user.email}, Name: ${data.user.name}`,
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to create admin user',
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Admin User</CardTitle>
          <CardDescription>
            Create the initial admin user for the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This will create an admin user with the following credentials:
            </p>
            <div className="rounded-md bg-muted p-3 space-y-1 text-sm">
              <p><strong>Email:</strong> admin@gmail.com</p>
              <p><strong>Password:</strong> dark123</p>
              <p><strong>Role:</strong> admin</p>
              <p><strong>Status:</strong> approved</p>
            </div>
          </div>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>{result.message}</AlertDescription>
              </div>
            </Alert>
          )}

          <Button
            onClick={createAdmin}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Admin User...
              </>
            ) : (
              'Create Admin User'
            )}
          </Button>

          {result?.success && (
            <p className="text-sm text-muted-foreground text-center">
              You can now log in with the admin credentials.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
