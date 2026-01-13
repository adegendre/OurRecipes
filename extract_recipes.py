#!/usr/bin/env python3
"""
Recipe Extraction Script
Extracts recipes from RTF file and converts to JSON format
"""

import re
import json
from striprtf.striprtf import rtf_to_text
from deep_translator import GoogleTranslator
import time


def is_french_text(text):
    """Detect if text is primarily in French"""
    french_indicators = [
        'de ', ' du ', ' la ', ' le ', ' les ', 'dans ', 'avec ', 'pour ',
        'cuill', 'grammes', 'oeufs', 'farine', 'sucre', 'beurre', 'lait',
        'soupe', 'four', 'mélanger', 'ajouter', 'moitié', 'préchauffer'
    ]
    text_lower = text.lower()
    count = sum(1 for indicator in french_indicators if indicator in text_lower)
    return count >= 2


def is_spanish_text(text):
    """Detect if text is primarily in Spanish"""
    spanish_indicators = [
        'pimentoncitos', 'rellenos', 'queso', 'chorizo español', 'paprika ahumada',
        'pepas', 'se parten', 'se hierven', 'se cocina', 'se revuelve', 'se llenan'
    ]
    text_lower = text.lower()
    return any(indicator in text_lower for indicator in spanish_indicators)


def translate_text(text, keep_dish_names=True):
    """Translate French text to English while preserving food names"""
    if not text or len(text.strip()) == 0:
        return text

    # Don't translate if it's Spanish
    if is_spanish_text(text):
        return text

    # Don't translate if it's already English or very short
    if not is_french_text(text) or len(text) < 10:
        return text

    try:
        translator = GoogleTranslator(source='fr', target='en')
        # API rate limiting
        time.sleep(0.5)

        # Split by sentences to handle long text
        if len(text) > 4500:
            sentences = text.split('. ')
            translated = []
            for sentence in sentences:
                if sentence.strip() and len(sentence) > 5:
                    trans = translator.translate(sentence[:4500])
                    translated.append(trans)
                    time.sleep(0.5)
            return '. '.join(translated)
        else:
            return translator.translate(text)
    except Exception as e:
        print(f"  Translation error: {e}")
        return text


def guess_category(title, ingredients, instructions):
    """Guess recipe category based on content"""
    title_lower = title.lower()
    content = (title + " " + " ".join(ingredients) + " " + instructions).lower()

    if any(word in title_lower for word in ['cookie', 'cake', 'bread', 'waffle', 'pancake', 'granola', 'clafoutis', 'tarte', 'ice cream', 'glace', 'pudding']):
        return "Dessert"
    elif any(word in title_lower for word in ['salad', 'salade']):
        return "Salad"
    elif any(word in title_lower for word in ['soup', 'soupe', 'pho', 'dal']):
        return "Soup"
    elif any(word in title_lower for word in ['sauce', 'dressing', 'glaze', 'aioli', 'hummus', 'guac', 'chutney', 'tahini', 'jam', 'confit', 'vinaigrette', 'aji', 'chimichurri']):
        return "Sauce/Condiment"
    elif any(word in content for word in ['beef', 'pork', 'lamb', 'ribs', 'boeuf', 'poulet', 'chicken', 'stroganoff', 'meatball', 'meat']):
        return "Main"
    elif any(word in content for word in ['fish', 'salmon', 'ceviche', 'prawn', 'seafood']):
        return "Main"
    elif any(word in title_lower for word in ['breakfast', 'chia']):
        return "Breakfast"
    elif any(word in title_lower for word in ['lasagna', 'moussaka', 'pasta', 'rice', 'couscous', 'tajine', 'enchiladas', 'bulgogi', 'pho', 'bo-bun']):
        return "Main"
    else:
        return "Side"


