import { NextRequest, NextResponse } from 'next/server';
import { getClientById, updateClient, deleteClient } from '@/lib/clients';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params;
    const resolvedParams = params instanceof Promise ? await params : params;
    const client = await getClientById(resolvedParams.id);
    
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ client });
  } catch (error: any) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch client' },
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
      firstName,
      lastName,
      email,
      phoneNumber,
      suburb,
      postCode,
      state,
      servicesPurchased,
      updatedBy,
      updatedByName,
    } = body;

    // Convert servicesPurchased to array if it's a string (comma-separated)
    let servicesArray: string[] | undefined = undefined;
    if (servicesPurchased !== undefined) {
      if (typeof servicesPurchased === 'string') {
        servicesArray = servicesPurchased.split(',').map(s => s.trim()).filter(s => s);
      } else if (Array.isArray(servicesPurchased)) {
        servicesArray = servicesPurchased;
      }
    }

    await updateClient(resolvedParams.id, {
      firstName,
      lastName,
      email,
      phoneNumber,
      suburb,
      postCode,
      state,
      servicesPurchased: servicesArray,
      updatedBy,
      updatedByName,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update client' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params;
    const resolvedParams = params instanceof Promise ? await params : params;
    
    if (!resolvedParams || !resolvedParams.id) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }
    
    await deleteClient(resolvedParams.id);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete client' },
      { status: 500 }
    );
  }
}
