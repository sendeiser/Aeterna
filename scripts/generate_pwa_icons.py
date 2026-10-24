from PIL import Image

def generate_icons():
    img = Image.open('public/logo_aeterna.png')
    
    # 1. Standard icons
    for size in [192, 512]:
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(f'public/icon-{size}.png', 'PNG', optimize=True)
        print(f'Generated public/icon-{size}.png ({size}x{size})')

    # 2. Apple Touch Icon (180x180)
    apple_icon = img.resize((180, 180), Image.Resampling.LANCZOS)
    apple_icon.save('public/apple-touch-icon.png', 'PNG', optimize=True)
    print('Generated public/apple-touch-icon.png (180x180)')

    # 3. Maskable icons (requires ~10-15% padding so circular/squircle mask does not cut off the logo)
    for size in [192, 512]:
        maskable = Image.new('RGB', (size, size), '#00236f')
        content_size = int(size * 0.8)
        offset = (size - content_size) // 2
        content = img.resize((content_size, content_size), Image.Resampling.LANCZOS)
        maskable.paste(content, (offset, offset))
        maskable.save(f'public/icon-maskable-{size}.png', 'PNG', optimize=True)
        print(f'Generated public/icon-maskable-{size}.png ({size}x{size})')

if __name__ == '__main__':
    generate_icons()
