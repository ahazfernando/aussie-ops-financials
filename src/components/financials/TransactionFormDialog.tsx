"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, DollarSign, Check, ChevronsUpDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Client } from '@/types/client';
import {
  Transaction,
  TransactionType,
  PaymentMethod,
  TransactionCategory,
  InflowCategory,
  OutflowCategory,
} from '@/types/transaction';
import { calculateGST, calculateGrossAmount } from '@/lib/financials';

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  onSuccess?: () => void;
}

const INFLOW_CATEGORIES: InflowCategory[] = ['CLIENT_PAYMENT', 'INVESTMENT', 'OTHER'];
const OUTFLOW_CATEGORIES: OutflowCategory[] = ['GST', 'TAX', 'MARKETING', 'FRANCHISE_FEE', 'OTHER'];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CREDIT_DEBIT_CARD', label: 'Credit / Debit Card' },
  { value: 'CASH_IN_HAND', label: 'Cash in Hand' },
  { value: 'BANK_TRANSFER_BUSINESS', label: 'Bank Transfer → Business Account' },
  { value: 'BANK_TRANSFER_PERSONAL', label: 'Bank Transfer → Personal Account' },
];

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: TransactionFormDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>(transaction?.date || new Date());
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [clientSearchValue, setClientSearchValue] = useState('');

  const [formData, setFormData] = useState({
    type: (transaction?.type || 'INFLOW') as TransactionType,
    category: (transaction?.category || 'CLIENT_PAYMENT') as TransactionCategory,
    customCategory: transaction?.customCategory || '',
    amountNet: transaction?.amountNet || 0,
    paymentMethod: (transaction?.paymentMethod || 'CREDIT_DEBIT_CARD') as PaymentMethod,
    gstApplied: transaction?.gstApplied ?? true,
    userSelectedGst: false, // For BANK_TRANSFER_PERSONAL
    description: transaction?.description || '',
    clientId: transaction?.clientId || '',
    clientName: transaction?.clientName || '',
  });

  // Fetch clients when dialog opens
  useEffect(() => {
    if (open && formData.type === 'INFLOW') {
      const fetchClients = async () => {
        try {
          setLoadingClients(true);
          const response = await fetch('/api/clients');
          if (response.ok) {
            const data = await response.json();
            setClients(data.clients || []);
          }
        } catch (error) {
          console.error('Error fetching clients:', error);
        } finally {
          setLoadingClients(false);
        }
      };
      fetchClients();
    }
  }, [open, formData.type]);

  // Reset form when dialog opens/closes or transaction changes
  useEffect(() => {
    if (open) {
      if (transaction) {
        setFormData({
          type: transaction.type,
          category: transaction.category,
          customCategory: transaction.customCategory || '',
          amountNet: transaction.amountNet,
          paymentMethod: transaction.paymentMethod,
          gstApplied: transaction.gstApplied,
          userSelectedGst: transaction.gstApplied,
          description: transaction.description || '',
          clientId: transaction.clientId || '',
          clientName: transaction.clientName || '',
        });
        setDate(transaction.date);
      } else {
        setFormData({
          type: 'INFLOW',
          category: 'CLIENT_PAYMENT',
          customCategory: '',
          amountNet: 0,
          paymentMethod: 'CREDIT_DEBIT_CARD',
          gstApplied: true,
          userSelectedGst: false,
          description: '',
          clientId: '',
          clientName: '',
        });
        setDate(new Date());
      }
      setClientSearchValue('');
      setClientPopoverOpen(false);
    }
  }, [open, transaction]);

  // Calculate GST based on payment method and user selection
  const gstCalc = calculateGST(
    formData.amountNet,
    formData.paymentMethod,
    formData.paymentMethod === 'BANK_TRANSFER_PERSONAL' ? formData.userSelectedGst : undefined
  );
  
  const gstAmount = formData.paymentMethod === 'BANK_TRANSFER_PERSONAL' 
    ? (formData.userSelectedGst ? formData.amountNet * 0.1 : 0)
    : gstCalc.gstAmount;
    
  const amountGross = calculateGrossAmount(formData.amountNet, gstAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.amountNet <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Amount must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: 'Validation Error',
        description: 'Please select a category',
        variant: 'destructive',
      });
      return;
    }

    if (formData.category === 'OTHER' && !formData.customCategory?.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a custom category name',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const transactionData = {
        type: formData.type,
        category: formData.category,
        customCategory: formData.category === 'OTHER' ? formData.customCategory : undefined,
        amountNet: formData.amountNet,
        paymentMethod: formData.paymentMethod,
        gstApplied: formData.paymentMethod === 'BANK_TRANSFER_PERSONAL' 
          ? formData.userSelectedGst 
          : gstCalc.gstApplied,
        description: formData.description,
        clientId: formData.clientId || undefined,
        clientName: formData.clientName || undefined,
        date: date,
        createdBy: user?.id || '',
        createdByName: user?.name,
      };

      if (transaction) {
        // Update existing transaction
        const response = await fetch(`/api/financials/transactions/${transaction.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...transactionData,
            updatedBy: user?.id,
            updatedByName: user?.name,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update transaction');
        }

        toast({
          title: 'Success',
          description: 'Transaction updated successfully',
        });
      } else {
        // Create new transaction
        const response = await fetch('/api/financials/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transactionData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create transaction');
        }

        toast({
          title: 'Success',
          description: 'Transaction created successfully',
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

  const showGstToggle = formData.paymentMethod === 'BANK_TRANSFER_PERSONAL';
  const categories = formData.type === 'INFLOW' ? INFLOW_CATEGORIES : OUTFLOW_CATEGORIES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </DialogTitle>
          <DialogDescription>
            {transaction
              ? 'Update transaction details below'
              : 'Enter transaction details. GST will be calculated based on payment method.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    type: value as TransactionType,
                    category: value === 'INFLOW' ? 'CLIENT_PAYMENT' : 'GST',
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INFLOW">Inflow (Income)</SelectItem>
                  <SelectItem value="OUTFLOW">Outflow (Expense)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ 
                    ...prev, 
                    category: value as TransactionCategory,
                    customCategory: value !== 'OTHER' ? '' : prev.customCategory
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Category Input - Only show when "OTHER" is selected */}
          {formData.category === 'OTHER' && (
            <div className="space-y-2">
              <Label>Custom Category Name *</Label>
              <Input
                value={formData.customCategory}
                onChange={(e) => setFormData((prev) => ({ ...prev, customCategory: e.target.value }))}
                placeholder="Enter custom category name"
                required
              />
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
              </PopoverContent>
            </Popover>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Net Amount (AUD) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amountNet || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, amountNet: parseFloat(e.target.value) || 0 }))
                }
                className="pl-9"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  paymentMethod: value as PaymentMethod,
                  userSelectedGst: false,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* GST Toggle for Personal Bank Transfer */}
          {showGstToggle && (
            <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
              <Checkbox
                id="gst-toggle"
                checked={formData.userSelectedGst}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, userSelectedGst: checked === true }))
                }
              />
              <Label htmlFor="gst-toggle" className="cursor-pointer">
                Apply GST (10%)
              </Label>
            </div>
          )}

          {/* GST Calculation Display */}
          <div className="p-4 bg-muted rounded-md space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Net Amount:</span>
              <span className="font-medium">${formData.amountNet.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">GST ({gstCalc.gstApplied ? '10%' : '0%'}):</span>
              <span className="font-medium">${gstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold pt-2 border-t">
              <span>Gross Total:</span>
              <span>${amountGross.toFixed(2)}</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description or notes"
              rows={3}
            />
          </div>

          {/* Client Selection (for inflows) */}
          {formData.type === 'INFLOW' && (
            <div className="space-y-2">
              <Label>Client (Optional)</Label>
              <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientPopoverOpen}
                    className="w-full justify-between"
                    disabled={loadingClients}
                  >
                    {formData.clientId && formData.clientName
                      ? `${formData.clientName}`
                      : loadingClients
                      ? 'Loading clients...'
                      : 'Select a client...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search clients..."
                      value={clientSearchValue}
                      onValueChange={setClientSearchValue}
                    />
                    <CommandList>
                      <CommandEmpty>No client found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            setFormData((prev) => ({
                              ...prev,
                              clientId: '',
                              clientName: '',
                            }));
                            setClientPopoverOpen(false);
                            setClientSearchValue('');
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !formData.clientId ? "opacity-100" : "opacity-0"
                            )}
                          />
                          None (No client)
                        </CommandItem>
                        {clients
                          .filter((client) =>
                            !clientSearchValue ||
                            `${client.firstName} ${client.lastName}`.toLowerCase().includes(clientSearchValue.toLowerCase()) ||
                            client.email?.toLowerCase().includes(clientSearchValue.toLowerCase())
                          )
                          .map((client) => {
                            const clientFullName = `${client.firstName} ${client.lastName}`;
                            const isSelected = formData.clientId === client.id;
                            return (
                              <CommandItem
                                key={client.id}
                                value={`${clientFullName} ${client.email || ''}`}
                                onSelect={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    clientId: client.id,
                                    clientName: clientFullName,
                                  }));
                                  setClientPopoverOpen(false);
                                  setClientSearchValue('');
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    isSelected ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{clientFullName}</span>
                                  {client.email && (
                                    <span className="text-xs text-muted-foreground">{client.email}</span>
                                  )}
                                </div>
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {formData.clientId && formData.clientName && (
                <p className="text-xs text-muted-foreground">
                  Selected: {formData.clientName}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {transaction ? 'Update' : 'Create'} Transaction
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
