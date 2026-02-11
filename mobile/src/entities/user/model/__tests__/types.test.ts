import type { User, AuthCredential, AuthProvider, GoogleUser } from '../types';

describe('User entity types', () => {
  it('AuthProvider is constrained to google | apple', () => {
    const google: AuthProvider = 'google';
    const apple: AuthProvider = 'apple';
    expect(google).toBe('google');
    expect(apple).toBe('apple');
  });

  it('User interface has required fields', () => {
    const user: User = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      photo: null,
      provider: 'google',
    };

    expect(user.id).toBe('1');
    expect(user.email).toBe('test@example.com');
    expect(user.name).toBe('Test User');
    expect(user.photo).toBeNull();
    expect(user.provider).toBe('google');
  });

  it('User name and photo can be null', () => {
    const user: User = {
      id: '2',
      email: 'anon@example.com',
      name: null,
      photo: null,
      provider: 'apple',
    };

    expect(user.name).toBeNull();
    expect(user.photo).toBeNull();
  });

  it('AuthCredential has required fields', () => {
    const credential: AuthCredential = {
      providerId: 'google',
      idToken: 'token-123',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        photo: 'https://photo.url',
      },
    };

    expect(credential.providerId).toBe('google');
    expect(credential.idToken).toBe('token-123');
    expect(credential.user.id).toBe('user-1');
  });

  it('GoogleUser has provider-specific fields', () => {
    const googleUser: GoogleUser = {
      id: 'google-1',
      email: 'user@gmail.com',
      name: 'Full Name',
      photo: 'https://photo.url',
      familyName: 'Name',
      givenName: 'Full',
      idToken: 'id-token-456',
    };

    expect(googleUser.familyName).toBe('Name');
    expect(googleUser.givenName).toBe('Full');
    expect(googleUser.idToken).toBe('id-token-456');
  });
});
