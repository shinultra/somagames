#!/usr/bin/env python3
"""
Script to remove green background from player image with higher tolerance.
"""

from PIL import Image
import os

def remove_green_background(image_path, output_path):
    """Remove green background with high tolerance."""
    img = Image.open(image_path).convert('RGBA')
    pixels = img.load()
    width, height = img.size
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            
            # Check if it's a green-ish color
            # Green has high G value, and G > R and G > B
            if g > 100 and g > r + 30 and g > b + 30:
                pixels[x, y] = (r, g, b, 0)
    
    img.save(output_path, 'PNG')
    print(f"Processed: {image_path} -> {output_path}")

# Process player image
brain_dir = '/Users/kshingu/.gemini/antigravity/brain/4712dd7a-8a06-4d17-913e-5cc603223cbe'
assets_dir = '/Users/kshingu/.gemini/antigravity/playground/retrograde-juno/hang-glider/assets'

src_path = os.path.join(brain_dir, 'player_new_1768122111312.png')
dst_path = os.path.join(assets_dir, 'player.png')

if os.path.exists(src_path):
    remove_green_background(src_path, dst_path)
else:
    print(f"Source file not found: {src_path}")

print("Done!")
