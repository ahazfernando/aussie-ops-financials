/**
 * Script to create an admin user in Firebase
 * Usage: 
 *   1. Start your dev server: npm run dev
 *   2. Run: curl -X POST http://localhost:3000/api/create-admin
 *   OR use the API route directly in your browser/Postman
 */

console.log(`
To create the admin user, you have two options:

Option 1: Use the API route (Recommended)
  1. Start your Next.js dev server: npm run dev
  2. Make a POST request to: http://localhost:3000/api/create-admin
  3. You can use curl:
     curl -X POST http://localhost:3000/api/create-admin

Option 2: Use the Setup page
  Navigate to /setup in your browser and create the first admin user there.

Admin credentials:
  Email: admin@gmail.com
  Password: dark123
`);
