from PIL import Image
import numpy as np

# Load the cropped doves from the high-res scan
im = Image.open("public/palomas_watermark_crop.png").convert("RGBA")
data = np.array(im)

r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]

# In the paper scan, background is white/off-white (r > 230, g > 230, b > 230)
# Let's calculate brightness
brightness = 0.299 * r + 0.587 * g + 0.114 * b

# Alpha calculation:
# Anything pure white (brightness > 245) becomes transparent (alpha = 0)
# Anything dark (brightness < 180) has full alpha (alpha = 255)
# In between has smooth gradient
alpha = np.zeros_like(brightness, dtype=np.uint8)
mask_solid = brightness <= 190
mask_trans = brightness >= 248
mask_blend = (~mask_solid) & (~mask_trans)

alpha[mask_solid] = 255
alpha[mask_trans] = 0
alpha[mask_blend] = np.uint8((248 - brightness[mask_blend]) / (248 - 190) * 255)

data[:, :, 3] = alpha

out_img = Image.fromarray(data, mode="RGBA")
out_img.save("public/palomas_watermark.png")
print("Saved public/palomas_watermark.png successfully")
