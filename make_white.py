from PIL import Image
import os

def create_white_logo(input_path, output_path):
    if not os.path.exists(input_path):
        return
        
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    for item in datas:
        # 如果不是透明的，就變成純白
        if item[3] > 0:
            newData.append((255, 255, 255, 255))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Created white logo at {output_path}")

if __name__ == "__main__":
    create_white_logo("team_logo.png", "team_logo_white.png")
