import { NextRequest, NextResponse } from 'next/server';
import { createTransaction, getAllTransactions } from '@/lib/financials';
import { TransactionFilters } from '@/types/transaction';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const filters: TransactionFilters = {};
    
    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!);
    }
    
    if (searchParams.get('endDate')) {
      filters.endDate = new Date(searchParams.get('endDate')!);
    }
    
    if (searchParams.get('type')) {
      filters.type = searchParams.get('type') as any;
    }
    
    if (searchParams.get('category')) {
      filters.category = searchParams.get('category') as any;
    }
    
    if (searchParams.get('paymentMethod')) {
      filters.paymentMethod = searchParams.get('paymentMethod') as any;
    }
    
    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')!;
    }

    const transactions = await getAllTransactions(filters);
    
    return NextResponse.json({ transactions });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      type,
      category,
      customCategory,
      amountNet,
      paymentMethod,
      gstApplied,
      description,
      clientId,
      clientName,
      date,
      createdBy,
      createdByName,
    } = body;

    if (!type || !category || !amountNet || !paymentMethod || !date || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const transactionId = await createTransaction({
      type,
      category,
      customCategory,
      amountNet: parseFloat(amountNet),
      paymentMethod,
      gstApplied,
      description,
      clientId,
      clientName,
      date: new Date(date),
      createdBy,
      createdByName,
    });

    return NextResponse.json({ id: transactionId, success: true });
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
