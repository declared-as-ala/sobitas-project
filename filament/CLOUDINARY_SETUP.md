# Cloudinary Setup Guide

This guide will help you migrate article images from local storage to Cloudinary.

## Step 1: Sign up for Cloudinary (Free)

1. Go to https://cloudinary.com/users/register/free
2. Sign up (no credit card required)
3. After signup, you'll see your **Dashboard** with credentials

## Step 2: Get Your Cloudinary Credentials

From your Cloudinary Dashboard, copy:
- **Cloud name** (e.g., `dxyz123abc`)
- **API Key** (e.g., `123456789012345`)
- **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

## Step 3: Configure Laravel

Add to your `.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME

# Or use separate variables (recommended for security)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Example:**
```env
CLOUDINARY_URL=cloudinary://123456789012345:abcdefghijklmnopqrstuvwxyz123456@dxyz123abc
```

## Step 4: Install Dependencies

```bash
cd filament
composer install
```

This will install the `cloudinary-labs/cloudinary-laravel` package.

## Step 5: Publish Cloudinary Config (Optional)

```bash
php artisan vendor:publish --tag=cloudinary-laravel-config
```

## Step 6: Test Configuration

```bash
php artisan tinker
```

Then in tinker:
```php
\CloudinaryLabs\CloudinaryLaravel\Facades\Cloudinary::upload('path/to/test-image.jpg', ['folder' => 'test']);
```

If it works, you'll see the uploaded image URL.

## Step 7: Migrate Existing Images

### Dry Run (Preview what will be migrated):
```bash
php artisan images:migrate-to-cloudinary --dry-run
```

### Migrate All Images:
```bash
php artisan images:migrate-to-cloudinary
```

### Migrate Limited Number (for testing):
```bash
php artisan images:migrate-to-cloudinary --limit=10
```

## Step 8: Update Frontend Environment

Add to your frontend `.env` or environment variables:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

This allows the frontend to construct Cloudinary URLs for optimized images.

## Step 9: Verify

1. Go to Filament admin → Articles
2. Edit an article and upload a new cover image
3. Check that it uploads to Cloudinary
4. Visit `protein.tn/blog` and verify images load from Cloudinary

## Troubleshooting

### Error: "Cloudinary not configured"
- Check your `.env` file has `CLOUDINARY_URL` or all three separate variables
- Run `php artisan config:clear` after updating `.env`

### Error: "Invalid credentials"
- Double-check your Cloudinary credentials from the dashboard
- Make sure there are no extra spaces in `.env`

### Images not showing in frontend
- Check `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set in frontend environment
- Clear browser cache
- Check browser console for errors

## Benefits

✅ Images survive deployments  
✅ Automatic optimization (WebP, compression)  
✅ Global CDN for fast delivery  
✅ On-the-fly transformations (resize, crop)  
✅ Free tier: 25GB storage, 25GB bandwidth/month  

## Next Steps

After migration, you can:
- Delete old local images (backup first!)
- Use Cloudinary transformations in frontend (resize, crop, etc.)
- Set up automatic backups in Cloudinary dashboard
