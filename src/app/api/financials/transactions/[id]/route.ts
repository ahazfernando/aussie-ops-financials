import { NextRequest, NextResponse } from 'next/server';
import { getTransactionById, updateTransaction, deleteTransaction } from '@/lib/financials';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params;
    const resolvedParams = params instanceof Promise ? await params : params;
    const transaction = await getTransactionById(resolvedParams.id);
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ transaction });
  } catch (error: any) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transaction' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params;
    const resolvedParams = params instanceof Promise ? await params : params;
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
      updatedBy,
      updatedByName,
    } = body;

    await updateTransaction(resolvedParams.id, {
      type,
      category,
      customCategory,
      amountNet: amountNet !== undefined ? parseFloat(amountNet) : undefined,
      paymentMethod,
      gstApplied,
      description,
      clientId,
      clientName,
      date: date ? new Date(date) : undefined,
      updatedBy,
      updatedByName,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct object cases
    const params = context.params;
    const resolvedParams = params instanceof Promise ? await params : params;
    
    if (!resolvedParams || !resolvedParams.id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }
    
    await deleteTransaction(resolvedParams.id);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
