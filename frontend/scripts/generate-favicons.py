#!/usr/bin/env python3
"""
Favicon Generator for Sobitas

This script generates properly sized favicon files with transparent backgrounds
from the original logo. It removes white circular backgrounds and creates
clean icons for multiple platforms.

Requirements:
  pip install Pillow

Usage:
  python3 generate-favicons.py

This will create the following files in public/:
  - favicon.ico (32x32, 16x16 multi-format)
  - favicon-16x16.png
  - favicon-32x32.png
  - favicon-192x192.png (Android)
  - favicon-512x512.png (PWA, large icons)
  - apple-touch-icon.png (180x180, iOS)
"""

import os
import sys
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

def convert_to_transparent(image_path, output_image=None):
    """
    Convert white background to transparent in an image.
    Also can remove white circular backgrounds.
    """
    try:
        img = Image.open(image_path).convert('RGBA')
        data = img.getdata()
        
        new_data = []
        for item in data:
            # Convert white and near-white pixels to transparent
            # (255, 255, 255, 255) or similar
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
        
        img.putdata(new_data)
        
        if output_image:
            img.save(output_image, 'PNG')
        return img
    except Exception as e:
        print(f"Error converting image: {e}")
        return None


def create_favicon_with_padding(image_path, size, output_path):
    """
    Create a properly sized favicon with padding.
    Centers the logo on a transparent background.
    """
    try:
        # Open and convert to RGBA
        img = Image.open(image_path).convert('RGBA')
        
        # Convert white background to transparent
        data = img.getdata()
        new_data = []
        for item in data:
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
        img.putdata(new_data)
        
        # Crop to content (remove transparent borders)
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)
        
        # Create a new transparent image with desired size
        # Add padding - use 10% of the size as padding
        padding_ratio = 0.1
        new_img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
        
        # Calculate dimensions for centering with padding
        max_logo_size = int(size * (1 - 2 * padding_ratio))
        
        # Resize logo to fit
        img.thumbnail((max_logo_size, max_logo_size), Image.Resampling.LANCZOS)
        
        # Calculate position to center
        x = (size - img.width) // 2
        y = (size - img.height) // 2
        
        # Paste centered
        new_img.paste(img, (x, y), img)
        
        new_img.save(output_path, 'PNG')
        print(f"✓ Created {output_path} ({size}x{size})")
        return True
    except Exception as e:
        print(f"✗ Error creating {output_path}: {e}")
        return False


def create_ico(png_path, output_path):
    """
    Create a favicon.ico from PNG.
    Creates multi-resolution ICO file.
    """
    try:
        # Create multiple sizes
        sizes = [(16, 16), (32, 32)] 
        images = []
        
        for size in sizes:
            img = Image.open(png_path).convert('RGBA')
            img.thumbnail(size, Image.Resampling.LANCZOS)
            # Pad to exact size
            padded = Image.new('RGBA', size, (255, 255, 255, 0))
            offset = ((size[0] - img.size[0]) // 2, (size[1] - img.size[1]) // 2)
            padded.paste(img, offset, img)
            images.append(padded)
        
        # Save as ICO (will use 32x32 as primary, 16x16 as fallback)
        images[1].save(output_path, 'ICO', sizes=[(32, 32), (16, 16)])
        print(f"✓ Created {output_path}")
        return True
    except Exception as e:
        print(f"✗ Error creating ICO: {e}")
        # Fallback: copy PNG as ICO
        try:
            img = Image.open(png_path).convert('RGBA')
            img.save(output_path, 'ICO')
            print(f"✓ Created {output_path} (from PNG)")
            return True
        except:
            return False


def main():
    # Determine paths
    script_dir = Path(__file__).parent
    frontend_dir = script_dir.parent  # Go up one directory from scripts/
    public_dir = frontend_dir / 'public'
    
    # Find source image
    source_images = [
        public_dir / 'new-logo.webp',
        public_dir / 'new-logo.png',
        public_dir / 'logo.png',
        public_dir / 'logo-sobitas.png',
        public_dir / 'icon.png',
    ]
    
    source_image = None
    for candidate in source_images:
        if candidate.exists():
            source_image = candidate
            print(f"Using source image: {candidate.name}")
            break
    
    if not source_image:
        print("Error: No source image found!")
        print("Please ensure one of these exists in public/:")
        for img in source_images:
            print(f"  - {img.name}")
        sys.exit(1)
    
    # Create output directory if it doesn't exist
    public_dir.mkdir(parents=True, exist_ok=True)
    
    print("\n🎨 Generating favicons with transparent backgrounds...\n")
    
    # Generate favicons with specific sizes
    sizes = [
        (16, 'favicon-16x16.png'),
        (32, 'favicon-32x32.png'),
        (192, 'favicon-192x192.png'),
        (512, 'favicon-512x512.png'),
    ]
    
    success_count = 0
    for size, filename in sizes:
        output_path = public_dir / filename
        if create_favicon_with_padding(str(source_image), size, str(output_path)):
            success_count += 1
    
    # Create Apple touch icon (180x180)
    apple_output = public_dir / 'apple-touch-icon.png'
    if create_favicon_with_padding(str(source_image), 180, str(apple_output)):
        success_count += 1
    
    # Create favicon.ico
    ico_output = public_dir / 'favicon.ico'
    if create_ico(str(public_dir / 'favicon-32x32.png'), str(ico_output)):
        success_count += 1
    
    print(f"\n✓ Successfully created {success_count} favicon files!")
    print("\n📋 Next steps:")
    print("  1. Review the generated images in public/")
    print("  2. Test in browser: https://protein.tn/")
    print("  3. Force Google to refresh:")
    print("     - Visit https://search.google.com/search-console")
    print("     - Go to your property")
    print("     - Use URL inspection tool on any page")
    print("     - Click 'Request indexing' to refresh favicon cache")
    print("  4. To see changes in Google results, wait 24-48 hours")
    print("\n💡 Favicon refresh in different places:")
    print("  - Browser tab: Clear browser cache or hard refresh (Ctrl+Shift+R / Cmd+Shift+R)")
    print("  - Google results: Use Search Console URL inspection")
    print("  - Mobile: May take longer, up to 30 days")
    

if __name__ == '__main__':
    try:
        import PIL
    except ImportError:
        print("Error: Pillow library not found!")
        print("Install it with: pip install Pillow")
        sys.exit(1)
    
    main()
