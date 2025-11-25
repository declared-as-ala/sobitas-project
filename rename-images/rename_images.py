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
public_dir = os.getenv("PUBLIC_DIR", "/app/public")

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
    old_path = os.path.join(public_dir, product['cover'])
    if not os.path.exists(old_path):
        print(f"File not found: {old_path}")
        continue

    ext = os.path.splitext(old_path)[1]
    safe_name = slugify(product['designation_fr'])
    folder = os.path.dirname(old_path)
    new_path = os.path.join(folder, safe_name + ext)

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

