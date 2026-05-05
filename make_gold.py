from PIL import Image
import os

def create_gold_logo(input_path, output_path, gold_color=(212, 175, 55)):
    if not os.path.exists(input_path):
        return
        
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    for item in datas:
        # 如果不是透明的，就變成金色
        if item[3] > 0:
            newData.append((gold_color[0], gold_color[1], gold_color[2], 255))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Created gold logo at {output_path}")

if __name__ == "__main__":
    # 使用之前已經去背並實心化的 team_logo.png 作為來源
    create_gold_logo("team_logo.png", "team_logo_gold.png")