def extract_tags(title, ingredients, instructions, notes):
    """Extract tags for categorization"""
    content = (title + " " + " ".join(ingredients) + " " + instructions + " " + notes).lower()

    tags = {
        "type": [],
        "region": [],
        "meal": [],
        "source": []
    }

    # Type tags
    if any(word in content for word in ['vegetarian', 'veggie', 'vegan']) or 'veggie' in title.lower():
        tags["type"].append("vegetarian")
    if any(word in content for word in ['keto', 'low-carb', 'low carb']):
        tags["type"].append("keto")
    if any(word in content for word in ['gluten-free', 'gluten free']):
        tags["type"].append("gluten-free")
    if any(word in content for word in ['dairy-free', 'dairy free']):
        tags["type"].append("dairy-free")

    # Region tags
    if any(word in content for word in ['thai', 'pho', 'bo-bun', 'bo bun', 'cambodian', 'vietnamese']):
        tags["region"].append("Thai/Vietnamese")
    if any(word in content for word in ['italian', 'pasta', 'lasagna', 'moussaka', 'parmigiana', 'bolognese']):
        tags["region"].append("Italian")
    if any(word in content for word in ['mexican', 'enchiladas', 'guac', 'ceviche', 'aji', 'latin', 'chimichurri']):
        tags["region"].append("Mexican/Latin")
    if any(word in content for word in ['french', 'clafoutis', 'tarte', 'blini']):
        tags["region"].append("French")
    if any(word in content for word in ['middle eastern', 'hummus', 'tahini', 'shakshuka', 'taboul', 'couscous', 'tajine', 'falafel']):
        tags["region"].append("Middle Eastern")
    if any(word in content for word in ['asian', 'japanese', 'korean', 'szechuan', 'sichuan', 'miso', 'bulgogi', 'shoyu']):
        tags["region"].append("Asian")
    if any(word in content for word in ['ottolenghi']):
        tags["region"].append("Middle Eastern")
    if any(word in content for word in ['indian', 'curry', 'dal']):
        tags["region"].append("Indian")

    # Meal tags
    if any(word in content for word in ['breakfast', 'waffle', 'pancake']):
        tags["meal"].append("breakfast")
    if any(word in content for word in ['dessert', 'cookie', 'cake']):
        tags["meal"].append("dessert")

    # Source tags
    if 'ottolenghi' in content:
        tags["source"].append("Ottolenghi")
    if 'jamie oliver' in content:
        tags["source"].append("Jamie Oliver")
    if 'new york times' in content:
        tags["source"].append("New York Times")

    return tags


def is_recipe_title(line):
    """Determine if a line is likely a recipe title"""
    # Skip common non-recipe patterns
    skip_patterns = [
        r'^(For|Makes|Serves|Pour)\s+\d+',  # Serving sizes
        r'^(Ingredients?|Instructions?|Toppings?|Modifications?|Source|Preparation|Method)\s*:?$',  # Section headers
        r'^https?://',  # URLs
        r'^www\.',  # URLs
        r'^\d+[\.\)]\s',  # Numbered lists
    ]

    for pattern in skip_patterns:
        if re.match(pattern, line, re.IGNORECASE):
            return False

    # Recipe title patterns
    if line.endswith(':'):
        return len(line) < 150

    # Title-like patterns (proper case, reasonable length, no action verbs at start)
    if len(line) > 5 and len(line) < 100:
        # Check if it starts with capital letter and doesn't start with common ingredient amounts
        if line[0].isupper() and not re.match(r'^\d+\.?\d*\s', line):
            # Doesn't start with action verbs
            action_starts = ['Add', 'Mix', 'Cook', 'Bake', 'Heat', 'Serve', 'Pour', 'Remove', 'Stir', 'Blend', 'Boil', 'Simmer']
            if not any(line.startswith(verb) for verb in action_starts):
                # Contains recipe-like words or is a proper dish name
                recipe_indicators = ['cake', 'bread', 'soup', 'salad', 'sauce', 'chicken', 'beef', 'pork', 'fish']
                if any(indicator in line.lower() for indicator in recipe_indicators):
                    return True

    return False


def parse_recipes_from_text(text):
    """Parse recipes from plain text"""
    recipes = []
    lines = text.split('\n')

    # Clean lines
    cleaned_lines = []
    for line in lines:
        line = line.strip()
        # Remove bullet points
        line = re.sub(r'^[\u2022\u2023\u2043\u204C\u204D\u2219\u25C9\u25D8\u25E6\u2619\u2765\u2767\u29BE\u29BF\-•◦]+\s*', '', line)
        if line:
            cleaned_lines.append(line)

    lines = cleaned_lines

    i = 0
    while i < len(lines):
        line = lines[i]

        # Skip header and reference URLs at the start
        if 'OUR RECIPES' in line or (i < 10 and line.startswith('http') and len(lines[i-1] if i > 0 else '') < 5):
            i += 1
            continue

        # Check if this is a recipe title
        if is_recipe_title(line):
            title = line.rstrip(':').strip()

            # Start collecting recipe
            recipe = {
                'title': title,
                'ingredients': [],
                'instructions': '',
                'notes': ''
            }

            i += 1
            instruction_parts = []

            # Collect recipe content until next recipe or end
            while i < len(lines):
                line = lines[i]

                # Check if we hit the next recipe title
                if is_recipe_title(line):
                    # Don't consume this line, it's the next recipe
                    break

                # URLs and web references go to notes
                if 'http' in line or 'www.' in line:
                    recipe['notes'] += line + ' '
                    i += 1
                    continue

                # Check for "we found this recipe" or similar notes
                if any(phrase in line.lower() for phrase in ['we found', 'we learned', 'source:', 'recipe from', 'our favorite']):
                    recipe['notes'] += line + ' '
                    i += 1
                    continue

                # Serving size info (e.g., "For 4 people", "Makes 6")
                if re.match(r'^(For|Makes|Serves|Pour)\s+\d+', line, re.IGNORECASE):
                    recipe['notes'] += line + ' '
                    i += 1
                    continue

                # Check if it's an instruction line (contains action verbs)
                action_verbs = ['mix', 'add', 'cook', 'bake', 'preheat', 'heat', 'serve', 'pour', 'place',
                                'remove', 'stir', 'blend', 'boil', 'simmer', 'grill', 'fry', 'melt',
                                'whisk', 'combine', 'prepare', 'sauté', 'marinate', 'bring', 'reduce',
                                'brown', 'chop', 'dice', 'slice', 'mince', 'fold', 'spread', 'layer',
                                'oven', 'bake', 'roast', 'toast',
                                'chauffez', 'ajoutez', 'mélangez', 'faites', 'laissez', 'couvrez',
                                'pelez', 'coupez', 'versez', 'préchauffer', 'enfourner']

                is_instruction = any(verb in line.lower() for verb in action_verbs)

                if is_instruction:
                    instruction_parts.append(line)
                else:
                    # It's likely an ingredient
                    recipe['ingredients'].append(line)

                i += 1

            recipe['instructions'] = ' '.join(instruction_parts)

            # Only add if it has substantive content
            if len(recipe['ingredients']) > 0 or len(recipe['instructions']) > 50:
                recipes.append(recipe)

        else:
            i += 1

    return recipes


