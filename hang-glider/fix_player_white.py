#!/usr/bin/env python3
"""
Script to remove white background from player image.
"""

from PIL import Image
import os

def remove_white_background(image_path, output_path):
    """Remove white/near-white background."""
    img = Image.open(image_path).convert('RGBA')
    pixels = img.load()
    width, height = img.size
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            
            # Check if it's white or near-white
            # High values for all R, G, B and they're similar
            if r > 240 and g > 240 and b > 240:
                pixels[x, y] = (r, g, b, 0)
    
    img.save(output_path, 'PNG')
    print(f"Processed: {image_path} -> {output_path}")

# Process player image
brain_dir = '/Users/kshingu/.gemini/antigravity/brain/4712dd7a-8a06-4d17-913e-5cc603223cbe'
assets_dir = '/Users/kshingu/.gemini/antigravity/playground/retrograde-juno/hang-glider/assets'

src_path = os.path.join(brain_dir, 'hang_glider_white_bg_1768122411681.png')
dst_path = os.path.join(assets_dir, 'player.png')

if os.path.exists(src_path):
    remove_white_background(src_path, dst_path)
    print("Done!")
else:
    print(f"Source file not found: {src_path}")
