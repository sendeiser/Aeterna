from PIL import Image

im = Image.open("extracted_page_0_X1.jpg")
W, H = im.size
print(f"Total size: {W} x {H}")

# In the scanned sheet:
# 2 columns x 4 rows
# Let's crop the top-left receipt:
# Left column starts around x=100 to x=1150
# Top row starts around y=100 to y=850
# Let's find bounding box of top-left receipt
receipt_1 = im.crop((70, 70, 1180, 890))
receipt_1.save("public/recibo_muestra_single.png")
print("Saved public/recibo_muestra_single.png")

# Now crop just the doves from receipt 1:
# The doves are in the center of the receipt
doves = im.crop((380, 270, 1100, 680))
doves.save("public/palomas_watermark_crop.png")
print("Saved public/palomas_watermark_crop.png")

# Analyze colors:
# Sample pixels from the header text "CEMENTERIO PARQUE SAN NICOLÁS"
# Let's find the dominant non-white colors in the header area
header_crop = receipt_1.crop((50, 20, 1000, 180))
colors = header_crop.getcolors(maxcolors=200000)
# Sort by count
sorted_colors = sorted(colors, key=lambda x: x[0], reverse=True)
dark_colors = [c for c in sorted_colors if c[1][0] < 150 and c[1][2] > c[1][0]]
print("Dark blueish colors in header:")
for count, (r, g, b) in dark_colors[:10]:
    hex_code = f"#{r:02x}{g:02x}{b:02x}"
    print(f"Count: {count}, RGB: ({r}, {g}, {b}) -> {hex_code}")

# Sample pixels from the doves:
doves_colors = doves.getcolors(maxcolors=200000)
sorted_doves = sorted(doves_colors, key=lambda x: x[0], reverse=True)
# Find colored lines in doves (blues/cyans/grays)
blue_lines = [c for c in sorted_doves if c[1][2] > c[1][0] + 15 and c[1][2] > 80 and c[1][0] < 220]
print("\nDoves blueish colors:")
for count, (r, g, b) in blue_lines[:10]:
    hex_code = f"#{r:02x}{g:02x}{b:02x}"
    print(f"Count: {count}, RGB: ({r}, {g}, {b}) -> {hex_code}")
