# Password Reset & Profile Management Setup

This document describes the password reset and profile management features implemented for the Filament admin panel.

## Features Implemented

### 1. Password Reset (Forgot Password)
- **Request Password Reset Page**: Users can request a password reset by entering their email
- **Reset Password Page**: Users can set a new password using a secure token
- **Email Notifications**: Secure password reset links sent via email
- **Rate Limiting**: Built-in throttling to prevent abuse (60 requests per hour)

### 2. Profile Management
- **Profile Page**: Accessible from the admin navigation
- **Update Name & Email**: Users can update their name and email address
- **Change Password**: Secure password change with current password verification
- **Password Strength Validation**: Enforces strong passwords (min 8 chars, letters, numbers, symbols)

## Files Created/Modified

### Migrations
- `database/migrations/2026_02_12_000000_create_password_reset_tokens_table.php` - Creates password_reset_tokens table for Laravel 12

### Auth Pages
- `app/Filament/Pages/Auth/RequestPasswordReset.php` - Request password reset page
- `app/Filament/Pages/Auth/ResetPassword.php` - Reset password form page
- `app/Filament/Pages/Auth/Login.php` - Updated with "Forgot password?" link

### Profile Page
- `app/Filament/Pages/Profile.php` - Profile management page
- `resources/views/filament/pages/profile.blade.php` - Profile page view

### Supporting Files
- `app/Rules/CurrentPassword.php` - Custom validation rule for current password
- `app/Notifications/ResetPasswordNotification.php` - Custom password reset email notification
- `app/Models/User.php` - Updated to use custom password reset notification
- `app/Providers/Filament/AdminPanelProvider.php` - Registered password reset and profile pages
- `config/auth.php` - Updated to use password_reset_tokens table

## Setup Instructions

### 1. Run Migration
```bash
php artisan migrate
```

This will create the `password_reset_tokens` table required for password resets.

### 2. Configure Email Settings

Add the following to your `.env` file:

```env
# Mail Configuration
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@sobitas.tn
MAIL_FROM_NAME="${APP_NAME}"

# For local development (log emails to storage/logs)
# MAIL_MAILER=log
```

**Important**: If using Gmail, you need to:
1. Enable 2-factor authentication
2. Generate an "App Password" (not your regular password)
3. Use the app password in `MAIL_PASSWORD`

### 3. Test the Features

#### Test Password Reset:
1. Go to the login page: `https://admin.sobitas.tn/admin/login`
2. Click "Forgot your password?"
3. Enter the email address (e.g., `bitoutawalid@gmail.com`)
4. Check email for reset link
5. Click the link and set a new password
6. Login with the new password

#### Test Profile Management:
1. Login to the admin panel
2. Click "Profile" in the navigation menu
3. Update name/email (optional)
4. Change password:
   - Enter current password
   - Enter new password (min 8 chars, must include letters, numbers, symbols)
   - Confirm new password
5. Click "Save Changes"

## Security Features

### Password Reset Security
- ✅ **Time-limited tokens**: Reset links expire after 60 minutes
- ✅ **Rate limiting**: Maximum 60 requests per hour per email
- ✅ **Secure tokens**: Uses Laravel's secure token generation
- ✅ **No password disclosure**: Never sends passwords via email
- ✅ **One-time use**: Tokens are invalidated after use

### Profile Security
- ✅ **Current password required**: Must verify current password to change it
- ✅ **Password hashing**: Passwords are hashed using bcrypt
- ✅ **Password strength**: Enforces strong password requirements
- ✅ **Email uniqueness**: Validates email uniqueness
- ✅ **Authentication required**: Only authenticated users can access

## Manual Testing Checklist

### Password Reset Flow
- [ ] Click "Forgot your password?" on login page
- [ ] Enter valid email address
- [ ] Receive email with reset link
- [ ] Click reset link (should open reset form)
- [ ] Enter new password (meets requirements)
- [ ] Confirm new password
- [ ] Successfully reset password
- [ ] Login with new password
- [ ] Test with invalid/expired token (should fail)
- [ ] Test rate limiting (multiple requests should be throttled)

### Profile Management
- [ ] Access Profile page (must be logged in)
- [ ] Update name (should save successfully)
- [ ] Update email (should validate uniqueness)
- [ ] Change password with correct current password
- [ ] Change password with incorrect current password (should fail)
- [ ] Change password with weak password (should fail validation)
- [ ] Leave password fields blank (should not change password)
- [ ] Verify password change works (logout and login with new password)

## Troubleshooting

### Email Not Sending
1. Check `.env` mail configuration
2. Verify SMTP credentials
3. Check application logs: `storage/logs/laravel.log`
4. For local testing, use `MAIL_MAILER=log` to see emails in logs

### Reset Link Not Working
1. Verify token hasn't expired (60 minutes)
2. Check if token was already used
3. Verify email matches the one that requested reset
4. Check application logs for errors

### Profile Page Not Accessible
1. Ensure user is authenticated
2. Check navigation is registered in `AdminPanelProvider`
3. Verify page class exists and is properly namespaced

## Notes

- Password reset tokens are stored in `password_reset_tokens` table
- Old `password_resets` table is kept for backward compatibility but not used
- All password operations use Laravel's built-in hashing
- Rate limiting is handled by Laravel's throttle middleware
- Email notifications use Filament's panel URL generation for proper routing
