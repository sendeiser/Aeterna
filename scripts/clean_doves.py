from PIL import Image
import numpy as np

im = Image.open("public/palomas_watermark_crop.png").convert("RGBA")
data = np.array(im)
H, W, _ = data.shape

# The 4 dotted line Y centers:
dot_y_centers = [91, 191, 292, 393]

# For each dot line, let's detect isolated small dots outside the dove strokes
# In regions that are mostly white background, the dots are dark isolated pixels
for yc in dot_y_centers:
    y_min = max(0, yc - 4)
    y_max = min(H, yc + 5)
    
    # In this horizontal band, outside the dove body/strokes (where nearby y-6 or y+6 is white ~250)
    for x in range(W):
        # Sample above and below the dotted line
        above = data[max(0, y_min - 2), x, :3].astype(float)
        below = data[min(H - 1, y_max + 2), x, :3].astype(float)
        
        # If both above and below are light background (> 230)
        if np.mean(above) > 225 and np.mean(below) > 225:
            # Linear interpolation vertically to erase the dot
            for y in range(y_min, y_max):
                t = (y - y_min) / (y_max - y_min)
                data[y, x, :3] = (1 - t) * above + t * below

# Now convert white to transparent
r, g, b = data[:, :, 0], data[:, :, 1], data[:, :, 2]
brightness = 0.299 * r + 0.587 * g + 0.114 * b

alpha = np.zeros_like(brightness, dtype=np.uint8)
mask_solid = brightness <= 180
mask_trans = brightness >= 246
mask_blend = (~mask_solid) & (~mask_trans)

alpha[mask_solid] = 255
alpha[mask_trans] = 0
alpha[mask_blend] = np.uint8((246 - brightness[mask_blend]) / (246 - 180) * 255)

data[:, :, 3] = alpha

out_img = Image.fromarray(data, mode="RGBA")
out_img.save("public/palomas_watermark_clean.png")
print("Saved public/palomas_watermark_clean.png")
