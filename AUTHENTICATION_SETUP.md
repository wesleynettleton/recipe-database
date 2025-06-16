# Authentication Setup

This Recipe Database application now uses a simple username/password authentication system. No user registration is allowed - only dedicated admin access.

## Setup Instructions

### 1. Create Environment Variables

Create a `.env.local` file in the root directory with the following content:

```env
# Admin credentials for Recipe Database
ADMIN_USERNAME=admin
ADMIN_PASSWORD=recipe123

# Database configuration
DATABASE_URL=file:./recipe_database_dev.db
```

**Important:** 
- Change the `ADMIN_USERNAME` and `ADMIN_PASSWORD` to secure credentials of your choice
- Never commit the `.env.local` file to version control
- Use strong, unique passwords in production

### 2. How It Works

- **Login Page**: `/login` - The entry point for authentication
- **Protected Routes**: All pages except `/login` require authentication
- **Middleware**: Automatically redirects unauthenticated users to login
- **Session Management**: Uses HTTP-only cookies for security
- **Logout**: Available in the navigation bar

### 3. Security Features

- HTTP-only cookies prevent XSS attacks
- No signup functionality - only pre-configured users can access
- Automatic redirect to login for unauthenticated users
- Secure session management

### 4. Default Credentials

- **Username**: `admin`
- **Password**: `recipe123`

**Change these immediately after first login!**

### 5. Production Considerations

For production deployment:

1. Use strong, unique passwords
2. Consider implementing proper JWT tokens
3. Add rate limiting for login attempts
4. Use HTTPS in production
5. Consider adding 2FA for additional security

### 6. File Structure

```
app/
├── login/page.tsx              # Login page
├── api/auth/
│   ├── login/route.ts          # Login API
│   ├── logout/route.ts         # Logout API
│   └── verify/route.ts         # Token verification
├── components/
│   └── Navigation.tsx          # Navigation with auth state
└── layout.tsx                  # Root layout with navigation

middleware.ts                   # Route protection middleware
```

### 7. Testing

1. Start the development server: `npm run dev`
2. Navigate to any page - you should be redirected to `/login`
3. Enter the credentials from your `.env.local` file
4. You should be redirected to the home page
5. Try accessing protected routes - they should work
6. Click logout to test the logout functionality

### 8. Troubleshooting

- **"Authentication not configured"**: Check that `.env.local` exists and has the correct variables
- **"Invalid credentials"**: Verify the username and password match your `.env.local` file
- **Redirect loops**: Clear browser cookies and restart the development server
- **Middleware not working**: Ensure `middleware.ts` is in the root directory 