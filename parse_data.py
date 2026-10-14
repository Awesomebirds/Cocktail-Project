import json
import re

FEATURED_NAMES = [
    "진 토닉",
    "스크루드라이버",
    "씨 브리즈",
    "베이 브리즈",
    "코스모폴리탄",
    "섹스 온 더 비치",
    "쿠바 리브레",
    "다이키리",
    "마가리타",
    "데킬라 선라이즈",
    "엘 디아블로 스타일",
    "갓파더",
    "아마레또 사워",
    "롱 아일랜드 아이스티",
    "피치 크러시",
    "옥보단",
    "모스크바 뮬"
]

def parse_database(md_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    inventory = {
        "liquor": [],
        "mixers": [],
        "garnishes": []
    }

    inv_section = re.search(r'## 보유 재료(.*?)(?=## 칵테일|\Z)', content, re.DOTALL)
    if inv_section:
        inv_text = inv_section.group(1)
        
        liq_match = re.search(r'### 주류(.*?)(?=###|\Z)', inv_text, re.DOTALL)
        if liq_match:
            inventory["liquor"] = [line.strip('- \r\t').strip() for line in liq_match.group(1).strip().split('\n') if line.strip().startswith('-') and line.strip('- \r\t').strip()]
            
        mix_match = re.search(r'### 주스 · 탄산 · 기타 음료(.*?)(?=###|\Z)', inv_text, re.DOTALL)
        if mix_match:
            inventory["mixers"] = [line.strip('- \r\t').strip() for line in mix_match.group(1).strip().split('\n') if line.strip().startswith('-') and line.strip('- \r\t').strip()]
            
        gar_match = re.search(r'### 과일 · 가니시 · 시럽(.*?)(?=###|\Z)', inv_text, re.DOTALL)
        if gar_match:
            inventory["garnishes"] = [line.strip('- \r\t').strip() for line in gar_match.group(1).strip().split('\n') if line.strip().startswith('-') and line.strip('- \r\t').strip()]

    cocktails = []
    cocktail_blocks = re.findall(r'###\s+([A-Z]+-\d+)\s+[—–-]\s+([^\n]+)\n(.*?)(?=\n###|\Z)', content, re.DOTALL)

    def determine_category(code, base):
        code_prefix = code.split('-')[0].upper()
        if code_prefix == 'GIN':
            return 'gin', '진'
        elif code_prefix == 'VOD':
            return 'vodka', '보드카'
        elif code_prefix == 'RUM':
            return 'rum', '럼'
        elif code_prefix == 'TEQ':
            return 'tequila', '데킬라'
        elif code_prefix == 'WHI':
            return 'whisky', '위스키'
        elif code_prefix == 'LIQ':
            return 'liqueur', '리큐르'
        elif code_prefix == 'DES':
            return 'dessert', '디저트'
        elif code_prefix == 'MIX':
            return 'cocktail', '믹스'
        return 'other', base

    for code, name, body in cocktail_blocks:
        code = code.strip()
        name = name.strip()
        
        base_match = re.search(r'-\s+\*\*베이스:\*\*\s*(.+)', body)
        base = base_match.group(1).strip() if base_match else ""
        
        cat_key, cat_name = determine_category(code, base)

        style_match = re.search(r'-\s+\*\*스타일:\*\*\s*(.+)', body)
        style = style_match.group(1).strip() if style_match else ""

        ingredients = []
        ing_block = re.search(r'-\s+\*\*재료:\*\*\s*\n((?:\s+-\s+.+\n?)+)', body)
        if ing_block:
            for line in ing_block.group(1).strip().split('\n'):
                line = line.strip('- \t')
                if ':' in line:
                    item, amt = line.split(':', 1)
                    ingredients.append({"item": item.strip(), "amount": amt.strip()})
                elif line:
                    ingredients.append({"item": line.strip(), "amount": ""})

        method_match = re.search(r'-\s+\*\*제조:\*\*\s*(.+)', body)
        method = method_match.group(1).strip() if method_match else ""

        garnish_match = re.search(r'-\s+\*\*가니시:\*\*\s*(.+)', body)
        garnish = garnish_match.group(1).strip() if garnish_match else ""

        desc_match = re.search(r'-\s+\*\*설명:\*\*\s*(.+)', body)
        desc = desc_match.group(1).strip() if desc_match else ""

        abv_match = re.search(r'-\s+\*\*도수:\*\*\s*(.+)', body)
        abv_text = abv_match.group(1).strip() if abv_match else ""
        abv_num = 0
        num_m = re.search(r'(\d+)', abv_text)
        if num_m:
            abv_num = int(num_m.group(1))

        sweet_match = re.search(r'-\s+\*\*단맛:\*\*\s*(\d+)/5', body)
        sweetness = int(sweet_match.group(1)) if sweet_match else 0

        sour_match = re.search(r'-\s+\*\*산미:\*\*\s*(\d+)/5', body)
        sourness = int(sour_match.group(1)) if sour_match else 0

        glass = "하이볼 글래스" if "롱드링크" in style or "토닉" in name or "소다" in name or "피즈" in name or "콜린스" in name or "크러시" in name or "옥보단" in name or "아이스티" in name or "뮬" in name else "칵테일 글래스"
        if "온더락" in method:
            glass = "온더락 글래스"

        is_featured = name in FEATURED_NAMES or any(f.replace(' ', '') == name.replace(' ', '') for f in FEATURED_NAMES)

        cocktails.append({
            "id": code,
            "name": name,
            "category": cat_key,
            "categoryName": cat_name,
            "base": base,
            "style": style,
            "glass": glass,
            "ingredients": ingredients,
            "method": method,
            "garnish": garnish,
            "description": desc,
            "abvText": abv_text,
            "abv": abv_num,
            "sweetness": sweetness,
            "sourness": sourness,
            "image": f"images/{code}.jpg",
            "featured": is_featured
        })

    data = {
        "party": {
            "title": "Cocktail Party Menu",
            "subtitle": "Private Bar Selection",
            "description": "다양한 칵테일 레시피와 맞춤 칵테일을 즐겨보세요."
        },
        "inventory": inventory,
        "cocktails": cocktails
    }

    with open('cocktails.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    featured_count = sum(1 for c in cocktails if c.get('featured'))
    print(f"Parsed {len(cocktails)} cocktails successfully (Featured: {featured_count}).")

if __name__ == '__main__':
    parse_database('cocktail_database.md')
