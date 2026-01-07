"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus as PlusIcon, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Client, AustralianState, AUSTRALIAN_STATES } from '@/types/client';
import { PhoneInput } from '@/components/PhoneInput';
import { Badge } from '@/components/ui/badge';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSuccess?: () => void;
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: ClientFormDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    suburb: '',
    postCode: '',
    state: 'NSW' as AustralianState,
    servicesPurchased: [] as string[],
  });
  const [newService, setNewService] = useState('');

  // Reset form when dialog opens/closes or client changes
  useEffect(() => {
    if (open) {
      if (client) {
        setFormData({
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phoneNumber: client.phoneNumber,
          suburb: client.suburb,
          postCode: client.postCode,
          state: client.state,
          servicesPurchased: Array.isArray(client.servicesPurchased) 
            ? client.servicesPurchased 
            : (client.servicesPurchased ? [client.servicesPurchased] : []),
        });
      } else {
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phoneNumber: '',
          suburb: '',
          postCode: '',
          state: 'NSW',
          servicesPurchased: [],
        });
      }
      setNewService('');
    }
  }, [open, client]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'First name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.lastName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Last name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.email.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Email is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.phoneNumber.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Phone number is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.suburb.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Suburb is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.postCode.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Post code is required',
        variant: 'destructive',
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const clientData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phoneNumber: formData.phoneNumber.trim(),
        suburb: formData.suburb.trim(),
        postCode: formData.postCode.trim(),
        state: formData.state,
        servicesPurchased: formData.servicesPurchased,
        createdBy: user?.id || '',
        createdByName: user?.name,
      };

      if (client) {
        // Update existing client
        const response = await fetch(`/api/clients/${client.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...clientData,
            updatedBy: user?.id,
            updatedByName: user?.name,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update client');
        }

        toast({
          title: 'Success',
          description: 'Client updated successfully',
        });
      } else {
        // Create new client
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create client');
        }

        toast({
          title: 'Success',
          description: 'Client created successfully',
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {client ? 'Edit Client' : 'Add Client'}
          </DialogTitle>
          <DialogDescription>
            {client
              ? 'Update client information below'
              : 'Enter client details to add them to the database'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                placeholder="John"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          {/* Contact Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="john.doe@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <PhoneInput
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(value) => setFormData((prev) => ({ ...prev, phoneNumber: value }))}
                defaultCountry="+61"
                className="w-full"
              />
            </div>
          </div>

          {/* Address Fields */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="suburb">Suburb *</Label>
              <Input
                id="suburb"
                value={formData.suburb}
                onChange={(e) => setFormData((prev) => ({ ...prev, suburb: e.target.value }))}
                placeholder="Sydney"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postCode">Post Code *</Label>
              <Input
                id="postCode"
                value={formData.postCode}
                onChange={(e) => setFormData((prev) => ({ ...prev, postCode: e.target.value }))}
                placeholder="2000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, state: value as AustralianState }))}
              >
                <SelectTrigger id="state">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUSTRALIAN_STATES.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Services Purchased */}
          <div className="space-y-2">
            <Label>Services Purchased</Label>
            <div className="flex gap-2">
              <Input
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                placeholder="Enter service name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newService.trim()) {
                    e.preventDefault();
                    setFormData((prev) => ({
                      ...prev,
                      servicesPurchased: [...prev.servicesPurchased, newService.trim()],
                    }));
                    setNewService('');
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (newService.trim()) {
                    setFormData((prev) => ({
                      ...prev,
                      servicesPurchased: [...prev.servicesPurchased, newService.trim()],
                    }));
                    setNewService('');
                  }
                }}
                disabled={!newService.trim()}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </div>
            {formData.servicesPurchased.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 p-3 border rounded-md bg-muted/50">
                {formData.servicesPurchased.map((service, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-sm cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        servicesPurchased: prev.servicesPurchased.filter((_, i) => i !== index),
                      }));
                    }}
                  >
                    {service}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
            {formData.servicesPurchased.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No services added yet. Type a service name and click "Add Service" to add it.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {client ? 'Update' : 'Create'} Client
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
