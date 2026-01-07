export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  suburb: string;
  postCode: string;
  state: AustralianState;
  servicesPurchased: string[]; // Array of services (stored as array in DB, but can be entered as comma-separated)
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
}

export interface FirestoreClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  suburb: string;
  post_code: string;
  state: AustralianState;
  services_purchased: string[];
  created_at: any; // Firestore Timestamp
  updated_at: any; // Firestore Timestamp
  created_by: string;
  created_by_name?: string;
  updated_by?: string;
  updated_by_name?: string;
}

export type AustralianState =
  | 'NSW'
  | 'VIC'
  | 'QLD'
  | 'WA'
  | 'SA'
  | 'TAS'
  | 'NT'
  | 'ACT';

export const AUSTRALIAN_STATES: { value: AustralianState; label: string }[] = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'NT', label: 'Northern Territory' },
  { value: 'ACT', label: 'Australian Capital Territory' },
];

export interface ClientFilters {
  search?: string;
  state?: AustralianState;
  service?: string;
}
