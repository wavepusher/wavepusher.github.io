from PIL import Image
import os

# Input and output paths
input_file = "faviconPNG.png"
output_file = "favicon.ico"

# Check if input file exists
if not os.path.exists(input_file):
    print(f"Error: {input_file} not found!")
    exit(1)

# Open the PNG image
img = Image.open(input_file)

# Create multiple sizes for better compatibility
# Standard favicon sizes: 16x16, 32x32, 48x48
sizes = [(16, 16), (32, 32), (48, 48)]

# Create ICO file with multiple sizes
img.save(output_file, format='ICO', sizes=sizes)

print(f"Successfully created {output_file} with sizes: {sizes}")
print(f"Original image size: {img.size}")