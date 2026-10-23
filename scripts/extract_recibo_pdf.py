import pypdf
from PIL import Image
import os

pdf_path = "recibo del seguro.pdf"
reader = pypdf.PdfReader(pdf_path)
print(f"Num pages: {len(reader.pages)}")

page = reader.pages[0]
print(f"Page images count: {len(page.images)}")

for i, img in enumerate(page.images):
    img_name = f"extracted_page_{i}_{img.name}"
    with open(img_name, "wb") as f:
        f.write(img.data)
    print(f"Saved {img_name}")
    
    # Analyze image
    im = Image.open(img_name)
    print(f"Image format: {im.format}, size: {im.size}, mode: {im.mode}")
