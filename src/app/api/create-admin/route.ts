import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase
    let app;
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    const auth = getAuth(app);
    const db = getFirestore(app);

    const email = 'admin@gmail.com';
    const password = 'dark123';
    const firstName = 'Admin';
    const lastName = 'User';

    // Check if admin already exists
    const q = query(collection(db, 'users'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return NextResponse.json(
        { error: 'Admin user with this email already exists' },
        { status: 400 }
      );
    }

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Update display name
    await updateProfile(firebaseUser, {
      displayName: `${firstName} ${lastName}`,
    });

    // Create admin user document in Firestore
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      email: email,
      firstName: firstName,
      lastName: lastName,
      name: `${firstName} ${lastName}`,
      role: 'admin',
      status: 'approved',
      createdAt: serverTimestamp(),
      isFirstAdmin: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        email,
        name: `${firstName} ${lastName}`,
        role: 'admin',
        status: 'approved',
      },
    });
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create admin user',
        code: error.code 
      },
      { status: 500 }
    );
  }
}
