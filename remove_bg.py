from PIL import Image
import os

def solidify_logo(input_path, target_color=(0, 31, 63)):
    if not os.path.exists(input_path):
        return
        
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    for item in datas:
        # 計算亮度
        brightness = (item[0] + item[1] + item[2]) // 3
        
        # 如果亮度低於 220 (代表是線條的部分)
        if brightness < 220:
            # 強制變為實心目標顏色 (深藍)
            newData.append((target_color[0], target_color[1], target_color[2], 255))
        else:
            # 否則完全透明
            newData.append((255, 255, 255, 0))
            
    img.putdata(newData)
    
    # 自動裁切邊緣
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(input_path, "PNG")
    print(f"Solidified {input_path} successfully.")

def clean_mascot(input_path):
    if not os.path.exists(input_path):
        return
    # 吉祥物不能實心化(多色)，我們只需加強去背深度
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()
    newData = []
    for item in datas:
        brightness = (item[0] + item[1] + item[2]) // 3
        if brightness > 230: # 提高門檻，吃掉邊緣雜訊
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
    img.putdata(newData)
    img.save(input_path, "PNG")
    print(f"Cleaned {input_path} successfully.")

if __name__ == "__main__":
    solidify_logo("team_logo.png")
    clean_mascot("anniversary_mascot.png")
