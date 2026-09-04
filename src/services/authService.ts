import type { AuthSession, LoginCredentials, RegisterData, User } from '../types/auth';

const SESSION_STORAGE_KEY = 'ideaforge_auth_session';
const REGISTERED_USERS_KEY = 'ideaforge_registered_users';
const SESSION_DURATION_HOURS = 24;

export const PRECONFIGURED_RESEARCHERS: Array<{ user: User; label: string; email: string; defaultPass: string }> = [
  {
    user: {
      id: 'usr_sarah_chen_01',
      name: 'Dr. Sarah Chen',
      email: 'dr.chen@ideaforge.ai',
      role: 'lead_investigator',
      institution: 'Stanford HAI & AI Safety Lab',
      avatar: 'SC'
    },
    label: 'Dr. Sarah Chen — Lead Investigator (Stanford HAI)',
    email: 'dr.chen@ideaforge.ai',
    defaultPass: 'IdeaForge2026!'
  },
  {
    user: {
      id: 'usr_alex_rivera_02',
      name: 'Alex Rivera',
      email: 'alex.rivera@ideaforge.ai',
      role: 'researcher',
      institution: 'Distributed ML Research Group',
      avatar: 'AR'
    },
    label: 'Alex Rivera — Researcher (Distributed ML)',
    email: 'alex.rivera@ideaforge.ai',
    defaultPass: 'IdeaForge2026!'
  }
];

function generateToken(userId: string): string {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return `idf_tok_${userId}_${timestamp}_${randomPart}`;
}

function getStoredRegisteredUsers(): Record<string, { user: User; passwordHash: string }> {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveRegisteredUser(user: User, passwordHash: string): void {
  try {
    const existing = getStoredRegisteredUsers();
    existing[user.email.toLowerCase().trim()] = { user, passwordHash };
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to save registered user:', err);
  }
}

export const authService = {
  /**
   * Retrieves active session from localStorage and verifies token expiry.
   */
  getSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;

      const session: AuthSession = JSON.parse(raw);
      if (!session || !session.token || !session.expiresAt || !session.user) {
        this.clearSession();
        return null;
      }

      // Verify expiration
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return null;
      }

      return session;
    } catch {
      this.clearSession();
      return null;
    }
  },

  /**
   * Saves active session to localStorage.
   */
  saveSession(session: AuthSession): void {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (err) {
      console.error('Failed to save session to localStorage:', err);
    }
  },

  /**
   * Completely clears session from localStorage.
   */
  clearSession(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear session from localStorage:', err);
    }
  },

  /**
   * Authenticates user against preconfigured researcher profiles or user registry.
   */
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    // Artificial latency for authentic auth feel
    await new Promise((resolve) => setTimeout(resolve, 350));

    const email = credentials.email.toLowerCase().trim();
    const password = credentials.password || '';

    if (!email) {
      throw new Error('Please provide an email address.');
    }

    // Check preconfigured researcher accounts
    const preconfigured = PRECONFIGURED_RESEARCHERS.find(
      (r) => r.email.toLowerCase() === email
    );

    let user: User | null = null;

    if (preconfigured) {
      if (password && password !== preconfigured.defaultPass && password !== 'demo') {
        throw new Error('Invalid credentials. Password does not match.');
      }
      user = preconfigured.user;
    } else {
      // Check registered users in local registry
      const registered = getStoredRegisteredUsers();
      const match = registered[email];
      if (match) {
        if (password && match.passwordHash && password !== match.passwordHash) {
          throw new Error('Invalid credentials. Incorrect password.');
        }
        user = match.user;
      } else {
        // Fallback: If user provides a valid email and non-empty password, auto-create researcher account
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error('Please provide a valid academic or professional email address.');
        }

        const namePart = email.split('@')[0].replace(/[._-]/g, ' ');
        const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

        user = {
          id: `usr_${Date.now()}`,
          name: formattedName || 'Researcher',
          email,
          role: 'researcher',
          institution: 'Independent Research',
          avatar: formattedName.charAt(0).toUpperCase()
        };

        saveRegisteredUser(user, password || 'default');
      }
    }

    const expiresAt = Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000;
    const session: AuthSession = {
      user,
      token: generateToken(user.id),
      expiresAt,
      authenticatedAt: new Date().toISOString()
    };

    this.saveSession(session);
    return session;
  },

  /**
   * Registers a new researcher and establishes an authenticated session.
   */
  async register(data: RegisterData): Promise<AuthSession> {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const email = data.email.toLowerCase().trim();
    const name = data.name.trim();

    if (!email || !name) {
      throw new Error('Name and email are required to register.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid academic or organizational email address.');
    }

    if (data.password && data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const initials = name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const user: User = {
      id: `usr_reg_${Date.now()}`,
      name,
      email,
      role: data.role || 'researcher',
      institution: data.institution?.trim() || 'Academic Institution',
      avatar: initials || 'R'
    };

    saveRegisteredUser(user, data.password || 'default');

    const expiresAt = Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000;
    const session: AuthSession = {
      user,
      token: generateToken(user.id),
      expiresAt,
      authenticatedAt: new Date().toISOString()
    };

    this.saveSession(session);
    return session;
  },

  getPreconfiguredResearchers() {
    return PRECONFIGURED_RESEARCHERS;
  }
};
