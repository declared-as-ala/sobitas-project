import os
import mysql.connector
import re

# -------------------------
# Database connection
# -------------------------
db = mysql.connector.connect(
    host=os.getenv("DB_HOST", "mysql"),  # Docker service name or hostname
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", "rootpassword"),
    database=os.getenv("DB_NAME", "protein_db")
)

cursor = db.cursor(dictionary=True)

# -------------------------
# Get all products
# -------------------------
cursor.execute("SELECT id, designation_fr, cover FROM products")
products = cursor.fetchall()

# -------------------------
# Path to your Laravel public folder (mount this folder in Docker)
# -------------------------
public_dir = os.getenv("PUBLIC_DIR", "/app")

def slugify(text):
    """Convert string to safe filename"""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'\s+', '_', text)
    return text

# -------------------------
# Rename files
# -------------------------
for product in products:
    cover = product['cover']
    
    print("===================================")
    print(f"Product ID: {product['id']}")
    print(f"Designation: {product['designation_fr']}")
    print(f"Cover from DB: {cover if cover else 'no cover'}")
    
    if not cover:
        print("Skipping because cover is None or empty")
        continue

    old_path = os.path.join(public_dir, cover)
    print(f"Resolved file path: {old_path}")
    
    if not os.path.exists(old_path):
        print("File not found on disk!")
        # You can also check if folder exists
        folder = os.path.dirname(old_path)
        if not os.path.exists(folder):
            print(f"Folder missing: {folder}")
        print("Skipping...")
        continue

    # If file exists, show proposed new path
    ext = os.path.splitext(old_path)[1]
    safe_name = slugify(product['designation_fr'])
    folder = os.path.dirname(old_path)
    new_path = os.path.join(folder, safe_name + ext)
    print(f"Will rename to: {new_path}")

    try:
        os.rename(old_path, new_path)
        print(f"Renamed: {old_path} → {new_path}")

        new_cover = os.path.relpath(new_path, public_dir).replace("\\", "/")
        cursor.execute(
            "UPDATE products SET cover=%s WHERE id=%s",
            (new_cover, product['id'])
        )
        db.commit()
    except Exception as e:
        print(f"Error renaming {old_path}: {e}")


cursor.close()
db.close()
print("Done!")

