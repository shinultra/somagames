from PIL import Image
import os

def remove_background_flood(input_path, output_path, tolerance=30):
    try:
        print(f"Processing {input_path}...")
        img = Image.open(input_path).convert("RGBA")
        
        # Seeds for flood fill (corners)
        seeds = [(0, 0), (img.width-1, 0), (0, img.height-1), (img.width-1, img.height-1)]
        bg_color = img.getpixel((0, 0))
        
        width, height = img.size
        pixels = img.load()
        visited = set()
        queue = list(seeds)
        
        def color_match(c1, c2, tol):
            return (abs(c1[0] - c2[0]) <= tol and
                    abs(c1[1] - c2[1]) <= tol and
                    abs(c1[2] - c2[2]) <= tol)

        while queue:
            x, y = queue.pop(0)
            if (x, y) in visited:
                continue
            
            if x < 0 or x >= width or y < 0 or y >= height:
                continue
            
            current_color = pixels[x, y]
            
            if color_match(current_color, bg_color, tolerance):
                pixels[x, y] = (0, 0, 0, 0) # Transparent
                visited.add((x, y))
                
                queue.append((x+1, y))
                queue.append((x-1, y))
                queue.append((x, y+1))
                queue.append((x, y-1))
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        img.save(output_path, "PNG")
        print(f"Saved to {output_path}")
        
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

# Define paths
artifact_dir = "/Users/kshingu/.gemini/antigravity/brain/bbb628b0-7a3e-4571-a678-e2a8a6d978ce"
camel_src = os.path.join(artifact_dir, "camel_rider_1769916021451.png")
pyramid_src = os.path.join(artifact_dir, "pyramid_obstacle_1769916037433.png")

output_dir = "/Users/kshingu/antigravity/camel_dash/assets"
camel_dst = os.path.join(output_dir, "camel.png")
pyramid_dst = os.path.join(output_dir, "pyramid.png")

# Run processing
remove_background_flood(camel_src, camel_dst)
remove_background_flood(pyramid_src, pyramid_dst)
