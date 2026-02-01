from PIL import Image, ImageDraw
import os

def remove_background_flood(input_path, output_path, tolerance=30):
    try:
        img = Image.open(input_path).convert("RGBA")
        
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
        
        img.save(output_path, "PNG")
        print(f"Processed {input_path} -> {output_path} with flood fill")
        
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

base_dir = "/Users/kshingu/antigravity/helicopter_game"
# Only process helicopter this time
remove_background_flood(os.path.join(base_dir, "tree.png"), os.path.join(base_dir, "tree.png"))
