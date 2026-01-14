const { useState, useEffect, useRef } = React;

// Firebase auth and database are available from firebase-config.js
// auth and db are global variables

// Tag definitions
const TAG_CATEGORIES = {
  type: {
    label: 'Type',
    icon: '',
    options: ['spicy', 'comfort', 'quick', 'few ingredients', 'overnight', 'salad', 'slow-cooking', 'oven', 'barbecue', 'big crowd']
  },
  region: {
    label: 'Region',
    icon: '',
    options: ['Asia', 'France', 'Latin America', 'North America', 'Italy', 'Middle East', 'Other']
  },
  meal: {
    label: 'Meal',
    icon: '',
    options: ['brekkie', 'lunch/dinner', 'snack', 'dessert']
  },
  source: {
    label: 'Source',
    icon: '',
    options: ['Ottolenghi', 'Jamie Oliver', 'family', 'Other']
  }
};

// Helper to convert URLs in text to clickable links
const linkifyText = (text) => {
  if (!text) return text;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return React.createElement('a', {
        key: index,
        href: part,
        target: '_blank',
        rel: 'noopener noreferrer',
        style: { color: '#8b7355', textDecoration: 'underline' }
      }, part);
    }
    return part;
  });
};

// Helper to find similar recipes based on shared ingredients
const findSimilarRecipes = (recipe, allRecipes, maxResults = 4) => {
  if (!recipe || !allRecipes.length) return [];
  
  const recipeIngredients = new Set(recipe.ingredients.map(i => i.toLowerCase()));
  
  const scored = allRecipes
    .filter(r => r.id !== recipe.id)
    .map(r => {
      const otherIngredients = r.ingredients.map(i => i.toLowerCase());
      const sharedCount = otherIngredients.filter(i => recipeIngredients.has(i)).length;
      const totalUnique = new Set([...recipeIngredients, ...otherIngredients]).size;
      const similarity = totalUnique > 0 ? sharedCount / totalUnique : 0;
      const sharedIngredients = otherIngredients.filter(i => recipeIngredients.has(i));
      return { recipe: r, similarity, sharedCount, sharedIngredients };
    })
    .filter(item => item.sharedCount >= 2)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);
  
  return scored;
};

// Format converters
const formatConverters = {
  // Export to JSON
  toJSON: (recipes) => {
    return JSON.stringify(recipes, null, 2);
  },
  
  // Export to plain text (compatible with Notes app)
  toText: (recipes) => {
    return recipes.map(r => {
      const tagLines = r.tags ? Object.entries(r.tags)
        .filter(([_, tags]) => tags.length > 0)
        .map(([cat, tags]) => `${cat.charAt(0).toUpperCase() + cat.slice(1)}: ${tags.join(', ')}`)
        .join('\n') : '';
      
      return `═══════════════════════════════════
${r.title.toUpperCase()}
Category: ${r.category}
${tagLines ? `\n${tagLines}` : ''}
═══════════════════════════════════

INGREDIENTS:
${r.ingredients.map(i => `  • ${i}`).join('\n')}

INSTRUCTIONS:
${r.instructions}
${r.notes ? `\nNOTES: ${r.notes}` : ''}
`;
    }).join('\n\n');
  },
  
  // Export to Markdown
  toMarkdown: (recipes) => {
    return `# Our Family Recipes\n\n` + recipes.map(r => {
      const tagBadges = r.tags ? Object.entries(r.tags)
        .filter(([_, tags]) => tags.length > 0)
        .map(([cat, tags]) => tags.map(t => `\`${t}\``).join(' '))
        .join(' ') : '';
      
      return `## ${r.title}

**Category:** ${r.category}
${tagBadges ? `\n${tagBadges}\n` : ''}
### Ingredients
${r.ingredients.map(i => `- ${i}`).join('\n')}

### Instructions
${r.instructions}
${r.notes ? `\n> 💡 *${r.notes}*` : ''}

---
`;
    }).join('\n');
  },
  
  // Export to RTF (Rich Text Format)
  toRTF: (recipes) => {
    const escapeRTF = (text) => text.replace(/[\\{}]/g, '\\$&').replace(/\n/g, '\\line ');
    
    let rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl{\\f0 Georgia;}{\\f1 Arial;}}';
    rtf += '{\\colortbl;\\red139\\green115\\blue85;\\red74\\green64\\blue53;}';
    
    recipes.forEach(r => {
      rtf += `\\pard\\sb400\\sa200{\\f0\\fs36\\cf2\\b ${escapeRTF(r.title)}}\\par `;
      rtf += `{\\f1\\fs20\\cf1\\i ${escapeRTF(r.category)}}\\par `;
      
      // Add tags
      if (r.tags) {
        const tagText = Object.entries(r.tags)
          .filter(([_, tags]) => tags.length > 0)
          .map(([cat, tags]) => `${cat}: ${tags.join(', ')}`)
          .join(' | ');
        if (tagText) {
          rtf += `{\\f1\\fs18\\cf1 ${escapeRTF(tagText)}}\\par `;
        }
      }
      
      rtf += `\\par{\\f1\\fs24\\b Ingredients}\\par `;
      r.ingredients.forEach(i => {
        rtf += `{\\f1\\fs22 \\bullet  ${escapeRTF(i)}}\\par `;
      });
      rtf += `\\par{\\f1\\fs24\\b Instructions}\\par `;
      rtf += `{\\f1\\fs22 ${escapeRTF(r.instructions)}}\\par `;
      if (r.notes) {
        rtf += `\\par{\\f1\\fs20\\cf1\\i Note: ${escapeRTF(r.notes)}}\\par `;
      }
      rtf += `\\par\\pard\\brdrb\\brdrs\\brdrw10\\brsp20\\par `;
    });
    
    rtf += '}';
    return rtf;
  },
  
  // Enhanced text parser - handles plain text, Markdown, and Apple Notes format
  parseText: (text) => {
    const recipes = [];

    // Normalize line endings and clean up
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Remove excessive whitespace but preserve structure
    text = text.replace(/\n{4,}/g, '\n\n\n');

    // Try to split by common recipe separators
    // 1. Look for repeated separator characters (===, ---, ***)
    let blocks = text.split(/\n\s*[=\-*]{5,}\s*\n/);

    // 2. If that doesn't work, try splitting by double newlines before capitalized titles
    if (blocks.length === 1) {
      blocks = text.split(/\n\n+(?=[A-Z][A-Za-z\s]{3,50}(?:\n|$))/);
    }

    // 3. If still one block, try markdown headers
    if (blocks.length === 1) {
      blocks = text.split(/(?:^|\n)#{1,3}\s+/);
    }

    // Filter and parse blocks
    blocks = blocks.map(b => b.trim()).filter(b => b.length > 30);

    for (const block of blocks) {
      const recipe = parseRecipeBlock(block);
      if (recipe) {
        recipes.push(recipe);
      }
    }

    return recipes;
  },
  
  // Parse JSON
  parseJSON: (text) => {
    const data = JSON.parse(text);
    const recipes = Array.isArray(data) ? data : [data];
    return recipes.map(r => ({
      id: Date.now() + Math.random(),
      title: r.title || 'Untitled Recipe',
      category: r.category || 'Main',
      servings: r.servings || '',
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : (r.ingredients || '').split(',').map(i => i.trim()),
      instructions: r.instructions || '',
      notes: r.notes || '',
      tags: r.tags || { type: [], region: [], meal: [], source: [] }
    }));
  }
};

