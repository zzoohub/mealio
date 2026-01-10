/**
 * Auth Domain Types
 *
 * Simple, focused types for Google OAuth authentication.
 */

export interface User {
  id: string;
  email: string;
  name: string | null;
  photo: string | null;
}

export interface GoogleUser {
  id: string;
  email: string;
  name: string | null;
  photo: string | null;
  familyName: string | null;
  givenName: string | null;
  idToken: string | null;
}
