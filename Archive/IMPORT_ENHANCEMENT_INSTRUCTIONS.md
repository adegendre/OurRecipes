# Enhanced Import Feature - Installation Guide

This guide shows you how to upgrade your recipe app to support importing from multiple formats:
- ✅ Plain text
- ✅ Markdown (.md files)
- ✅ Apple Notes (copy/paste)
- ✅ JSON (existing)
- ✅ Rich text formats

## What's Improved?

### Better Format Detection
- Handles recipes with different section headers
- Recognizes bullets (•, -, *, numbers, etc.)
- Detects decorated titles (═══, ###, **)
- Finds ingredients even without "Ingredients:" header

### Smarter Parsing
- Auto-detects categories from keywords
- Finds tags mentioned anywhere in the text
- Handles "You'll need" or "You will need" for ingredients
- Recognizes emoji indicators (💡 for notes)

### More Flexible
- Works with Apple Notes formatting
- Handles Markdown formatting
- Recognizes multiple instruction headers (Method, Directions, Steps, etc.)

## Installation Steps

### Option 1: Replace the parseText Function (Recommended)

1. Open `recipe-app.jsx` in your editor
2. Find the `parseText:` function (around line 144)
3. Replace the entire `parseText` function with the new one from `recipe-app-enhanced.jsx`
4. Also copy the `parseRecipeBlock` helper function to the same location

### Option 2: Full Code Replacement

Replace lines 144-227 in `recipe-app.jsx` with the contents of `recipe-app-enhanced.jsx`.

## Supported Import Formats

### 1. Plain Text Format

```
CHOCOLATE CHIP COOKIES
Category: Dessert

Ingredients:
- 2 cups flour
- 1 cup sugar
- 2 eggs
- 1 cup chocolate chips

Instructions:
Mix all ingredients. Bake at 350°F for 12 minutes.

Notes: Best served warm!
```

### 2. Markdown Format

```markdown
## Pasta Carbonara

**Category:** Main

### Ingredients
- 400g spaghetti
- 200g bacon
- 3 eggs
- Parmesan cheese

### Instructions
Cook pasta. Fry bacon. Mix eggs and cheese. Combine all.

> 💡 Add pasta water to make it creamy
```

### 3. Apple Notes Format

```
═══════════════════════
PANCAKES
═══════════════════════

YOU WILL NEED:
• 2 cups flour
• 2 eggs
• 1 3/4 cups milk

HOW TO MAKE:
Mix ingredients. Cook on griddle until golden.
```

### 4. Minimal Format (Still Works!)

```
Tomato Soup

2 cans tomatoes
1 onion
Salt and pepper

Sauté onion. Add tomatoes. Simmer 20 minutes.
```

## Testing the Enhancement

### Step 1: Test with Sample Text

Copy this sample recipe and paste it into your app:

```
CLASSIC GUACAMOLE
Category: Snack
Type: quick, few ingredients
Region: Latin America

INGREDIENTS:
- 3 ripe avocados
- 1 lime, juiced
- 1/2 teaspoon salt
- 2 tablespoons cilantro
- 1 tomato, diced

DIRECTIONS:
Mash avocados in a bowl. Add lime juice and salt. Mix in cilantro and tomato. Serve immediately with tortilla chips.

NOTES: Best made fresh, doesn't store well.
```

### Step 2: Verify Import

After pasting and importing:
- ✅ Title should be "Classic Guacamole"
- ✅ Category should be "Snack"
- ✅ Should have 5 ingredients
- ✅ Tags should include "quick", "few ingredients", "Latin America"
- ✅ Instructions and notes should be present

## Common Formats It Recognizes

### Section Headers
- Ingredients: / Ingredients / INGREDIENTS
- You'll need: / You will need:
- Instructions: / Directions: / Steps: / Method: / Preparation:
- Notes: / Tips: / Chef's notes:

### Bullet Styles
- Dashes: `- ingredient`
- Bullets: `• ingredient`
- Asterisks: `* ingredient`
- Numbers: `1. ingredient` or `1) ingredient`
- Circles: `○ ingredient`

### Title Formats
- Plain: `Recipe Title`
- Markdown: `## Recipe Title` or `**Recipe Title**`
- Decorated: `═══ Recipe Title ═══`
- ALL CAPS: `RECIPE TITLE`

## Import from Apple Notes

### Method 1: Copy/Paste
1. Open Apple Notes on your Mac
2. Select your recipe
3. Copy (⌘C)
4. In the recipe app, click "Manage Recipes"
5. Scroll to "📋 Paste Recipe Text"
6. Paste (⌘V)
7. Click "Import from Paste"

### Method 2: Export from Notes
1. In Apple Notes, select recipe
2. File → Export as Plain Text
3. Save the .txt file
4. In recipe app, use "Import from File"
5. Select the .txt file

## Import Multiple Recipes at Once

The parser can handle multiple recipes in one text file. Just separate them with:
- Double blank lines
- Horizontal rules (`---` or `===`)
- Markdown headers (`##`)

Example:
```
## Recipe 1
Ingredients...
Instructions...

---

## Recipe 2
Ingredients...
Instructions...
```

## Troubleshooting

### Recipes Not Parsing Correctly

**Problem**: Title not detected
- **Solution**: Make sure the title is in the first 5 lines and is between 3-100 characters

**Problem**: Ingredients not found
- **Solution**: Add "Ingredients:" header or use bullet points

**Problem**: Category wrong
- **Solution**: Add "Category: [name]" line or include category keywords

### Tags Not Auto-Detected

Tags are detected in two ways:
1. Explicit format: `Type: quick, comfort`
2. Inline detection: Keywords found anywhere in text

Valid tag options must match exactly from the predefined list.

## Need Help?

If recipes aren't importing correctly:
1. Check the format matches one of the examples above
2. Make sure there's an "Ingredients:" section
3. Ensure ingredients are on separate lines
4. Add blank lines between sections

## Future Enhancements

Possible additions:
- Import from websites (URL parsing)
- Photo OCR support
- Recipe card scanner
- Pinterest integration
- Automatic recipe detection from PDFs

---

**Enjoy your enhanced recipe importer!** 🍳