// Helper function to parse a single recipe block
function parseRecipeBlock(block) {
  const lines = block.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length < 3) return null;

  let title = '';
  let category = 'Main';
  let servings = '';
  let ingredients = [];
  let instructions = '';
  let notes = '';
  let tags = { type: [], region: [], meal: [], source: [] };

  // === TITLE EXTRACTION ===
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    let line = lines[i];

    const cleaned = line
      .replace(/^[=#*\-\s═]+/, '')
      .replace(/[=#*\-═]+$/, '')
      .replace(/\*\*/g, '')
      .replace(/__/g, '')
      .trim()
      .toUpperCase()
      .split(' ')
      .map(w => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');

    if (cleaned.length >= 3 &&
        cleaned.length <= 100 &&
        !cleaned.toLowerCase().includes('ingredient') &&
        !cleaned.toLowerCase().includes('instructions') &&
        !cleaned.toLowerCase().includes('serves')) {
      title = cleaned;
      break;
    }
  }

  if (!title) return null;

  // === CATEGORY DETECTION ===
  const categoryPatterns = [
    { pattern: /category[:\s]+([a-zA-Z\s]+)/i, direct: true },
    { pattern: /(?:breakfast|brekkie)/i, category: 'Breakfast' },
    { pattern: /(?:dessert|sweet|cake|cookie)/i, category: 'Dessert' },
    { pattern: /(?:soup|stew|broth)/i, category: 'Soup' },
    { pattern: /(?:salad)/i, category: 'Salad' },
    { pattern: /(?:snack|appetizer|starter)/i, category: 'Snack' },
    { pattern: /(?:drink|beverage|smoothie)/i, category: 'Drink' }
  ];

  for (const { pattern, category: cat, direct } of categoryPatterns) {
    const match = block.match(pattern);
    if (match) {
      category = direct ? match[1].trim() : cat;
      break;
    }
  }

  // === SERVINGS EXTRACTION ===
  const servingsPatterns = [
    /(?:serves?|servings?|makes?|yields?)[:\s]+([^\n]+)/i,
    /(?:for|feeds?)[:\s]+(\d+\s*(?:people|persons?|servings?))/i
  ];

  for (const pattern of servingsPatterns) {
    const match = block.match(pattern);
    if (match) {
      servings = match[1].trim();
      break;
    }
  }

  // === TAG EXTRACTION ===
  Object.keys(TAG_CATEGORIES).forEach(tagCat => {
    const explicitMatch = block.match(new RegExp(`${tagCat}[:\\s]+([^\n]+)`, 'i'));
    if (explicitMatch) {
      const foundTags = explicitMatch[1].split(/[,|]/).map(t => t.trim().toLowerCase());
      tags[tagCat] = foundTags.filter(t =>
        TAG_CATEGORIES[tagCat].options.some(opt => opt.toLowerCase() === t)
      );
    }

    if (tags[tagCat].length === 0) {
      const blockLower = block.toLowerCase();
      TAG_CATEGORIES[tagCat].options.forEach(option => {
        if (blockLower.includes(option.toLowerCase())) {
          tags[tagCat].push(option);
        }
      });
    }
  });

  // === INGREDIENTS EXTRACTION ===
  let ingMatch = block.match(/ingredients?[:\s]*\n+([\s\S]*?)(?=\n\s*(?:instructions?|directions?|steps?|method|preparation|notes?|tips?|serves?|makes?)\s*[:|\n]|$)/i);

  if (!ingMatch) {
    ingMatch = block.match(/you(?:'ll| will) need[:\s]*\n+([\s\S]*?)(?=\n\s*(?:instructions?|directions?|steps?|method|preparation|notes?|tips?)\s*[:|\n]|$)/i);
  }

  if (!ingMatch) {
    ingMatch = block.match(/what you need[:\s]*\n+([\s\S]*?)(?=\n\s*(?:instructions?|directions?|steps?|method|preparation|notes?|tips?)\s*[:|\n]|$)/i);
  }

  // Try to find a list of items before "instructions" or similar
  if (!ingMatch) {
    const listMatch = block.match(/((?:^|\n)[\s\-•*◦○▪▫●➤➢▸►▹][\s]*[^\n]+)+(?=\n\s*(?:instructions?|directions?|steps?|method|preparation)\s*[:|\n])/im);
    if (listMatch) {
      ingMatch = [null, listMatch[0]];
    }
  }

  if (ingMatch) {
    ingredients = ingMatch[1]
      .split('\n')
      .map(line => {
        return line
          .replace(/^[\s\-•*◦○▪▫●➤➢▸►▹\d.)\]]+/, '')
          .replace(/^[\d]+\s*[\/.\s]*[\d]*/, '')
          .trim();
      })
      .filter(line => {
        const lower = line.toLowerCase();
        return line.length > 1 &&
               line.length < 200 &&
               !lower.match(/^(ingredients?|you('ll| will) need|for the|topping|what you need)[:]*$/);
      });
  }

  // === INSTRUCTIONS EXTRACTION ===
  const instrPatterns = [
    /(?:instructions?|directions?|steps?|method|preparation)[:\s]*\n+([\s\S]*?)(?=\n\s*(?:notes?|tips?|chef'?s? notes?|serves?|makes?)\s*[:|\n]|$)/i,
    /(?:how to make|to prepare|what to do)[:\s]*\n+([\s\S]*?)(?=\n\s*(?:notes?|tips?|serves?|makes?)\s*[:|\n]|$)/i
  ];

  for (const pattern of instrPatterns) {
    const match = block.match(pattern);
    if (match) {
      instructions = match[1]
        .split(/\n+/)
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join(' ')
        .replace(/\s+/g, ' ')
        .replace(/^\d+[\.\)]\s*/g, '')
        .trim();
      break;
    }
  }

  // If no instructions found but we have ingredients, try to grab remaining text
  if (!instructions && ingredients.length > 0) {
    const afterIngredients = block.split(/ingredients?[:\s]*\n/i)[1];
    if (afterIngredients) {
      const lines = afterIngredients.split('\n');
      let foundEnd = false;
      const instrLines = [];
      for (const line of lines) {
        if (line.trim().match(/^[\s\-•*◦○▪▫●]/)) {
          // Still in ingredients
          continue;
        }
        if (line.trim().length > 0) {
          instrLines.push(line.trim());
          foundEnd = true;
        }
      }
      if (foundEnd && instrLines.length > 0) {
        instructions = instrLines.join(' ').replace(/\s+/g, ' ').trim();
      }
    }
  }

  // === NOTES EXTRACTION ===
  const notesPatterns = [
    /(?:notes?|tips?|chef'?s? notes?)[:\s]*(.+)/i,
    /💡\s*(.+)/
  ];

  for (const pattern of notesPatterns) {
    const match = block.match(pattern);
    if (match) {
      notes = match[1].trim();
      break;
    }
  }

  // === VALIDATION ===
  if (title && ingredients.length > 0) {
    return {
      id: Date.now() + Math.random(),
      title,
      category,
      servings,
      ingredients,
      instructions: instructions || 'No instructions provided',
      notes,
      tags
    };
  }

  return null;
}

// Wake Lock hook to keep screen on while cooking
const useWakeLock = () => {
  const [wakeLock, setWakeLock] = useState(null);
  const [isActive, setIsActive] = useState(false);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        const lock = await navigator.wakeLock.request('screen');
        setWakeLock(lock);
        setIsActive(true);
        
        lock.addEventListener('release', () => {
          setIsActive(false);
          setWakeLock(null);
        });
      }
    } catch (err) {
      console.log('Wake Lock error:', err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
      setIsActive(false);
    }
  };

  return { isActive, requestWakeLock, releaseWakeLock };
};

const SAMPLE_RECIPES = [
  {
    id: 1,
    title: "Grandma's Chocolate Chip Cookies",
    category: "Dessert",
    ingredients: ["flour", "butter", "chocolate chips", "sugar", "eggs", "vanilla"],
    instructions: "Cream butter and sugar. Add eggs and vanilla. Mix in flour. Fold in chocolate chips. Bake at 350°F for 10-12 minutes.",
    notes: "Double the chocolate chips for extra goodness!",
    tags: {
      type: ['comfort', 'quick'],
      region: ['North America'],
      meal: ['snack', 'dessert'],
      source: ['family']
    }
  },
  {
    id: 2,
    title: "Sunday Morning Pancakes",
    category: "Breakfast",
    ingredients: ["flour", "milk", "eggs", "butter", "baking powder", "maple syrup"],
    instructions: "Whisk dry ingredients. Add wet ingredients. Cook on griddle until bubbles form. Flip and cook until golden.",
    notes: "Add blueberries in summer!",
    tags: {
      type: ['comfort', 'quick', 'few ingredients'],
      region: ['North America'],
      meal: ['brekkie'],
      source: ['family']
    }
  },
  {
    id: 3,
    title: "Cozy Tomato Soup",
    category: "Soup",
    ingredients: ["tomatoes", "onion", "garlic", "basil", "cream", "butter"],
    instructions: "Sauté onion and garlic. Add tomatoes and simmer 20 min. Blend until smooth. Stir in cream and basil.",
    notes: "Perfect with grilled cheese sandwiches",
    tags: {
      type: ['comfort', 'few ingredients'],
      region: ['Other'],
      meal: ['lunch/dinner'],
      source: ['family']
    }
  }
];

// Authentication Component
function AuthScreen({ onAuthSuccess, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await auth.signInWithEmailAndPassword(email, password);
      onAuthSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await auth.sendPasswordResetEmail(email);
      setSuccess('Password reset email sent! Check your inbox.');
      setTimeout(() => {
        setShowResetPassword(false);
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={authStyles.container}>
      <div style={authStyles.card}>
        {onClose && (
          <button onClick={onClose} style={authStyles.closeButton}>×</button>
        )}
        <div style={authStyles.header}>
          <span style={authStyles.icon}>🍳</span>
          <h1 style={authStyles.title}>Our Recipes</h1>
          <p style={authStyles.subtitle}>Family Recipe Collection</p>
        </div>

        {!showResetPassword ? (
          <form onSubmit={handleSubmit} style={authStyles.form}>
            <h2 style={authStyles.formTitle}>Sign In</h2>

            {error && <div style={authStyles.error}>{error}</div>}
            {success && <div style={authStyles.success}>{success}</div>}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={authStyles.input}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
              style={authStyles.input}
            />

            <button type="submit" disabled={loading} style={authStyles.button}>
              {loading ? 'Please wait...' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={() => setShowResetPassword(true)}
              style={authStyles.linkButton}
            >
              Forgot password?
            </button>

            <p style={authStyles.contactText}>
              Don't have an account? Contact the administrator to get access.
            </p>
          </form>
        ) : (
          <form onSubmit={handlePasswordReset} style={authStyles.form}>
            <h2 style={authStyles.formTitle}>Reset Password</h2>

            {error && <div style={authStyles.error}>{error}</div>}
            {success && <div style={authStyles.success}>{success}</div>}

            <p style={authStyles.resetText}>
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={authStyles.input}
            />

            <button type="submit" disabled={loading} style={authStyles.button}>
              {loading ? 'Please wait...' : 'Send Reset Email'}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowResetPassword(false);
                setError('');
                setSuccess('');
              }}
              style={authStyles.linkButton}
            >
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// Main App with Authentication
function AppWithAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleAuthSuccess = () => {
    setUser(auth.currentUser);
    setShowAuthModal(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <FamilyRecipes
        user={user}
        onSignOut={handleSignOut}
        onRequestAuth={() => setShowAuthModal(true)}
      />
      {showAuthModal && (
        <div style={authStyles.modalOverlay} onClick={() => setShowAuthModal(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <AuthScreen onAuthSuccess={handleAuthSuccess} onClose={() => setShowAuthModal(false)} />
          </div>
        </div>
      )}
    </>
  );
}

function FamilyRecipes({ user, onSignOut, onRequestAuth }) {
  const [recipes, setRecipes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTagFilters, setActiveTagFilters] = useState({
    type: [],
    region: [],
    meal: [],
    source: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [isManaging, setIsManaging] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [exportFormat, setExportFormat] = useState('json');
  const [similarRecipes, setSimilarRecipes] = useState([]);
  const [newRecipe, setNewRecipe] = useState({
    title: '',
    category: 'Main',
    servings: '',
    ingredients: '',
    instructions: '',
    notes: '',
    tags: { type: [], region: [], meal: [], source: [] }
  });
  
  const fileInputRef = useRef(null);
  const { isActive: screenAwake, requestWakeLock, releaseWakeLock } = useWakeLock();

  useEffect(() => {
    loadRecipes();
  }, []);

  // Activate wake lock when viewing a recipe
  useEffect(() => {
    if (selectedRecipe) {
      requestWakeLock();
      setSimilarRecipes(findSimilarRecipes(selectedRecipe, recipes));
    } else {
      releaseWakeLock();
      setSimilarRecipes([]);
    }
    return () => {
      releaseWakeLock();
    };
  }, [selectedRecipe, recipes]);

  const loadRecipes = async () => {
    try {
      const snapshot = await db.collection('recipes').orderBy('title').get();
      if (!snapshot.empty) {
        const loadedRecipes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecipes(loadedRecipes);
      } else {
        // If no recipes exist, load sample recipes
        setRecipes(SAMPLE_RECIPES);
        // Optionally save sample recipes to Firestore
        for (const recipe of SAMPLE_RECIPES) {
          await db.collection('recipes').add(recipe);
        }
      }
    } catch (e) {
      console.error('Error loading recipes:', e);
      setRecipes([]);
    }
  };

  const saveRecipes = async (updatedRecipes) => {
    setRecipes(updatedRecipes);
    // Firestore saves happen in individual operations (add, update, delete)
    // This function now just updates local state
  };

  const categories = ['All', ...new Set(recipes.map(r => r.category))];

  // Check if any tag filters are active
  const hasActiveFilters = Object.values(activeTagFilters).some(arr => arr.length > 0);
  
  // Count active filters
  const activeFilterCount = Object.values(activeTagFilters).flat().length;

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = searchQuery === '' || 
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.ingredients.some(ing => ing.toLowerCase().includes(searchQuery.toLowerCase())) ||
      recipe.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || recipe.category === selectedCategory;
    
    // Check tag filters (recipe must match ALL selected tags within each category)
    const matchesTags = Object.entries(activeTagFilters).every(([category, selectedTags]) => {
      if (selectedTags.length === 0) return true;
      const recipeTags = recipe.tags?.[category] || [];
      return selectedTags.some(tag => recipeTags.includes(tag));
    });
    
    return matchesSearch && matchesCategory && matchesTags;
  });
  
  // Toggle a tag filter
  const toggleTagFilter = (category, tag) => {
    setActiveTagFilters(prev => {
      const current = prev[category];
      const updated = current.includes(tag)
        ? current.filter(t => t !== tag)
        : [...current, tag];
      return { ...prev, [category]: updated };
    });
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    setActiveTagFilters({ type: [], region: [], meal: [], source: [] });
    setSelectedCategory('All');
    setSearchQuery('');
  };

  const handleAddRecipe = async () => {
    if (!user) {
      onRequestAuth();
      return;
    }

    if (!newRecipe.title.trim()) return;

    const recipe = {
      title: newRecipe.title,
      category: newRecipe.category,
      servings: newRecipe.servings,
      ingredients: newRecipe.ingredients.split('\n').map(i => i.trim()).filter(i => i),
      instructions: newRecipe.instructions,
      notes: newRecipe.notes,
      tags: newRecipe.tags,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: user.uid
    };

    try {
      const docRef = await db.collection('recipes').add(recipe);
      const newRecipeWithId = { ...recipe, id: docRef.id };
      setRecipes([...recipes, newRecipeWithId]);
      setNewRecipe({ title: '', category: 'Main', servings: '', ingredients: '', instructions: '', notes: '', tags: { type: [], region: [], meal: [], source: [] } });
      setIsAddingNew(false);
    } catch (error) {
      console.error('Error adding recipe:', error);
      alert('Failed to add recipe. Please try again.');
    }
  };

  const handleDeleteRecipe = async (id) => {
    if (!user) {
      onRequestAuth();
      return;
    }

    if (!window.confirm('Are you sure you want to delete this recipe?')) {
      return;
    }

    try {
      await db.collection('recipes').doc(id).delete();
      setRecipes(recipes.filter(r => r.id !== id));
      setSelectedRecipe(null);
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Failed to delete recipe. Please try again.');
    }
  };

  const handleEditRecipe = () => {
    if (!user) {
      onRequestAuth();
      return;
    }

    // Populate the form with selected recipe data
    setNewRecipe({
      title: selectedRecipe.title,
      category: selectedRecipe.category,
      servings: selectedRecipe.servings || '',
      ingredients: selectedRecipe.ingredients.join('\n'),
      instructions: selectedRecipe.instructions,
      notes: selectedRecipe.notes || '',
      tags: selectedRecipe.tags || { type: [], region: [], meal: [], source: [] }
    });
    setEditingRecipeId(selectedRecipe.id);
    setIsEditing(true);
    setSelectedRecipe(null);
  };

  const handleUpdateRecipe = async () => {
    if (!user) {
      onRequestAuth();
      return;
    }

    if (!newRecipe.title.trim()) return;

    const updatedRecipe = {
      title: newRecipe.title,
      category: newRecipe.category,
      servings: newRecipe.servings,
      ingredients: newRecipe.ingredients.split('\n').map(i => i.trim()).filter(i => i),
      instructions: newRecipe.instructions,
      notes: newRecipe.notes,
      tags: newRecipe.tags,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      await db.collection('recipes').doc(editingRecipeId).update(updatedRecipe);
      const updatedRecipes = recipes.map(r =>
        r.id === editingRecipeId ? { ...r, ...updatedRecipe } : r
      );
      setRecipes(updatedRecipes);

      setNewRecipe({ title: '', category: 'Main', servings: '', ingredients: '', instructions: '', notes: '', tags: { type: [], region: [], meal: [], source: [] } });
      setIsEditing(false);
      setEditingRecipeId(null);
    } catch (error) {
      console.error('Error updating recipe:', error);
      alert('Failed to update recipe. Please try again.');
    }
  };

  // Export recipes in selected format
  const handleExport = (format) => {
    let content, mimeType, extension;
    
    switch (format) {
      case 'text':
        content = formatConverters.toText(recipes);
        mimeType = 'text/plain';
        extension = 'txt';
        break;
      case 'markdown':
        content = formatConverters.toMarkdown(recipes);
        mimeType = 'text/markdown';
        extension = 'md';
        break;
      case 'rtf':
        content = formatConverters.toRTF(recipes);
        mimeType = 'application/rtf';
        extension = 'rtf';
        break;
      case 'json':
      default:
        content = formatConverters.toJSON(recipes);
        mimeType = 'application/json';
        extension = 'json';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `family-recipes-${new Date().toISOString().split('T')[0]}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  // Copy to clipboard for sharing via Notes/Messages
  const handleCopyToClipboard = async () => {
    const text = formatConverters.toText(recipes);
    try {
      await navigator.clipboard.writeText(text);
      setImportStatus({ success: true, count: 0, message: 'Copied to clipboard!' });
      setTimeout(() => setImportStatus(null), 3000);
    } catch (err) {
      setImportStatus({ success: false, error: 'Could not copy to clipboard' });
      setTimeout(() => setImportStatus(null), 3000);
    }
  };

  // Import recipes from file (auto-detects format)
  const handleImport = (event) => {
    if (!user) {
      onRequestAuth();
      event.target.value = '';
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        let imported = [];
        
        // Auto-detect format
        const trimmed = content.trim();
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          // JSON format
          imported = formatConverters.parseJSON(content);
        } else {
          // Text/Markdown/other format
          imported = formatConverters.parseText(content);
        }
        
        if (imported.length > 0) {
          // Add each imported recipe to Firestore
          const newRecipes = [];
          for (const recipe of imported) {
            const recipeData = {
              ...recipe,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              createdBy: user.uid
            };
            delete recipeData.id; // Remove local ID
            const docRef = await db.collection('recipes').add(recipeData);
            newRecipes.push({ ...recipeData, id: docRef.id });
          }
          setRecipes([...recipes, ...newRecipes]);
          setImportStatus({ success: true, count: imported.length });
          setTimeout(() => setImportStatus(null), 3000);
        } else {
          setImportStatus({ success: false, error: 'No recipes found in file' });
          setTimeout(() => setImportStatus(null), 3000);
        }
      } catch (err) {
        setImportStatus({ success: false, error: 'Could not parse file' });
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };
  
  // Handle pasted text (for copying from Notes, web, etc.)
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  
  const handlePasteImport = async () => {
    if (!user) {
      onRequestAuth();
      return;
    }

    try {
      const imported = formatConverters.parseText(pasteText);
      if (imported.length > 0) {
        // Add each imported recipe to Firestore
        const newRecipes = [];
        for (const recipe of imported) {
          const recipeData = {
            ...recipe,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: user.uid
          };
          delete recipeData.id; // Remove local ID
          const docRef = await db.collection('recipes').add(recipeData);
          newRecipes.push({ ...recipeData, id: docRef.id });
        }
        setRecipes([...recipes, ...newRecipes]);
        setImportStatus({ success: true, count: imported.length });
        setShowPasteModal(false);
        setPasteText('');
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus({ success: false, error: 'No recipes found in text' });
        setTimeout(() => setImportStatus(null), 3000);
      }
    } catch (err) {
      setImportStatus({ success: false, error: 'Could not parse text' });
      setTimeout(() => setImportStatus(null), 3000);
    }
  };

  // Clear all recipes
  const handleClearAll = async () => {
    if (!user) {
      onRequestAuth();
      return;
    }

    if (window.confirm('Are you sure you want to delete ALL recipes? This cannot be undone.')) {
      try{
        // Delete all recipes from Firestore
        const batch = db.batch();
        const snapshot = await db.collection('recipes').get();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        setRecipes([]);
        setIsManaging(false);
      } catch (error) {
        console.error('Error clearing recipes:', error);
        alert('Failed to clear recipes. Please try again.');
      }
    }
  };

  // Reset to sample recipes
  const handleResetToSamples = async () => {
    if (!user) {
      onRequestAuth();
      return;
    }

    if (window.confirm('Reset to sample recipes? Your current recipes will be replaced.')) {
      try {
        // Delete all current recipes
        const batch = db.batch();
        const snapshot = await db.collection('recipes').get();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        // Add sample recipes
        const newRecipes = [];
        for (const recipe of SAMPLE_RECIPES) {
          const recipeData = {
            ...recipe,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: user.uid
          };
          delete recipeData.id;
          const docRef = await db.collection('recipes').add(recipeData);
          newRecipes.push({ ...recipeData, id: docRef.id });
        }
        setRecipes(newRecipes);
        setIsManaging(false);
      } catch (error) {
        console.error('Error resetting recipes:', error);
        alert('Failed to reset recipes. Please try again.');
      }
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Source+Sans+3:wght@300;400;500&display=swap');
        
        * { box-sizing: border-box; }
        
        ::placeholder { color: #a89f91; }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".json,.txt,.md,.rtf,.doc,.docx,text/*"
        style={{ display: 'none' }}
      />

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logoSection}>
            <span style={styles.icon}>🍳</span>
            <h1 style={styles.title}>Our Family Recipes</h1>
          </div>
          {user && (
            <button onClick={onSignOut} style={styles.signOutButton}>
              Sign Out
            </button>
          )}
        </div>
      </header>

      {/* Search & Filter Bar */}
      <div style={styles.searchSection}>
        <div style={styles.searchContainer}>
          <span style={styles.searchIcon}>◎</span>
          <input
            type="text"
            placeholder="Search by title, ingredient, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        
        <div style={styles.filterRow}>
          <div style={styles.categories}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  ...styles.categoryBtn,
                  ...(selectedCategory === cat ? styles.categoryBtnActive : {})
                }}
              >
                {cat}
              </button>
            ))}
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                ...styles.filterToggleBtn,
                ...(hasActiveFilters ? styles.filterToggleBtnActive : {})
              }}
            >
              Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
          </div>
          
          <div style={styles.actionButtons}>
            <button
              onClick={() => {
                if (!user) {
                  onRequestAuth();
                } else {
                  setIsManaging(true);
                }
              }}
              style={styles.manageBtn}
              title="Manage recipes"
            >
              ⚙️
            </button>
            <button
              onClick={() => {
                if (!user) {
                  onRequestAuth();
                } else {
                  setIsAddingNew(true);
                }
              }}
              style={styles.addBtn}
            >
              + Add Recipe
            </button>
          </div>
        </div>
        
        {/* Tag Filters Panel */}
        {showFilters && (
          <div style={styles.filtersPanel}>
            {Object.entries(TAG_CATEGORIES).map(([catKey, catInfo]) => (
              <div key={catKey} style={styles.filterCategory}>
                <div style={styles.filterCategoryHeader}>
                  <span style={styles.filterCategoryIcon}>{catInfo.icon}</span>
                  <span style={styles.filterCategoryLabel}>{catInfo.label}</span>
                </div>
                <div style={styles.filterTags}>
                  {catInfo.options.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTagFilter(catKey, tag)}
                      style={{
                        ...styles.filterTag,
                        ...(activeTagFilters[catKey].includes(tag) ? styles.filterTagActive : {})
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {hasActiveFilters && (
              <button onClick={clearAllFilters} style={styles.clearFiltersBtn}>
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Import Status Toast */}
      {importStatus && (
        <div style={{
          ...styles.toast,
          background: importStatus.success ? '#4a7c59' : '#8b4a4a'
        }}>
          {importStatus.success 
            ? importStatus.message || `✓ Imported ${importStatus.count} recipe${importStatus.count !== 1 ? 's' : ''}`
            : `✕ ${importStatus.error}`
          }
        </div>
      )}

      {/* Main Content */}
      <main style={styles.main}>
        {/* Recipe Grid */}
        <div style={styles.recipeGrid}>
          {filteredRecipes.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>No recipes found</p>
              <p style={styles.emptySubtext}>Try a different search or add a new recipe!</p>
            </div>
          ) : (
            filteredRecipes.map((recipe, index) => (
              <div
                key={recipe.id}
                onClick={() => setSelectedRecipe(recipe)}
                style={{
                  ...styles.recipeCard,
                  animationDelay: `${index * 0.05}s`
                }}
              >
                <div style={styles.cardCategory}>{recipe.category}</div>
                <h3 style={styles.cardTitle}>{recipe.title}</h3>
                {recipe.tags && Object.values(recipe.tags).flat().length > 0 && (
                  <div style={styles.cardTags}>
                    {Object.entries(recipe.tags).map(([cat, tags]) => 
                      tags.slice(0, 2).map(tag => (
                        <span key={`${cat}-${tag}`} style={styles.cardTag}>{tag}</span>
                      ))
                    ).flat().slice(0, 4)}
                  </div>
                )}
                <div style={styles.cardIngredients}>
                  {recipe.ingredients.slice(0, 4).map((ing, i) => (
                    <span key={i} style={styles.ingredientTag}>{ing}</span>
                  ))}
                  {recipe.ingredients.length > 4 && (
                    <span style={styles.moreTag}>+{recipe.ingredients.length - 4}</span>
                  )}
                </div>
                {recipe.notes && (
                  <p style={styles.cardNote}>"{recipe.notes}"</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Recipe Detail Modal */}
        {selectedRecipe && (
          <div style={styles.modalOverlay} onClick={() => setSelectedRecipe(null)}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setSelectedRecipe(null)}
                style={styles.closeBtn}
              >
                ✕
              </button>
              
              {/* Screen awake indicator */}
              <div style={styles.wakeLockIndicator}>
                <span style={{
                  ...styles.wakeLockDot,
                  background: screenAwake ? '#4a7c59' : '#ccc',
                  animation: screenAwake ? 'pulse 2s infinite' : 'none'
                }} />
                <span style={styles.wakeLockText}>
                  {screenAwake ? 'Screen stays on' : 'Screen may dim'}
                </span>
              </div>
              
              <div style={styles.modalCategory}>{selectedRecipe.category}</div>
              <h2 style={styles.modalTitle}>{selectedRecipe.title}</h2>
              
              {/* Tags display */}
              {selectedRecipe.tags && Object.values(selectedRecipe.tags).flat().length > 0 && (
                <div style={styles.modalTags}>
                  {Object.entries(selectedRecipe.tags).map(([catKey, tags]) => 
                    tags.length > 0 && (
                      <div key={catKey} style={styles.modalTagGroup}>
                        <span style={styles.modalTagIcon}>{TAG_CATEGORIES[catKey]?.icon}</span>
                        {tags.map(tag => (
                          <span key={tag} style={styles.modalTag}>{tag}</span>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}

              {selectedRecipe.servings && (
                <div style={styles.modalSection}>
                  <h4 style={styles.modalLabel}>Servings</h4>
                  <p style={styles.modalText}>{selectedRecipe.servings}</p>
                </div>
              )}

              <div style={styles.modalSection}>
                <h4 style={styles.modalLabel}>Ingredients</h4>
                <div style={styles.ingredientsList}>
                  {selectedRecipe.ingredients.map((ing, i) => (
                    <span key={i} style={styles.modalIngredient}>• {ing}</span>
                  ))}
                </div>
              </div>
              
              <div style={styles.modalSection}>
                <h4 style={styles.modalLabel}>Instructions</h4>
                <p style={styles.modalText}>{linkifyText(selectedRecipe.instructions)}</p>
              </div>

              {selectedRecipe.notes && (
                <div style={styles.notesBox}>
                  <p style={styles.notesText}>{linkifyText(selectedRecipe.notes)}</p>
                </div>
              )}

              {user && (
                <div style={styles.recipeActions}>
                  <button
                    onClick={handleEditRecipe}
                    style={styles.editBtn}
                  >
                    Edit Recipe
                  </button>
                  <button
                    onClick={() => handleDeleteRecipe(selectedRecipe.id)}
                    style={styles.deleteBtn}
                  >
                    Remove Recipe
                  </button>
                </div>
              )}
              
              {/* Similar Recipes Section */}
              {similarRecipes.length > 0 && (
                <div style={styles.similarSection}>
                  <h4 style={styles.similarTitle}>You might also like</h4>
                  <p style={styles.similarSubtitle}>Recipes with similar ingredients</p>
                  <div style={styles.similarGrid}>
                    {similarRecipes.map(({ recipe: r, sharedIngredients }) => (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRecipe(r)}
                        style={styles.similarCard}
                      >
                        <div style={styles.similarCardCategory}>{r.category}</div>
                        <div style={styles.similarCardTitle}>{r.title}</div>
                        <div style={styles.sharedIngredients}>
                          {sharedIngredients.slice(0, 3).map((ing, i) => (
                            <span key={i} style={styles.sharedTag}>{ing}</span>
                          ))}
                          {sharedIngredients.length > 3 && (
                            <span style={styles.sharedMore}>+{sharedIngredients.length - 3}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add/Edit Recipe Modal */}
        {(isAddingNew || isEditing) && (
          <div style={styles.modalOverlay} onClick={() => { setIsAddingNew(false); setIsEditing(false); }}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
              <button
                onClick={() => { setIsAddingNew(false); setIsEditing(false); }}
                style={styles.closeBtn}
              >
                ✕
              </button>

              <h2 style={styles.modalTitle}>{isEditing ? 'Edit Recipe' : 'Add New Recipe'}</h2>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Recipe Title</label>
                <input
                  type="text"
                  value={newRecipe.title}
                  onChange={(e) => setNewRecipe({...newRecipe, title: e.target.value})}
                  placeholder="What are we making?"
                  style={styles.formInput}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Category</label>
                <select
                  value={newRecipe.category}
                  onChange={(e) => setNewRecipe({...newRecipe, category: e.target.value})}
                  style={styles.formSelect}
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Main">Main</option>
                  <option value="Soup">Soup</option>
                  <option value="Salad">Salad</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Snack">Snack</option>
                  <option value="Drink">Drink</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Servings (optional)</label>
                <input
                  type="text"
                  value={newRecipe.servings}
                  onChange={(e) => setNewRecipe({...newRecipe, servings: e.target.value})}
                  placeholder="e.g., 'For 6 people' or 'Makes 20 crepes'"
                  style={styles.formInput}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Ingredients (one per line)</label>
                <textarea
                  value={newRecipe.ingredients}
                  onChange={(e) => setNewRecipe({...newRecipe, ingredients: e.target.value})}
                  placeholder="2 cups flour&#10;1 cup sugar&#10;1/2 cup butter&#10;2 eggs"
                  style={styles.formTextarea}
                  rows={6}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Instructions</label>
                <textarea
                  value={newRecipe.instructions}
                  onChange={(e) => setNewRecipe({...newRecipe, instructions: e.target.value})}
                  placeholder="How do we make it?"
                  style={styles.formTextarea}
                  rows={4}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Notes (optional)</label>
                <input
                  type="text"
                  value={newRecipe.notes}
                  onChange={(e) => setNewRecipe({...newRecipe, notes: e.target.value})}
                  placeholder="Any special tips or memories?"
                  style={styles.formInput}
                />
              </div>
              
              {/* Tag selectors */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Tags</label>
                <div style={styles.tagSelectorsContainer}>
                  {Object.entries(TAG_CATEGORIES).map(([catKey, catInfo]) => (
                    <div key={catKey} style={styles.tagSelector}>
                      <div style={styles.tagSelectorHeader}>
                        <span>{catInfo.icon}</span>
                        <span style={styles.tagSelectorLabel}>{catInfo.label}</span>
                      </div>
                      <div style={styles.tagSelectorOptions}>
                        {catInfo.options.map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              const current = newRecipe.tags[catKey];
                              const updated = current.includes(tag)
                                ? current.filter(t => t !== tag)
                                : [...current, tag];
                              setNewRecipe({
                                ...newRecipe,
                                tags: { ...newRecipe.tags, [catKey]: updated }
                              });
                            }}
                            style={{
                              ...styles.tagOption,
                              ...(newRecipe.tags[catKey].includes(tag) ? styles.tagOptionActive : {})
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                onClick={isEditing ? handleUpdateRecipe : handleAddRecipe}
                style={styles.submitBtn}
              >
                {isEditing ? 'Update Recipe' : 'Save Recipe'}
              </button>
            </div>
          </div>
        )}

        {/* Manage Recipes Modal */}
        {isManaging && (
          <div style={styles.modalOverlay} onClick={() => setIsManaging(false)}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setIsManaging(false)}
                style={styles.closeBtn}
              >
                ✕
              </button>
              
              <h2 style={styles.modalTitle}>Manage Recipes</h2>
              <p style={styles.manageSubtitle}>Export, import, or reset your recipe collection</p>
              
              <div style={styles.manageSection}>
                <h4 style={styles.manageSectionTitle}>📤 Export</h4>
                <p style={styles.manageSectionDesc}>
                  Download your {recipes.length} recipes or copy to share via Messages/Notes.
                </p>
                
                <div style={styles.formatSelector}>
                  <label style={styles.formatLabel}>Format:</label>
                  <div style={styles.formatOptions}>
                    {[
                      { value: 'json', label: 'JSON', desc: 'Best for backup' },
                      { value: 'text', label: 'Text', desc: 'Notes app' },
                      { value: 'markdown', label: 'Markdown', desc: 'Formatted' },
                      { value: 'rtf', label: 'RTF', desc: 'Word/Pages' },
                    ].map(fmt => (
                      <button
                        key={fmt.value}
                        onClick={() => setExportFormat(fmt.value)}
                        style={{
                          ...styles.formatBtn,
                          ...(exportFormat === fmt.value ? styles.formatBtnActive : {})
                        }}
                      >
                        <span style={styles.formatBtnLabel}>{fmt.label}</span>
                        <span style={styles.formatBtnDesc}>{fmt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div style={styles.exportButtons}>
                  <button onClick={() => handleExport(exportFormat)} style={styles.manageActionBtn}>
                    Download File
                  </button>
                  <button onClick={handleCopyToClipboard} style={styles.manageActionBtnSecondary}>
                    📋 Copy to Clipboard
                  </button>
                </div>
              </div>
              
              <div style={styles.manageSection}>
                <h4 style={styles.manageSectionTitle}>📥 Import</h4>
                <p style={styles.manageSectionDesc}>
                  Add recipes from files (.json, .txt, .md, .rtf) or paste from Notes/web.
                </p>
                <div style={styles.importButtons}>
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    style={styles.manageActionBtn}
                  >
                    Choose File
                  </button>
                  <button 
                    onClick={() => { setShowPasteModal(true); setIsManaging(false); }}
                    style={styles.manageActionBtnSecondary}
                  >
                    📝 Paste Text
                  </button>
                </div>
              </div>
              
              <div style={styles.manageDivider} />
              
              <div style={styles.manageSection}>
                <h4 style={styles.manageSectionTitle}>🔄 Reset</h4>
                <p style={styles.manageSectionDesc}>
                  Start fresh with the sample recipes or clear everything.
                </p>
                <div style={styles.resetButtons}>
                  <button onClick={handleResetToSamples} style={styles.resetBtn}>
                    Reset to Samples
                  </button>
                  <button onClick={handleClearAll} style={styles.clearBtn}>
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Paste Text Modal */}
        {showPasteModal && (
          <div style={styles.modalOverlay} onClick={() => setShowPasteModal(false)}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setShowPasteModal(false)}
                style={styles.closeBtn}
              >
                ✕
              </button>
              
              <h2 style={styles.modalTitle}>Paste Recipe Text</h2>
              <p style={styles.manageSubtitle}>
                Paste recipes from Notes, web pages, or anywhere else. The app will try to detect recipe structure automatically.
              </p>
              
              <div style={styles.pasteHint}>
                <strong>Tip:</strong> For best results, include clear sections like "Ingredients:" and "Instructions:" in your text.
              </div>
              
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`Example format:

Chocolate Cake
Category: Dessert

Ingredients:
- flour
- sugar
- cocoa powder
- eggs

Instructions:
Mix dry ingredients, add wet ingredients, bake at 350°F for 30 minutes.

Notes: Mom's favorite!`}
                style={styles.pasteTextarea}
                rows={12}
              />
              
              <button 
                onClick={handlePasteImport}
                style={styles.submitBtn}
                disabled={!pasteText.trim()}
              >
                Import from Text
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>Copyright 2026 Alexandra de Gendre - All rights reserved - Made with Claude Code.</p>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #faf7f2 0%, #f5efe6 100%)',
    fontFamily: '"Source Sans 3", sans-serif',
    color: '#3d3629',
  },
  header: {
    background: 'linear-gradient(135deg, #e8dcc8 0%, #d4c4a8 100%)',
    padding: '48px 24px 40px',
    textAlign: 'center',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
  },
  headerContent: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  icon: {
    fontSize: '32px',
  },
  title: {
    fontFamily: '"Playfair Display", serif',
    fontSize: '36px',
    fontWeight: '600',
    margin: 0,
    color: '#2c2416',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '15px',
    color: '#6b5d4d',
    margin: 0,
    fontWeight: '300',
    fontStyle: 'italic',
  },
  searchSection: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px 24px 0',
  },
  searchContainer: {
    position: 'relative',
    marginBottom: '16px',
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#a89f91',
    fontSize: '18px',
  },
  searchInput: {
    width: '100%',
    padding: '14px 20px 14px 48px',
    fontSize: '15px',
    border: '2px solid #e0d6c8',
    borderRadius: '12px',
    background: '#fff',
    color: '#3d3629',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: '"Source Sans 3", sans-serif',
  },
  filterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  categories: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  categoryBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    border: 'none',
    borderRadius: '20px',
    background: 'rgba(0,0,0,0.04)',
    color: '#6b5d4d',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: '"Source Sans 3", sans-serif',
    fontWeight: '500',
  },
  categoryBtnActive: {
    background: '#4a4035',
    color: '#fff',
  },
  filterToggleBtn: {
    padding: '8px 14px',
    fontSize: '13px',
    border: '2px solid #e0d6c8',
    borderRadius: '20px',
    background: '#fff',
    color: '#6b5d4d',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: '"Source Sans 3", sans-serif',
    fontWeight: '500',
  },
  filterToggleBtnActive: {
    borderColor: '#8b7355',
    background: '#8b7355',
    color: '#fff',
  },
  filtersPanel: {
    marginTop: '16px',
    padding: '20px',
    background: '#fff',
    borderRadius: '16px',
    border: '1px solid #e8e0d4',
  },
  filterCategory: {
    marginBottom: '16px',
  },
  filterCategoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '10px',
  },
  filterCategoryIcon: {
    fontSize: '14px',
  },
  filterCategoryLabel: {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#4a4035',
  },
  filterTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  filterTag: {
    padding: '6px 12px',
    fontSize: '12px',
    border: '1px solid #e0d6c8',
    borderRadius: '16px',
    background: '#faf7f2',
    color: '#6b5d4d',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: '"Source Sans 3", sans-serif',
  },
  filterTagActive: {
    background: '#4a4035',
    borderColor: '#4a4035',
    color: '#fff',
  },
  clearFiltersBtn: {
    marginTop: '8px',
    padding: '8px 16px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '8px',
    background: 'transparent',
    color: '#a89080',
    cursor: 'pointer',
    fontFamily: '"Source Sans 3", sans-serif',
    textDecoration: 'underline',
  },
  cardTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginBottom: '10px',
  },
  cardTag: {
    fontSize: '10px',
    padding: '3px 8px',
    background: '#e8dcc8',
    borderRadius: '10px',
    color: '#6b5d4d',
    textTransform: 'lowercase',
  },
  modalTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '24px',
    paddingBottom: '20px',
    borderBottom: '1px solid #f0e8dc',
  },
  modalTagGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  modalTagIcon: {
    fontSize: '12px',
  },
  modalTag: {
    fontSize: '12px',
    padding: '4px 10px',
    background: '#f5f0e8',
    borderRadius: '12px',
    color: '#6b5d4d',
  },
  tagSelectorsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  tagSelector: {
    padding: '12px',
    background: '#faf7f2',
    borderRadius: '12px',
  },
  tagSelectorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '10px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#4a4035',
  },
  tagSelectorLabel: {
    fontSize: '12px',
  },
  tagSelectorOptions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  tagOption: {
    padding: '5px 10px',
    fontSize: '11px',
    border: '1px solid #e0d6c8',
    borderRadius: '12px',
    background: '#fff',
    color: '#6b5d4d',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: '"Source Sans 3", sans-serif',
  },
  tagOptionActive: {
    background: '#8b7355',
    borderColor: '#8b7355',
    color: '#fff',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  manageBtn: {
    padding: '10px 14px',
    fontSize: '16px',
    border: 'none',
    borderRadius: '8px',
    background: 'rgba(0,0,0,0.04)',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  addBtn: {
    padding: '10px 20px',
    fontSize: '14px',
    border: 'none',
    borderRadius: '8px',
    background: '#8b7355',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: '"Source Sans 3", sans-serif',
    fontWeight: '500',
    transition: 'background 0.2s',
  },
  toast: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 24px',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    zIndex: 2000,
    animation: 'fadeIn 0.3s ease-out',
  },
  main: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px',
    minHeight: '60vh',
  },
  recipeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '20px',
  },
  recipeCard: {
    background: '#fff',
    borderRadius: '16px',
    padding: '24px',
    cursor: 'pointer',
    border: '1px solid rgba(0,0,0,0.04)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    animation: 'fadeIn 0.4s ease-out forwards',
    opacity: 0,
  },
  cardCategory: {
    fontSize: '11px',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#8b7355',
    marginBottom: '8px',
  },
  cardTitle: {
    fontFamily: '"Playfair Display", serif',
    fontSize: '20px',
    fontWeight: '600',
    margin: '0 0 12px 0',
    color: '#2c2416',
    lineHeight: 1.3,
  },
  cardIngredients: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '12px',
  },
  ingredientTag: {
    fontSize: '12px',
    padding: '4px 10px',
    background: '#f5f0e8',
    borderRadius: '12px',
    color: '#6b5d4d',
  },
  moreTag: {
    fontSize: '12px',
    padding: '4px 10px',
    background: '#e8e0d4',
    borderRadius: '12px',
    color: '#8b7355',
    fontWeight: '500',
  },
  cardNote: {
    fontSize: '13px',
    color: '#8b7355',
    fontStyle: 'italic',
    margin: 0,
    lineHeight: 1.5,
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#4a4035',
    margin: '0 0 8px 0',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#8b7355',
    margin: 0,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(44, 36, 22, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: '#fff',
    borderRadius: '20px',
    padding: '32px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '85vh',
    overflow: 'auto',
    position: 'relative',
    animation: 'slideIn 0.3s ease-out',
  },
  closeBtn: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#a89f91',
    padding: '4px',
  },
  wakeLockIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  wakeLockDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  wakeLockText: {
    fontSize: '11px',
    color: '#a89f91',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  modalCategory: {
    fontSize: '11px',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#8b7355',
    marginBottom: '8px',
  },
  modalTitle: {
    fontFamily: '"Playfair Display", serif',
    fontSize: '28px',
    fontWeight: '600',
    margin: '0 0 24px 0',
    color: '#2c2416',
    paddingRight: '32px',
  },
  modalSection: {
    marginBottom: '24px',
  },
  modalLabel: {
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#6b5d4d',
    margin: '0 0 12px 0',
  },
  ingredientsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  modalIngredient: {
    fontSize: '15px',
    color: '#4a4035',
  },
  modalText: {
    fontSize: '15px',
    lineHeight: 1.7,
    color: '#4a4035',
    margin: 0,
  },
  notesBox: {
    background: '#faf7f2',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '24px',
  },
  notesText: {
    fontSize: '14px',
    fontStyle: 'italic',
    color: '#6b5d4d',
    margin: 0,
    lineHeight: 1.5,
  },
  recipeActions: {
    display: 'flex',
    gap: '12px',
    width: '100%',
  },
  editBtn: {
    flex: 1,
    padding: '12px',
    fontSize: '14px',
    border: '2px solid #8b7355',
    borderRadius: '8px',
    background: '#8b7355',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: '"Source Sans 3", sans-serif',
    fontWeight: '500',
  },
  deleteBtn: {
    flex: 1,
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #e0d6c8',
    borderRadius: '8px',
    background: 'transparent',
    color: '#a89080',
    cursor: 'pointer',
    fontFamily: '"Source Sans 3", sans-serif',
  },
  formGroup: {
    marginBottom: '20px',
  },
  formLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#6b5d4d',
    marginBottom: '8px',
  },
  formInput: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    border: '2px solid #e0d6c8',
    borderRadius: '8px',
    background: '#fff',
    color: '#3d3629',
    outline: 'none',
    fontFamily: '"Source Sans 3", sans-serif',
  },
  formSelect: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    border: '2px solid #e0d6c8',
    borderRadius: '8px',
    background: '#fff',
    color: '#3d3629',
    outline: 'none',
    fontFamily: '"Source Sans 3", sans-serif',
  },
  formTextarea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    border: '2px solid #e0d6c8',
    borderRadius: '8px',
    background: '#fff',
    color: '#3d3629',
    outline: 'none',
    fontFamily: '"Source Sans 3", sans-serif',
    resize: 'vertical',
    minHeight: '100px',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '15px',
    border: 'none',
    borderRadius: '8px',
    background: '#8b7355',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: '"Source Sans 3", sans-serif',
    fontWeight: '500',
  },
  manageSubtitle: {
    fontSize: '14px',
    color: '#8b7355',
    margin: '-16px 0 24px 0',
  },
  manageSection: {
    marginBottom: '24px',
  },
  manageSectionTitle: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#3d3629',
    margin: '0 0 8px 0',
  },
  manageSectionDesc: {
    fontSize: '13px',
    color: '#8b7355',
    margin: '0 0 12px 0',
    lineHeight: 1.5,
  },
  manageActionBtn: {
    flex: 1,
    padding: '12px 20px',
    fontSize: '14px',
    border: '2px solid #e0d6c8',
    borderRadius: '8px',
    background: '#fff',
    color: '#4a4035',
    cursor: 'pointer',
    fontFamily: '"Source Sans 3", sans-serif',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  manageDivider: {
    height: '1px',
    background: '#e0d6c8',
    margin: '24px 0',
  },
  resetButtons: {
    display: 'flex',
    gap: '12px',
  },
  resetBtn: {
    flex: 1,
    padding: '12px',
    fontSize: '13px',
    border: '2px solid #e0d6c8',
    borderRadius: '8px',
    background: '#fff',
    color: '#6b5d4d',
    cursor: 'pointer',
    fontFamily: '"Source Sans 3", sans-serif',
  },
  clearBtn: {
    flex: 1,
    padding: '12px',
    fontSize: '13px',
    border: '2px solid #d4a9a9',
    borderRadius: '8px',
    background: '#fff',
    color: '#8b5a5a',
    cursor: 'pointer',
    fontFamily: '"Source Sans 3", sans-serif',
  },
  footer: {
    textAlign: 'center',
    padding: '32px 24px',
    borderTop: '1px solid rgba(0,0,0,0.04)',
  },
  footerText: {
    fontSize: '12px',
    color: '#a89f91',
    margin: 0,
  },
  // Similar recipes styles
  similarSection: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #e8e0d4',
  },
  similarTitle: {
    fontFamily: '"Playfair Display", serif',
    fontSize: '18px',
    fontWeight: '600',
    color: '#2c2416',
    margin: '0 0 4px 0',
  },
  similarSubtitle: {
    fontSize: '13px',
    color: '#8b7355',
    margin: '0 0 16px 0',
  },
  similarGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  similarCard: {
    padding: '14px 16px',
    background: '#faf7f2',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  similarCardCategory: {
    fontSize: '10px',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#a89080',
    marginBottom: '4px',
  },
  similarCardTitle: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#3d3629',
    marginBottom: '8px',
  },
  sharedIngredients: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  sharedTag: {
    fontSize: '11px',
    padding: '2px 8px',
    background: '#e8dcc8',
    borderRadius: '8px',
    color: '#6b5d4d',
  },
  sharedMore: {
    fontSize: '11px',
    padding: '2px 8px',
    color: '#a89080',
  },
  // Format selector styles
  formatSelector: {
    marginBottom: '16px',
  },
  formatLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#6b5d4d',
    marginBottom: '8px',
    display: 'block',
  },
  formatOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  },
  formatBtn: {
    padding: '10px 8px',
    border: '2px solid #e0d6c8',
    borderRadius: '8px',
    background: '#fff',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  formatBtnActive: {
    borderColor: '#8b7355',
    background: '#faf7f2',
  },
  formatBtnLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#3d3629',
  },
  formatBtnDesc: {
    display: 'block',
    fontSize: '10px',
    color: '#a89080',
    marginTop: '2px',
  },
  exportButtons: {
    display: 'flex',
    gap: '8px',
  },
  importButtons: {
    display: 'flex',
    gap: '8px',
  },
  manageActionBtnSecondary: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '14px',
    border: '2px solid #e0d6c8',
    borderRadius: '8px',
    background: '#faf7f2',
    color: '#6b5d4d',
    cursor: 'pointer',
    fontFamily: '"Source Sans 3", sans-serif',
    fontWeight: '500',
  },
  pasteHint: {
    padding: '12px 16px',
    background: '#f5f0e8',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#6b5d4d',
    marginBottom: '16px',
    lineHeight: 1.4,
  },
  pasteTextarea: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '14px',
    border: '2px solid #e0d6c8',
    borderRadius: '8px',
    background: '#fff',
    color: '#3d3629',
    outline: 'none',
    fontFamily: '"Source Sans 3", sans-serif',
    resize: 'vertical',
    minHeight: '200px',
    marginBottom: '16px',
    lineHeight: 1.5,
  },
  signOutButton: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    padding: '8px 16px',
    background: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
};

