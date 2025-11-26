from datetime import datetime

now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S+00:00")
base_url = "https://sobitas.tn/shop/" 


with open('sitemap2.xml', 'w', encoding='utf-8') as outfile:
    # Write XML header
    print('<?xml version="1.0" encoding="UTF-8"?>', file=outfile)
    print('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', file=outfile)

    with open('slugs.txt', 'r', encoding='utf-8') as f:
        while True:
            line = f.readline().strip()
            if not line: 
                break


            slug = line[2:line.find(' ', 2)]

            url = base_url + slug


            print("  <url>", file=outfile)
            print(f"    <loc>{url}</loc>", file=outfile)
            print(f"    <lastmod>{now}</lastmod>", file=outfile)
            print("    <changefreq>weekly</changefreq>", file=outfile)
            print("    <priority>0.8</priority>", file=outfile)
            print("  </url>", file=outfile)

    print("</urlset>", file=outfile)

print("Sitemap successfully saved as sitemap2.xml")