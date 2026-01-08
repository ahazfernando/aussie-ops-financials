"use client";

import { useState } from 'react';
import { Client, ClientFilters, AUSTRALIAN_STATES } from '@/types/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, X, Edit, Trash2 } from 'lucide-react';
import { ClientFormDialog } from './ClientFormDialog';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface ClientsTableProps {
  clients: Client[];
  onClientUpdated?: () => void;
}

export function ClientsTable({ clients, onClientUpdated }: ClientsTableProps) {
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');

  const handleDelete = async () => {
    if (!deletingClient) return;

    try {
      const response = await fetch(`/api/clients/${deletingClient.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete client';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      toast({
        title: 'Success',
        description: 'Client deleted successfully',
      });

      setDeletingClient(null);
      onClientUpdated?.();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: error?.message || 'An error occurred while deleting the client',
        variant: 'destructive',
      });
    }
  };

  // Filter clients
  const filteredClients = clients.filter((client) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        client.firstName.toLowerCase().includes(query) ||
        client.lastName.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        client.phoneNumber.includes(query) ||
        client.suburb.toLowerCase().includes(query) ||
        client.postCode.includes(query);
      if (!matchesSearch) return false;
    }

    if (stateFilter !== 'all' && client.state !== stateFilter) return false;

    return true;
  });

  const getStateLabel = (state: string) => {
    return AUSTRALIAN_STATES.find((s) => s.value === state)?.label || state;
  };

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <div className="space-y-2 min-w-[180px]">
              <label className="text-sm font-medium">State</label>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {AUSTRALIAN_STATES.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {stateFilter !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStateFilter('all');
                }}
                className="mt-6"
              >
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border-2 overflow-x-auto shadow-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-teal-500/20 via-cyan-500/10 to-teal-500/5 border-b-2">
                <TableHead className="font-bold text-foreground">Name</TableHead>
                <TableHead className="font-bold text-foreground">Email</TableHead>
                <TableHead className="font-bold text-foreground">Phone</TableHead>
                <TableHead className="font-bold text-foreground">Location</TableHead>
                <TableHead className="font-bold text-foreground">Services</TableHead>
                <TableHead className="text-right font-bold text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No clients found
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow 
                    key={client.id}
                    className="cursor-pointer hover:bg-gradient-to-r hover:from-teal-500/5 hover:to-transparent transition-all duration-200 border-b group"
                  >
                    <TableCell className="font-semibold">
                      {client.firstName} {client.lastName}
                    </TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.phoneNumber}</TableCell>
                    <TableCell>
                      {client.suburb}, {client.postCode} {client.state}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {client.servicesPurchased && client.servicesPurchased.length > 0 ? (
                          <span className="text-sm">
                            {Array.isArray(client.servicesPurchased) 
                              ? client.servicesPurchased.join(', ')
                              : client.servicesPurchased}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingClient(client)}
                          className="h-8 w-8 hover:bg-teal-500/10 transition-all duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingClient(client)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Dialog */}
      <ClientFormDialog
        open={!!editingClient}
        onOpenChange={(open) => !open && setEditingClient(null)}
        client={editingClient}
        onSuccess={() => {
          setEditingClient(null);
          onClientUpdated?.();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingClient} onOpenChange={(open) => !open && setDeletingClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deletingClient?.firstName} {deletingClient?.lastName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingClient(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