def format_recipe(recipe_data):
    """Format a single recipe for JSON output"""
    title = recipe_data['title']
    ingredients_raw = recipe_data['ingredients']
    instructions_raw = recipe_data['instructions']
    notes_raw = recipe_data['notes']

    # Determine if this is a French recipe (to translate)
    content_sample = title + ' ' + ' '.join(ingredients_raw[:5]) + ' ' + instructions_raw[:200]
    is_french = is_french_text(content_sample)
    is_spanish = is_spanish_text(content_sample)

    # Translate if needed (but keep title if it's a French dish name)
    if is_french and not is_spanish:
        print(f"  Translating from French...")
        ingredients = []
        for ing in ingredients_raw:
            if ing.strip():
                try:
                    translated = translate_text(ing, keep_dish_names=True)
                    ingredients.append(translated)
                except Exception as e:
                    print(f"    Error translating ingredient: {e}")
                    ingredients.append(ing)

        try:
            instructions = translate_text(instructions_raw, keep_dish_names=True)
        except Exception as e:
            print(f"    Error translating instructions: {e}")
            instructions = instructions_raw

        try:
            notes = translate_text(notes_raw, keep_dish_names=True) if notes_raw else ""
        except Exception as e:
            print(f"    Error translating notes: {e}")
            notes = notes_raw
    else:
        ingredients = ingredients_raw
        instructions = instructions_raw
        notes = notes_raw

    # Clean up
    ingredients = [ing.strip() for ing in ingredients if ing.strip()]
    instructions = instructions.strip()
    notes = notes.strip()

    # Guess category
    category = guess_category(title, ingredients, instructions)

    # Extract tags
    tags = extract_tags(title, ingredients, instructions, notes)

    return {
        "title": title,
        "category": category,
        "ingredients": ingredients,
        "instructions": instructions,
        "notes": notes,
        "tags": tags
    }


def main():
    input_file = "/Users/dea3/Desktop/Dev/Claude Code tests/Recipes app /our_recipes.rtf"
    output_file = "/Users/dea3/Desktop/Dev/Claude Code tests/Recipes app /recipes_import.json"

    print("Starting recipe extraction...")

    # Read RTF file
    print("Reading RTF file...")
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        rtf_content = f.read()

    # Convert RTF to text
    print("Converting RTF to plain text...")
    text = rtf_to_text(rtf_content)

    # Parse recipes
    print("Parsing recipes...")
    recipes_raw = parse_recipes_from_text(text)
    print(f"Found {len(recipes_raw)} recipes")

    # Format recipes
    print("\nFormatting and translating recipes...")
    recipes_formatted = []
    for i, recipe in enumerate(recipes_raw):
        print(f"[{i+1}/{len(recipes_raw)}] {recipe['title']}")
        try:
            formatted = format_recipe(recipe)
            recipes_formatted.append(formatted)
        except Exception as e:
            print(f"  ERROR: {e}")
            import traceback
            traceback.print_exc()
            continue

    # Save to JSON
    print(f"\nSaving {len(recipes_formatted)} recipes to JSON...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(recipes_formatted, f, indent=2, ensure_ascii=False)

    print(f"\nDone! Saved to {output_file}")
    print(f"Total recipes: {len(recipes_formatted)}")

    # Print summary
    if recipes_formatted:
        categories = {}
        for recipe in recipes_formatted:
            cat = recipe['category']
            categories[cat] = categories.get(cat, 0) + 1

        print("\nRecipes by category:")
        for cat, count in sorted(categories.items()):
            print(f"  {cat}: {count}")

        # Sample titles
        print("\nSample recipe titles:")
        for recipe in recipes_formatted[:10]:
            print(f"  - {recipe['title']}")


if __name__ == "__main__":
    main()
