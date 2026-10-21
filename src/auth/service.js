import { validateUsername } from '../data/storage.js';
const ITERATIONS = 210000;
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
export async function hashPassword(password, salt = hex(crypto.getRandomValues(new Uint8Array(16))), iterations = ITERATIONS) {
  if (!crypto.subtle) throw new Error('Secure password hashing requires HTTPS or localhost. Open GameIQ through a secure connection.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations }, key, 256);
  return { salt, hash: hex(new Uint8Array(bits)), iterations };
}
export async function createAccount(db, values) {
  const email = values.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  validateUsername(db, values.username);
  if (!values.firstName.trim() || !values.lastName.trim()) throw new Error('Please enter your first and last name.');
  if (db.users.some(u => u.email === email)) throw new Error('An account with that email already exists on this device.');
  if (values.password.length < 8) throw new Error('Use a password with at least 8 characters.');
  const credentials = await hashPassword(values.password);
  return { id: crypto.randomUUID(), firstName: values.firstName.trim(), lastName: values.lastName.trim(), username: values.username, email, credentials, photo: values.photo || '', bio: '', position: '', jersey: '', role: 'kid', completed: {}, progress: {}, rulebooks: [], privacy: { showStats: true }, notifications: { training: true, team: true }, createdAt: new Date().toISOString() };
}
export async function authenticate(db, email, password) {
  const user = db.users.find(u => u.email === email.trim().toLowerCase());
  if (!user || (await hashPassword(password, user.credentials.salt, user.credentials.iterations)).hash !== user.credentials.hash) throw new Error('Email or password is incorrect. Use an account created on this device.');
  return user;
}
