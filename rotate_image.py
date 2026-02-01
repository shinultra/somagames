from PIL import Image
import os

def rotate_image(input_path, output_path, angle):
    try:
        img = Image.open(input_path)
        # Rotate counter-clockwise. If it faces right, we need 90 degrees CCW to face Up.
        # PIL rotate is counter-clockwise.
        rotated_img = img.rotate(angle, expand=True)
        rotated_img.save(output_path, "PNG")
        print(f"Rotated {input_path} by {angle} degrees -> {output_path}")
        
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

base_dir = "/Users/kshingu/antigravity/helicopter_game"
# Rotate 90 degrees (Right -> Up)
rotate_image(os.path.join(base_dir, "helicopter.png"), os.path.join(base_dir, "helicopter.png"), 90)
