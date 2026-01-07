import { NextRequest, NextResponse } from 'next/server';
import { createClient, getAllClients } from '@/lib/clients';
import { ClientFilters } from '@/types/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const filters: ClientFilters = {};
    
    if (searchParams.get('state')) {
      filters.state = searchParams.get('state') as any;
    }
    
    if (searchParams.get('service')) {
      filters.service = searchParams.get('service')!;
    }
    
    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')!;
    }

    const clients = await getAllClients(filters);
    
    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
      createdBy,
      createdByName,
    } = body;

    if (!firstName || !lastName || !email || !phoneNumber || !suburb || !postCode || !state || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert servicesPurchased to array if it's a string (comma-separated)
    let servicesArray: string[] = [];
    if (servicesPurchased) {
      if (typeof servicesPurchased === 'string') {
        servicesArray = servicesPurchased.split(',').map(s => s.trim()).filter(s => s);
      } else if (Array.isArray(servicesPurchased)) {
        servicesArray = servicesPurchased;
      }
    }

    const clientId = await createClient({
      firstName,
      lastName,
      email,
      phoneNumber,
      suburb,
      postCode,
      state,
      servicesPurchased: servicesArray,
      createdBy,
      createdByName,
    });

    return NextResponse.json({ id: clientId, success: true });
  } catch (error: any) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create client' },
      { status: 500 }
    );
  }
}
