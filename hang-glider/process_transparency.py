#!/usr/bin/env python3
"""
Script to remove checkered background pattern and make it transparent.
The checkered pattern typically alternates between light gray and white pixels.
"""

from PIL import Image
import os

def make_transparent(image_path, output_path):
    """Remove checkered background and make it transparent."""
    img = Image.open(image_path).convert('RGBA')
    pixels = img.load()
    width, height = img.size
    
    # Checkered pattern colors (light gray and white)
    check_colors = [
        (204, 204, 204, 255),  # Light gray
        (255, 255, 255, 255),  # White
        (238, 238, 238, 255),  # Another gray shade
        (221, 221, 221, 255),  # Another gray shade
        (192, 192, 192, 255),  # Gray
        (200, 200, 200, 255),  # Gray variant
        (203, 203, 203, 255),  # Gray variant
        (206, 206, 206, 255),  # Gray variant
        (153, 153, 153, 255),  # Darker gray for dark checkered
        (102, 102, 102, 255),  # Even darker gray
        (85, 85, 85, 255),     # Dark gray
        (68, 68, 68, 255),     # Dark gray
        (51, 51, 51, 255),     # Dark gray
        (40, 40, 40, 255),     # Very dark gray
        (34, 34, 34, 255),     # Very dark gray
        (45, 45, 45, 255),     # Very dark gray
    ]
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            
            # Check if it's a gray color (R == G == B approximately)
            is_gray = abs(r - g) < 10 and abs(g - b) < 10 and abs(r - b) < 10
            
            # Check if it matches checkered pattern position
            is_checkered_pos = (x // 8 + y // 8) % 2 == 0 or (x // 8 + y // 8) % 2 == 1
            
            # If it's a gray color in edge regions, make transparent
            if is_gray and a == 255:
                # Check if this pixel is part of a uniform gray region
                # by checking neighbors
                neighbor_grays = 0
                for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < width and 0 <= ny < height:
                        nr, ng, nb, na = pixels[nx, ny]
                        if abs(nr - ng) < 10 and abs(ng - nb) < 10:
                            neighbor_grays += 1
                
                # If surrounded by gray pixels, likely part of checkered pattern
                if neighbor_grays >= 3:
                    pixels[x, y] = (r, g, b, 0)
    
    img.save(output_path, 'PNG')
    print(f"Processed: {image_path} -> {output_path}")

def flood_fill_transparency(image_path, output_path):
    """Use flood fill from corners to remove solid background."""
    img = Image.open(image_path).convert('RGBA')
    pixels = img.load()
    width, height = img.size
    
    # Start flood fill from corners
    corners = [(0, 0), (width-1, 0), (0, height-1), (width-1, height-1)]
    
    for start_x, start_y in corners:
        start_color = pixels[start_x, start_y]
        if start_color[3] == 0:  # Already transparent
            continue
            
        stack = [(start_x, start_y)]
        visited = set()
        
        while stack:
            x, y = stack.pop()
            if (x, y) in visited:
                continue
            if x < 0 or x >= width or y < 0 or y >= height:
                continue
                
            current = pixels[x, y]
            
            # Gray check: R, G, B are similar (within tolerance)
            is_gray = abs(current[0] - current[1]) < 30 and abs(current[1] - current[2]) < 30
            
            # Check if similar to start color OR similar to checkered partner
            # Checkered patterns alternate between two gray shades
            start_r, start_g, start_b = start_color[0], start_color[1], start_color[2]
            curr_r, curr_g, curr_b = current[0], current[1], current[2]
            
            # Calculate difference from start color
            diff = abs(curr_r - start_r) + abs(curr_g - start_g) + abs(curr_b - start_b)
            
            # Allow larger tolerance for checkered patterns (two alternating colors)
            if is_gray and diff < 150:
                visited.add((x, y))
                pixels[x, y] = (current[0], current[1], current[2], 0)
                stack.extend([(x+1, y), (x-1, y), (x, y+1), (x, y-1)])
    
    img.save(output_path, 'PNG')
    print(f"Flood-filled: {image_path} -> {output_path}")

# Process all game assets
assets_dir = '/Users/kshingu/.gemini/antigravity/playground/retrograde-juno/hang-glider/assets'
files_to_process = [
    'player.png',
    'obstacle_roof.png',
    'obstacle_cutter.png',
    'obstacle_construction.png',
    'item_candy.png'
]

# First, restore original images from brain folder if they exist
brain_dir = '/Users/kshingu/.gemini/antigravity/brain/4712dd7a-8a06-4d17-913e-5cc603223cbe'
import shutil

# Map of brain files to asset files
brain_files = [
    ('player_transparent_1768121591954.png', 'player.png'),
    ('obstacle_roof_transparent_1768121606320.png', 'obstacle_roof.png'),
    ('obstacle_cutter_transparent_1768121621647.png', 'obstacle_cutter.png'),
    ('obstacle_construction_transparent_1768121636232.png', 'obstacle_construction.png'),
    ('item_candy_transparent_1768121651461.png', 'item_candy.png'),
]

# Try to restore from brain folder first
for brain_file, asset_file in brain_files:
    brain_path = os.path.join(brain_dir, brain_file)
    asset_path = os.path.join(assets_dir, asset_file)
    if os.path.exists(brain_path):
        shutil.copy(brain_path, asset_path)
        print(f"Restored: {brain_file} -> {asset_file}")

for filename in files_to_process:
    input_path = os.path.join(assets_dir, filename)
    output_path = os.path.join(assets_dir, filename)  # Overwrite
    if os.path.exists(input_path):
        flood_fill_transparency(input_path, output_path)
    else:
        print(f"File not found: {input_path}")

print("Done processing all images!")
