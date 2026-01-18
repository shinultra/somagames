#!/usr/bin/env python3
"""
Script to remove solid color background using chroma key.
"""

from PIL import Image
import os

def chroma_key_transparency(image_path, output_path, key_colors):
    """Remove specified key colors and make them transparent."""
    img = Image.open(image_path).convert('RGBA')
    pixels = img.load()
    width, height = img.size
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            
            for key_r, key_g, key_b, tolerance in key_colors:
                if (abs(r - key_r) < tolerance and 
                    abs(g - key_g) < tolerance and 
                    abs(b - key_b) < tolerance):
                    pixels[x, y] = (r, g, b, 0)
                    break
    
    img.save(output_path, 'PNG')
    print(f"Chroma-keyed: {image_path} -> {output_path}")

# Process new images
brain_dir = '/Users/kshingu/.gemini/antigravity/brain/4712dd7a-8a06-4d17-913e-5cc603223cbe'
assets_dir = '/Users/kshingu/.gemini/antigravity/playground/retrograde-juno/hang-glider/assets'

# Green key colors (for player and candy)
green_keys = [
    (0, 255, 0, 30),    # Pure green
    (0, 238, 0, 30),    # Slightly darker green
    (0, 220, 0, 30),    # Darker green
    (30, 255, 30, 30),  # Slightly off green
]

# Magenta key colors (for cutter and construction)
magenta_keys = [
    (255, 0, 255, 30),   # Pure magenta
    (238, 0, 238, 30),   # Slightly darker magenta
    (255, 20, 255, 30),  # Slightly off magenta
    (220, 0, 220, 30),   # Darker magenta
]

# Map of source files to output and key colors
files_to_process = [
    ('player_new_1768122111312.png', 'player.png', green_keys),
    ('cutter_new_1768122126450.png', 'obstacle_cutter.png', magenta_keys),
    ('construction_new_1768122142901.png', 'obstacle_construction.png', magenta_keys),
    ('candy_new_1768122157244.png', 'item_candy.png', green_keys),
]

for src_file, dst_file, keys in files_to_process:
    src_path = os.path.join(brain_dir, src_file)
    dst_path = os.path.join(assets_dir, dst_file)
    if os.path.exists(src_path):
        chroma_key_transparency(src_path, dst_path, keys)
    else:
        print(f"Source file not found: {src_path}")

print("Done processing all images!")
