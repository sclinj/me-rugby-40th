from PIL import Image
import os

def remove_white_background(input_path):
    if not os.path.exists(input_path):
        print(f"File {input_path} not found.")
        return
        
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    newData = []
    for item in datas:
        # If the pixel is very close to white, make it transparent
        # Using a slightly wider range to capture compression artifacts
        if item[0] > 245 and item[1] > 245 and item[2] > 245:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(input_path, "PNG")
    print(f"Processed {input_path}")

if __name__ == "__main__":
    remove_white_background("team_logo.png")
    remove_white_background("anniversary_mascot.png")
