import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  Timestamp, 
  deleteDoc,
  onSnapshot,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Client, 
  FirestoreClient, 
  AustralianState,
  ClientFilters
} from '@/types/client';

/**
 * Convert Firestore client to app Client
 */
export function convertFirestoreClient(docData: any, docId: string): Client {
  return {
    id: docId,
    firstName: docData.first_name || '',
    lastName: docData.last_name || '',
    email: docData.email || '',
    phoneNumber: docData.phone_number || '',
    suburb: docData.suburb || '',
    postCode: docData.post_code || '',
    state: docData.state as AustralianState,
    servicesPurchased: docData.services_purchased || [],
    createdAt: docData.created_at?.toDate() || new Date(),
    updatedAt: docData.updated_at?.toDate() || new Date(),
    createdBy: docData.created_by,
    createdByName: docData.created_by_name,
    updatedBy: docData.updated_by,
    updatedByName: docData.updated_by_name,
  };
}

/**
 * Convert app Client to Firestore client
 */
export function convertToFirestoreClient(client: Client): Omit<FirestoreClient, 'id'> {
  return {
    first_name: client.firstName,
    last_name: client.lastName,
    email: client.email,
    phone_number: client.phoneNumber,
    suburb: client.suburb,
    post_code: client.postCode,
    state: client.state,
    services_purchased: client.servicesPurchased,
    created_at: Timestamp.fromDate(client.createdAt),
    updated_at: Timestamp.fromDate(client.updatedAt),
    created_by: client.createdBy,
    created_by_name: client.createdByName,
    updated_by: client.updatedBy,
    updated_by_name: client.updatedByName,
  };
}

/**
 * Get all clients
 */
export async function getAllClients(filters?: ClientFilters): Promise<Client[]> {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }

  try {
    const clientsRef = collection(db, 'clients');
    const constraints: QueryConstraint[] = [orderBy('created_at', 'desc')];

    if (filters?.state) {
      constraints.push(where('state', '==', filters.state));
    }

    if (filters?.service) {
      constraints.push(where('services_purchased', 'array-contains', filters.service));
    }

    const q = query(clientsRef, ...constraints);
    const querySnapshot = await getDocs(q);

    let clients = querySnapshot.docs.map((doc) =>
      convertFirestoreClient(doc.data(), doc.id)
    );

    // Apply search filter if provided (client-side filtering)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      clients = clients.filter((c) => {
        return (
          c.firstName.toLowerCase().includes(searchLower) ||
          c.lastName.toLowerCase().includes(searchLower) ||
          c.email.toLowerCase().includes(searchLower) ||
          c.phoneNumber.includes(searchLower) ||
          c.suburb.toLowerCase().includes(searchLower) ||
          c.postCode.includes(searchLower)
        );
      });
    }

    return clients;
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
}

/**
 * Get client by ID
 */
export async function getClientById(clientId: string): Promise<Client | null> {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }

  try {
    const clientDoc = await getDoc(doc(db, 'clients', clientId));
    if (!clientDoc.exists()) {
      return null;
    }
    return convertFirestoreClient(clientDoc.data(), clientDoc.id);
  } catch (error) {
    console.error('Error fetching client:', error);
    throw error;
  }
}

/**
 * Create a new client
 */
export async function createClient(
  clientData: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    suburb: string;
    postCode: string;
    state: AustralianState;
    servicesPurchased: string[];
    createdBy: string;
    createdByName?: string;
  }
): Promise<string> {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }

  try {
    const firestoreClient: Omit<FirestoreClient, 'id'> = {
      first_name: clientData.firstName,
      last_name: clientData.lastName,
      email: clientData.email,
      phone_number: clientData.phoneNumber,
      suburb: clientData.suburb,
      post_code: clientData.postCode,
      state: clientData.state,
      services_purchased: clientData.servicesPurchased,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      created_by: clientData.createdBy,
      ...(clientData.createdByName && { created_by_name: clientData.createdByName }),
    };

    const docRef = await addDoc(collection(db, 'clients'), firestoreClient);
    return docRef.id;
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
}

/**
 * Update a client
 */
export async function updateClient(
  clientId: string,
  updates: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    suburb?: string;
    postCode?: string;
    state?: AustralianState;
    servicesPurchased?: string[];
    updatedBy: string;
    updatedByName?: string;
  }
): Promise<void> {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }

  try {
    const clientRef = doc(db, 'clients', clientId);
    const existingDoc = await getDoc(clientRef);

    if (!existingDoc.exists()) {
      throw new Error('Client not found');
    }

    const updateData: any = {
      updated_at: Timestamp.now(),
      updated_by: updates.updatedBy,
      ...(updates.updatedByName && { updated_by_name: updates.updatedByName }),
    };

    if (updates.firstName !== undefined) updateData.first_name = updates.firstName;
    if (updates.lastName !== undefined) updateData.last_name = updates.lastName;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phoneNumber !== undefined) updateData.phone_number = updates.phoneNumber;
    if (updates.suburb !== undefined) updateData.suburb = updates.suburb;
    if (updates.postCode !== undefined) updateData.post_code = updates.postCode;
    if (updates.state !== undefined) updateData.state = updates.state;
    if (updates.servicesPurchased !== undefined) updateData.services_purchased = updates.servicesPurchased;

    await updateDoc(clientRef, updateData);
  } catch (error) {
    console.error('Error updating client:', error);
    throw error;
  }
}

/**
 * Delete a client
 */
export async function deleteClient(clientId: string): Promise<void> {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }

  try {
    await deleteDoc(doc(db, 'clients', clientId));
  } catch (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
}

/**
 * Subscribe to clients with real-time updates
 */
export function subscribeToClients(
  callback: (clients: Client[]) => void,
  filters?: ClientFilters
): () => void {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }

  const clientsRef = collection(db, 'clients');
  const constraints: QueryConstraint[] = [orderBy('created_at', 'desc')];

  if (filters?.state) {
    constraints.push(where('state', '==', filters.state));
  }

  if (filters?.service) {
    constraints.push(where('services_purchased', 'array-contains', filters.service));
  }

  const q = query(clientsRef, ...constraints);

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      let clients = snapshot.docs.map((doc) =>
        convertFirestoreClient(doc.data(), doc.id)
      );

      // Apply search filter if provided
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        clients = clients.filter((c) => {
          return (
            c.firstName.toLowerCase().includes(searchLower) ||
            c.lastName.toLowerCase().includes(searchLower) ||
            c.email.toLowerCase().includes(searchLower) ||
            c.phoneNumber.includes(searchLower) ||
            c.suburb.toLowerCase().includes(searchLower) ||
            c.postCode.includes(searchLower)
          );
        });
      }

      callback(clients);
    },
    (error) => {
      console.error('Error in clients subscription:', error);
    }
  );

  return unsubscribe;
}
