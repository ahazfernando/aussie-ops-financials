"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Loader2, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Client } from '@/types/client';
import { getAllClients, subscribeToClients } from '@/lib/clients';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { toast } from '@/hooks/use-toast';

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const loadClients = async () => {
    try {
      setLoading(true);
      const fetchedClients = await getAllClients();
      setClients(fetchedClients);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load clients',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Initial load
    loadClients();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToClients((updatedClients) => {
      setClients(updatedClients);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const handleClientUpdated = () => {
    loadClients();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading clients...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Modern Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-background border border-teal-500/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Clients
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your client database efficiently</p>
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)} 
            className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-300 border-2"
            variant="outline"
            size="lg"
          >
            <UserCircle className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="border-2 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-teal-500/10 via-cyan-500/5 to-muted/30 border-b-2">
          <div>
            <CardTitle className="text-xl font-bold">Client List</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">View and manage all clients</p>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {clients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No clients found</p>
            </div>
          ) : (
            <ClientsTable
              clients={clients}
              onClientUpdated={handleClientUpdated}
            />
          )}
        </CardContent>
      </Card>

      {/* Add Client Dialog */}
      <ClientFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          setShowAddDialog(false);
          handleClientUpdated();
        }}
      />
    </div>
  );
}