// Authentication styles
const authStyles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #faf7f2 0%, #f5efe6 100%)',
    padding: '20px',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  icon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  title: {
    fontFamily: '"Playfair Display", serif',
    fontSize: '32px',
    fontWeight: '600',
    margin: '0 0 8px 0',
    color: '#2c2416',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b5d4d',
    margin: 0,
    fontStyle: 'italic',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2c2416',
    margin: '0 0 8px 0',
    textAlign: 'center',
  },
  input: {
    padding: '12px 16px',
    fontSize: '15px',
    border: '2px solid #e0d6c8',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: '"Source Sans 3", sans-serif',
  },
  button: {
    padding: '12px 16px',
    fontSize: '16px',
    fontWeight: '600',
    background: '#6b5d4d',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: '"Source Sans 3", sans-serif',
  },
  error: {
    padding: '12px',
    background: '#fee',
    color: '#c33',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center',
  },
  success: {
    padding: '12px',
    background: '#efe',
    color: '#2a7',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center',
  },
  contactText: {
    textAlign: 'center',
    fontSize: '13px',
    color: '#6b5d4d',
    margin: '16px 0 0 0',
    fontStyle: 'italic',
  },
  resetText: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#6b5d4d',
    margin: '0 0 16px 0',
    lineHeight: 1.5,
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#8b7355',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: '"Source Sans 3", sans-serif',
    padding: '8px',
    marginTop: '8px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  closeButton: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    fontSize: '32px',
    cursor: 'pointer',
    color: '#6b5d4d',
    padding: '4px 8px',
    lineHeight: 1,
  },
};

// Render the app
ReactDOM.createRoot(document.getElementById('root')).render(<AppWithAuth />);
