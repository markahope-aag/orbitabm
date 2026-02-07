# Authentication System

OrbitABM uses Supabase Authentication for secure user management with email/password authentication, protected routes, and session management.

## Features

- **Email/Password Authentication**: Secure login and registration
- **Protected Routes**: Middleware-based route protection
- **Session Management**: Persistent authentication state
- **Password Reset**: Email-based password recovery
- **Email Verification**: Account activation via email confirmation
- **User Profile**: Access to user metadata and preferences

## Architecture

### Authentication Flow

1. **Registration**: Users sign up with email, password, and optional profile data
2. **Email Verification**: Confirmation email sent to activate account
3. **Login**: Email/password authentication with session creation
4. **Route Protection**: Middleware redirects unauthenticated users to login
5. **Session Persistence**: Authentication state maintained across page reloads
6. **Logout**: Secure session termination

### Components

#### Authentication Context (`AuthContext.tsx`)
- Centralized authentication state management
- User session handling
- Authentication methods (signUp, signIn, signOut, resetPassword)
- Real-time auth state updates

#### Middleware (`middleware.ts`)
- Server-side route protection
- Automatic redirects for unauthenticated users
- Auth page access control for authenticated users
- API route and public route exceptions

#### Authentication Components
- `LoginForm`: Email/password login with validation
- `SignupForm`: User registration with profile data
- `ResetPasswordForm`: Password recovery interface
- `AuthCallback`: Handles email verification callbacks

#### Layout Integration
- `AppLayout`: Conditional sidebar rendering based on auth state
- `UserMenu`: User profile and logout functionality in sidebar
- Loading states during authentication checks

## Configuration

### Environment Variables

Required environment variables in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Supabase Setup

1. **Enable Authentication** in Supabase dashboard
2. **Configure Email Templates** for verification and password reset
3. **Set Redirect URLs**:
   - Site URL: `http://localhost:3000` (development)
   - Redirect URLs: `http://localhost:3000/auth/callback`
4. **Email Settings**: Configure SMTP or use Supabase's email service

## Routes

### Public Routes
- `/auth/login` - User login page
- `/auth/signup` - User registration page
- `/auth/callback` - Email verification callback
- `/auth/reset-password` - Password reset page

### Protected Routes
- `/dashboard` - Main application dashboard
- `/companies` - Company management
- `/campaigns` - Campaign management
- All other application routes

### Redirects
- Unauthenticated users → `/auth/login`
- Authenticated users on auth pages → `/dashboard`
- Root path (`/`) → `/auth/login` (unauthenticated) or `/dashboard` (authenticated)

## Usage

### Using Authentication in Components

```tsx
import { useAuth } from '@/lib/context/AuthContext'

function MyComponent() {
  const { user, loading, signOut } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!user) return <div>Not authenticated</div>

  return (
    <div>
      <p>Welcome, {user.email}!</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

### Protecting API Routes

API routes are automatically accessible. For additional protection, check authentication in the route handler:

```tsx
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Your protected API logic here
}
```

## User Profile Data

User profiles include:
- `email`: User's email address
- `user_metadata.full_name`: User's full name
- `user_metadata.organization_name`: Organization name (optional)
- `created_at`: Account creation timestamp
- `last_sign_in_at`: Last login timestamp

## Security Features

- **Password Requirements**: Minimum 6 characters
- **Email Validation**: Format validation and verification
- **Session Security**: Secure cookie-based sessions
- **CSRF Protection**: Built-in Next.js CSRF protection
- **Rate Limiting**: Supabase built-in rate limiting
- **Secure Redirects**: Validated redirect URLs

## Error Handling

Authentication errors are handled gracefully with user-friendly messages:
- Invalid credentials
- Email already registered
- Weak passwords
- Network errors
- Email verification required

## Testing

### Manual Testing Flow

1. **Registration**:
   - Visit `/auth/signup`
   - Fill in email, password, and name
   - Check email for verification link
   - Click verification link

2. **Login**:
   - Visit `/auth/login`
   - Enter credentials
   - Should redirect to `/dashboard`

3. **Protected Routes**:
   - Try accessing `/dashboard` without authentication
   - Should redirect to `/auth/login`

4. **Logout**:
   - Click user menu in sidebar
   - Click "Sign out"
   - Should redirect to `/auth/login`

5. **Password Reset**:
   - Visit `/auth/reset-password`
   - Enter email address
   - Check email for reset link

### Automated Testing

```bash
# Test authentication endpoints
curl -I http://localhost:3000/auth/login
curl -I http://localhost:3000/auth/signup
curl -I http://localhost:3000/dashboard  # Should redirect if not authenticated
```

## Troubleshooting

### Common Issues

1. **Redirect Loop**: Check middleware configuration and route patterns
2. **Email Not Sent**: Verify Supabase email configuration
3. **Session Not Persisting**: Check cookie settings and domain configuration
4. **Middleware Not Working**: Ensure `middleware.ts` is in the root `src/` directory

### Debug Mode

Enable debug logging by adding to your component:

```tsx
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      console.log('Auth event:', event, session)
    }
  )
  return () => subscription.unsubscribe()
}, [])
```

## Future Enhancements

- **Social Authentication**: Google, GitHub, etc.
- **Multi-Factor Authentication**: SMS or TOTP-based 2FA
- **Role-Based Access Control**: User roles and permissions
- **Session Management**: Active session monitoring
- **Audit Logging**: Authentication event tracking