import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import styled, { createGlobalStyle } from 'styled-components';

const theme = {
  color: {
    background: '#fff8f5',
    surface: '#fff8f5',
    surfaceLow: '#fbf2ed',
    surfaceContainer: '#f5ece7',
    surfaceHigh: '#efe6e2',
    white: '#ffffff',
    text: '#1e1b18',
    muted: '#54433e',
    outline: '#dac1ba',
    primary: '#944931',
    primarySoft: '#ffdbd0',
    primaryMid: '#d67d61',
    primaryDark: '#551905',
    secondary: '#4f6443',
    secondarySoft: '#d2eac0',
    tertiarySoft: '#ece2c9',
    tertiaryText: '#4c4634',
    star: '#e29b31',
    dark: '#111413',
  },
  shadow: {
    soft: '0 4px 20px rgba(0, 0, 0, 0.04)',
    lift: '0 18px 50px rgba(84, 67, 62, 0.14)',
  },
};

const API_ROOT = 'https://www.themealdb.com/api/json/v1/1';
const PROFILE_KEY = 'recipe-card-app:profile-id';
const DIET_KEY = 'recipe-card-app:diet';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const dietOptions = [
  ['everything', 'Eat everything'],
  ['vegetarian', 'Vegetarian'],
  ['vegan', 'Vegan'],
  ['pescatarian', 'Pescatarian'],
];

function getDietLabel(value) {
  return dietOptions.find(([key]) => key === value)?.[1] || 'Eat everything';
}

const meatWords = [
  'beef',
  'chicken',
  'pork',
  'lamb',
  'goat',
  'turkey',
  'duck',
  'bacon',
  'ham',
  'sausage',
  'prosciutto',
  'chorizo',
  'veal',
  'venison',
  'mince',
  'gelatine',
  'gelatin',
];

const seafoodWords = [
  'fish',
  'salmon',
  'tuna',
  'cod',
  'haddock',
  'trout',
  'anchovy',
  'sardine',
  'prawn',
  'shrimp',
  'crab',
  'lobster',
  'clam',
  'mussel',
  'oyster',
  'squid',
  'octopus',
  'seafood',
];

const animalProductWords = [
  'egg',
  'milk',
  'cream',
  'cheese',
  'butter',
  'yoghurt',
  'yogurt',
  'honey',
  'mayonnaise',
  'parmesan',
  'mozzarella',
  'feta',
];

function getProfileId() {
  const storedId = window.localStorage.getItem(PROFILE_KEY);
  if (storedId) return storedId;
  const nextId = crypto.randomUUID();
  window.localStorage.setItem(PROFILE_KEY, nextId);
  return nextId;
}

function getStoredDiet() {
  return window.localStorage.getItem(DIET_KEY) || 'everything';
}

function storeDiet(diet) {
  window.localStorage.setItem(DIET_KEY, diet);
}

function getIngredients(meal) {
  if (!meal) return [];

  return Array.from({ length: 20 }, (_, index) => {
    const number = index + 1;
    const ingredient = meal[`strIngredient${number}`]?.trim();
    const measure = meal[`strMeasure${number}`]?.trim();

    if (!ingredient) return null;
    return [ingredient, measure || 'To taste'];
  }).filter(Boolean);
}

function getSteps(meal) {
  if (!meal?.strInstructions) return [];

  const sentences = meal.strInstructions
    .replace(/\r?\n/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const chunkSize = Math.max(1, Math.ceil(sentences.length / 4));
  const titles = ['Prepare', 'Cook', 'Assemble', 'Finish'];

  return Array.from({ length: Math.min(4, sentences.length) }, (_, index) => ({
    title: titles[index] || `Step ${index + 1}`,
    body: sentences.slice(index * chunkSize, index * chunkSize + chunkSize).join(' '),
    image: index === 0 ? meal.strMealThumb : null,
  })).filter((step) => step.body);
}

function mealMatchesDiet(meal, diet) {
  if (!meal || diet === 'everything') return true;
  const ingredientText = getIngredients(meal)
    .map(([ingredient]) => ingredient.toLowerCase())
    .join(' ');

  const hasAny = (words) => words.some((word) => ingredientText.includes(word));

  if (diet === 'vegan') {
    return !hasAny([...meatWords, ...seafoodWords, ...animalProductWords]);
  }

  if (diet === 'vegetarian') {
    return !hasAny([...meatWords, ...seafoodWords]);
  }

  if (diet === 'pescatarian') {
    return !hasAny(meatWords);
  }

  return true;
}

async function lookupMeal(idMeal) {
  const detailResponse = await fetch(`${API_ROOT}/lookup.php?i=${idMeal}`);
  if (!detailResponse.ok) throw new Error('Could not load recipe details.');

  const detailData = await detailResponse.json();
  return detailData.meals?.[0] || null;
}

async function fetchRecipe(searchMode, query, diet) {
  const normalizedQuery = query.trim().replace(/\s+/g, searchMode === 'ingredient' ? '_' : ' ');
  const filterKey = searchMode === 'ingredient' ? 'i' : 'a';
  const filterResponse = await fetch(
    `${API_ROOT}/filter.php?${filterKey}=${encodeURIComponent(normalizedQuery)}`
  );
  if (!filterResponse.ok) throw new Error('Could not search recipes right now.');

  const filterData = await filterResponse.json();
  const matches = filterData.meals || [];
  if (!matches.length) return null;

  for (const match of matches.slice(0, 12)) {
    const meal = await lookupMeal(match.idMeal);
    if (mealMatchesDiet(meal, diet)) return meal;
  }

  return null;
}

async function fetchRandomRecipe(diet) {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const response = await fetch(`${API_ROOT}/random.php`);
    if (!response.ok) throw new Error('Could not discover a random recipe.');
    const data = await response.json();
    const meal = data.meals?.[0] || null;
    if (mealMatchesDiet(meal, diet)) return meal;
  }

  return null;
}

async function fetchCookbook(profileId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('recipe_cookbook')
    .select('recipe')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map((row) => row.recipe);
}

async function saveCookbookRecipe(profileId, recipe) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('recipe_cookbook').upsert(
    {
      profile_id: profileId,
      meal_id: recipe.idMeal,
      recipe,
    },
    { onConflict: 'profile_id,meal_id' }
  );

  if (error) throw error;
}

async function removeCookbookRecipe(profileId, mealId) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase
    .from('recipe_cookbook')
    .delete()
    .eq('profile_id', profileId)
    .eq('meal_id', mealId);

  if (error) throw error;
}

function Icon({ children, filled = false }) {
  return (
    <Svg aria-hidden="true" data-filled={filled} viewBox="0 0 24 24">
      {children}
    </Svg>
  );
}

function App() {
  const [searchMode, setSearchMode] = useState('ingredient');
  const [searchInput, setSearchInput] = useState('salmon');
  const [activeSearch, setActiveSearch] = useState({ mode: 'ingredient', query: 'salmon' });
  const [view, setView] = useState('recipe');
  const [profileId, setProfileId] = useState('');
  const [diet, setDiet] = useState('everything');
  const [meal, setMeal] = useState(null);
  const [cookbook, setCookbook] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cookbookLoading, setCookbookLoading] = useState(false);
  const [error, setError] = useState('');
  const [cookbookError, setCookbookError] = useState('');
  const isSaved = meal ? cookbook.some((recipe) => recipe.idMeal === meal.idMeal) : false;

  useEffect(() => {
    setProfileId(getProfileId());
    setDiet(getStoredDiet());
  }, []);

  useEffect(() => {
    if (!profileId) return;
    let isCurrent = true;

    async function loadCookbook() {
      setCookbookLoading(true);
      setCookbookError('');

      try {
        const savedRecipes = await fetchCookbook(profileId);
        if (isCurrent) setCookbook(savedRecipes);
      } catch (storageError) {
        if (isCurrent) setCookbookError(storageError.message || 'Could not load cookbook.');
      } finally {
        if (isCurrent) setCookbookLoading(false);
      }
    }

    loadCookbook();

    return () => {
      isCurrent = false;
    };
  }, [profileId]);

  useEffect(() => {
    let isCurrent = true;

    async function loadRecipe() {
      setLoading(true);
      setError('');

      try {
        const data = await fetchRecipe(activeSearch.mode, activeSearch.query, diet);
        if (!isCurrent) return;

        if (!data) {
          setMeal(null);
          setError(
            `No recipes found for "${activeSearch.query}" with your ${getDietLabel(diet).toLowerCase()} setting. Try ${
              activeSearch.mode === 'ingredient' ? 'chicken, beef, avocado, or pasta' : 'Italian, Mexican, Indian, or Canadian'
            }.`
          );
          return;
        }

        setMeal(data);
      } catch (fetchError) {
        if (!isCurrent) return;
        setError(fetchError.message || 'Could not load recipes right now.');
        setMeal(null);
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    loadRecipe();

    return () => {
      isCurrent = false;
    };
  }, [activeSearch, diet]);

  const ingredientItems = useMemo(() => getIngredients(meal), [meal]);
  const directionSteps = useMemo(() => getSteps(meal), [meal]);
  const heroImage = meal?.strMealThumb;
  const title = meal?.strMeal || 'Search for a recipe';
  const category = meal?.strCategory || 'Live recipe';
  const cuisine = meal?.strArea || 'TheMealDB';

  function handleSubmit(event) {
    event.preventDefault();
    const nextQuery = searchInput.trim();
    if (nextQuery) {
      setActiveSearch({ mode: searchMode, query: nextQuery });
      setView('recipe');
    }
  }

  async function handleDiscoverRandom() {
    setView('recipe');
    setLoading(true);
    setError('');

    try {
      const randomMeal = await fetchRandomRecipe(diet);
      if (!randomMeal) {
        setMeal(null);
        setError(`No random recipes matched your ${getDietLabel(diet).toLowerCase()} setting. Try another preference.`);
        return;
      }
      setMeal(randomMeal);
    } catch (discoverError) {
      setError(discoverError.message || 'Could not discover a recipe right now.');
    } finally {
      setLoading(false);
    }
  }

  function handleModeChange(event) {
    const nextMode = event.target.value;
    setSearchMode(nextMode);
    setSearchInput(nextMode === 'ingredient' ? 'salmon' : 'Italian');
  }

  async function handleSaveRecipe() {
    if (!meal || isSaved) return;

    try {
      await saveCookbookRecipe(profileId, meal);
      setCookbook([meal, ...cookbook]);
      setCookbookError('');
    } catch (storageError) {
      setCookbookError(storageError.message || 'Could not save recipe to Supabase.');
    }
  }

  async function handleRemoveSavedRecipe(idMeal) {
    try {
      await removeCookbookRecipe(profileId, idMeal);
      setCookbook(cookbook.filter((recipe) => recipe.idMeal !== idMeal));
      setCookbookError('');
    } catch (storageError) {
      setCookbookError(storageError.message || 'Could not remove recipe from Supabase.');
    }
  }

  function handleOpenSavedRecipe(recipe) {
    setMeal(recipe);
    setView('recipe');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDietChange(nextDiet) {
    setDiet(nextDiet);
    storeDiet(nextDiet);
  }

  return (
    <ThemeProviderWrapper>
      <GlobalStyle />
      <AppShell>
        <TopBar>
          <RoundButton aria-label="Go back">
            <Icon>
              <path d="M15 18l-6-6 6-6" />
            </Icon>
          </RoundButton>
          <TopActions>
            <RoundButton aria-label="Share recipe">
              <Icon>
                <path d="M8 12h8" />
                <path d="M13 7l5 5-5 5" />
                <path d="M18 12H6" />
              </Icon>
            </RoundButton>
            <RoundButton aria-label="Favorite recipe" $active>
              <Icon filled>
                <path d="M20.8 4.6c-1.7-1.6-4.4-1.5-6 .2L12 7.7 9.2 4.8c-1.6-1.7-4.3-1.8-6-.2-1.8 1.7-1.8 4.5-.1 6.2L12 20l8.9-9.2c1.7-1.7 1.7-4.5-.1-6.2z" />
              </Icon>
            </RoundButton>
          </TopActions>
        </TopBar>

        <Hero>{heroImage ? <HeroImage src={heroImage} alt={title} /> : <HeroEmpty />}</Hero>

        <Content>
          <TitleCard>
            <TitleMeta>
              <Pill>{getDietLabel(diet)}</Pill>
              <Rating aria-label="Rated 4.5 out of 5">
                <span>★★★★★</span>
                <small>{loading ? 'Loading live recipe' : `Live from ${cuisine}`}</small>
              </Rating>
            </TitleMeta>
            <h1>{title}</h1>
            <SearchPanel onSubmit={handleSubmit}>
              <label htmlFor="recipe-search">Search live recipes</label>
              <SearchRow>
                <SearchSelect
                  aria-label="Search type"
                  value={searchMode}
                  onChange={handleModeChange}
                >
                  <option value="ingredient">Ingredient</option>
                  <option value="cuisine">Cuisine</option>
                </SearchSelect>
                <SearchInput
                  id="recipe-search"
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={
                    searchMode === 'ingredient'
                      ? 'Try salmon, chicken, avocado, pasta...'
                      : 'Try Italian, Mexican, Indian, Canadian...'
                  }
                />
                <SearchButton type="submit" disabled={loading}>
                  <SearchIcon />
                  {loading ? 'Searching' : 'Search'}
                </SearchButton>
              </SearchRow>
              {error ? <SearchMessage role="status">{error}</SearchMessage> : null}
            </SearchPanel>
            {cookbookError ? <SearchMessage role="status">{cookbookError}</SearchMessage> : null}
            <Stats>
              <Stat>
                <ClockIcon />
                <span>Category</span>
                <strong>{category}</strong>
              </Stat>
              <Stat>
                <ChefIcon />
                <span>Cuisine</span>
                <strong>{cuisine}</strong>
              </Stat>
              <Stat>
                <FlameIcon />
                <span>Items</span>
                <strong>{ingredientItems.length}</strong>
              </Stat>
            </Stats>
            <PrimaryButton type="button" onClick={handleSaveRecipe} disabled={!meal || isSaved || !profileId}>
              <BookIcon />
              {isSaved ? 'Saved to cookbook' : 'Save to cookbook'}
            </PrimaryButton>
          </TitleCard>

          {view === 'settings' ? (
            <SettingsPage>
              <SectionTitle>Settings</SectionTitle>
              <SettingsCard>
                <h2>Diet preference</h2>
                <p>Recipe search and random discovery will only show meals that match this setting.</p>
                <DietGrid>
                  {dietOptions.map(([value, label]) => (
                    <DietButton
                      key={value}
                      type="button"
                      onClick={() => handleDietChange(value)}
                      $active={diet === value}
                    >
                      {label}
                    </DietButton>
                  ))}
                </DietGrid>
              </SettingsCard>
            </SettingsPage>
          ) : view === 'cookbook' ? (
            <CookbookView>
              <SectionTitle>
                Cookbook <small>({cookbook.length} saved)</small>
              </SectionTitle>
              {cookbookLoading ? (
                <EmptyState>Loading your Supabase cookbook...</EmptyState>
              ) : cookbook.length ? (
                <SavedGrid>
                  {cookbook.map((recipe) => (
                    <SavedCard key={recipe.idMeal}>
                      <button type="button" onClick={() => handleOpenSavedRecipe(recipe)}>
                        <img src={recipe.strMealThumb} alt="" />
                        <span>
                          <strong>{recipe.strMeal}</strong>
                          <small>
                            {recipe.strCategory} · {recipe.strArea}
                          </small>
                        </span>
                      </button>
                      <RemoveButton
                        type="button"
                        onClick={() => handleRemoveSavedRecipe(recipe.idMeal)}
                      >
                        Remove
                      </RemoveButton>
                    </SavedCard>
                  ))}
                </SavedGrid>
              ) : (
                <EmptyState>
                  Your cookbook is empty. Search for a recipe, then save it to keep it here.
                </EmptyState>
              )}
            </CookbookView>
          ) : meal ? (
            <RecipeGrid>
              <IngredientsPanel>
                <SectionTitle>
                  Ingredients <small>({ingredientItems.length} items)</small>
                </SectionTitle>
                <IngredientList>
                  {ingredientItems.map(([name, note]) => (
                    <Ingredient key={name}>
                      <input type="checkbox" />
                      <span>
                        <strong>{name}</strong>
                        <small>{note}</small>
                      </span>
                    </Ingredient>
                  ))}
                </IngredientList>
              </IngredientsPanel>

              <Directions>
                <SectionTitle>Directions</SectionTitle>
                <StepList>
                  {directionSteps.map((step, index) => (
                    <Step key={step.title}>
                      <StepNumber>{index + 1}</StepNumber>
                      <StepBody>
                        <h3>{step.title}</h3>
                        <p>{step.body}</p>
                        {step.image ? <StepImage src={step.image} alt={title} /> : null}
                      </StepBody>
                    </Step>
                  ))}
                </StepList>
              </Directions>
            </RecipeGrid>
          ) : (
            <EmptyState>
              {loading ? 'Loading a live recipe...' : 'Search for an ingredient to load a recipe.'}
            </EmptyState>
          )}
        </Content>

        <BottomNav aria-label="Primary">
          <NavItem type="button" onClick={handleDiscoverRandom} $active={view === 'recipe'}>
            <CompassIcon />
            Discover
          </NavItem>
          <NavItem type="button" onClick={() => setView('cookbook')} $active={view === 'cookbook'}>
            <BookIcon />
            Cookbook
          </NavItem>
          <NavItem type="button" onClick={() => setView('settings')} $active={view === 'settings'}>
            <SettingsIcon />
            Settings
          </NavItem>
        </BottomNav>
      </AppShell>
    </ThemeProviderWrapper>
  );
}

function ThemeProviderWrapper({ children }) {
  return <styledTheme.Provider value={theme}>{children}</styledTheme.Provider>;
}

const styledTheme = React.createContext(theme);

const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html {
    background: ${theme.color.background};
    color: ${theme.color.text};
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  }

  body {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(207, 231, 189, 0.28), transparent 28rem),
      ${theme.color.background};
  }

  button, input, select {
    font: inherit;
  }

  img {
    display: block;
    max-width: 100%;
  }
`;

const AppShell = styled.div`
  min-height: 100vh;
  padding-bottom: 88px;
`;

const TopBar = styled.header`
  position: fixed;
  inset: 0 0 auto;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 10px clamp(16px, 5vw, 48px);
  background: rgba(255, 255, 255, 0.42);
  backdrop-filter: blur(8px);
`;

const TopActions = styled.div`
  display: flex;
  gap: 8px;
`;

const Svg = styled.svg`
  width: 21px;
  height: 21px;
  fill: ${({ 'data-filled': filled }) => (filled ? 'currentColor' : 'none')};
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
`;

const RoundButton = styled.button`
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  color: ${({ $active }) => ($active ? theme.color.primary : theme.color.muted)};
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(218, 193, 186, 0.65);
  border-radius: 999px;
  box-shadow: ${theme.shadow.soft};
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${theme.shadow.lift};
  }
`;

const Hero = styled.section`
  height: clamp(360px, 58vw, 600px);
  overflow: hidden;
  background: ${theme.color.dark};

  &::after {
    content: '';
    position: absolute;
  }
`;

const HeroImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  filter: saturate(1.04);
`;

const HeroEmpty = styled.div`
  width: 100%;
  height: 100%;
  background:
    linear-gradient(135deg, rgba(17, 20, 19, 0.82), rgba(148, 73, 49, 0.38)),
    ${theme.color.dark};
`;

const Content = styled.main`
  position: relative;
  z-index: 1;
  width: min(1120px, calc(100% - clamp(32px, 8vw, 96px)));
  margin: -64px auto 0;

  @media (max-width: 640px) {
    width: calc(100% - 24px);
    margin-top: -54px;
  }
`;

const TitleCard = styled.article`
  padding: clamp(18px, 3vw, 28px);
  background: ${theme.color.white};
  border: 1px solid rgba(218, 193, 186, 0.48);
  border-radius: 8px;
  box-shadow: ${theme.shadow.soft};

  h1 {
    max-width: 760px;
    margin: 10px 0 24px;
    font-family: 'Epilogue', system-ui, sans-serif;
    font-size: clamp(28px, 5vw, 48px);
    line-height: 1.15;
    letter-spacing: 0;
  }
`;

const TitleMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
`;

const Pill = styled.span`
  padding: 6px 12px;
  color: ${theme.color.secondary};
  background: ${theme.color.secondarySoft};
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const Rating = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${theme.color.star};
  font-size: 14px;

  small {
    color: ${theme.color.muted};
    font-size: 12px;
  }
`;

const SearchPanel = styled.form`
  display: grid;
  gap: 10px;
  margin: 0 0 22px;
  padding: 16px;
  background: ${theme.color.surfaceLow};
  border: 1px solid rgba(218, 193, 186, 0.48);
  border-radius: 8px;

  label {
    color: ${theme.color.muted};
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
`;

const SearchRow = styled.div`
  display: grid;
  grid-template-columns: minmax(140px, 180px) 1fr auto;
  gap: 10px;

  @media (max-width: 720px) {
    grid-template-columns: minmax(120px, 0.7fr) 1fr;

    button {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;

    button {
      grid-column: auto;
    }
  }
`;

const SearchSelect = styled.select`
  min-height: 48px;
  padding: 0 38px 0 14px;
  color: ${theme.color.text};
  background:
    linear-gradient(45deg, transparent 50%, ${theme.color.primary} 50%) right 18px center / 7px 7px no-repeat,
    linear-gradient(135deg, ${theme.color.primary} 50%, transparent 50%) right 13px center / 7px 7px no-repeat,
    ${theme.color.white};
  border: 1px solid rgba(218, 193, 186, 0.85);
  border-radius: 8px;
  outline: none;
  appearance: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;

  &:focus {
    border-color: ${theme.color.secondary};
    box-shadow: 0 0 0 3px rgba(79, 100, 67, 0.16);
  }
`;

const SearchInput = styled.input`
  width: 100%;
  min-height: 48px;
  padding: 0 15px;
  color: ${theme.color.text};
  background: ${theme.color.white};
  border: 1px solid rgba(218, 193, 186, 0.85);
  border-radius: 8px;
  outline: none;

  &:focus {
    border-color: ${theme.color.secondary};
    box-shadow: 0 0 0 3px rgba(79, 100, 67, 0.16);
  }
`;

const SearchButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 18px;
  color: ${theme.color.white};
  background: ${theme.color.secondary};
  border: 1px solid ${theme.color.secondary};
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;

  &:disabled {
    cursor: wait;
    opacity: 0.68;
  }
`;

const SearchMessage = styled.p`
  margin: 0;
  color: ${theme.color.primaryDark};
  font-size: 13px;
  line-height: 1.5;
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 16px 0 20px;
  border-block: 1px solid rgba(218, 193, 186, 0.48);

  @media (min-width: 780px) {
    gap: 16px;
  }
`;

const Stat = styled.div`
  display: grid;
  justify-items: center;
  gap: 5px;
  min-height: 88px;
  padding: 14px 8px;
  text-align: center;
  background: ${theme.color.surfaceLow};
  border-radius: 8px;

  svg {
    color: ${theme.color.primary};
  }

  span {
    color: ${theme.color.muted};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  strong {
    font-size: 13px;
  }
`;

const PrimaryButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: min(100%, 360px);
  min-height: 54px;
  margin: 22px auto 0;
  color: ${theme.color.white};
  background: ${theme.color.primary};
  border: 1px solid ${theme.color.primaryDark};
  border-radius: 999px;
  box-shadow: 0 10px 24px rgba(148, 73, 49, 0.22);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: transform 160ms ease, background 160ms ease;

  &:hover {
    background: ${theme.color.primaryDark};
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: default;
    opacity: 0.74;
    transform: none;
  }
`;

const RecipeGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 0.82fr) minmax(0, 1.18fr);
  gap: clamp(28px, 5vw, 56px);
  margin-top: 40px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const EmptyState = styled.div`
  margin-top: 40px;
  padding: 28px;
  color: ${theme.color.muted};
  background: ${theme.color.white};
  border: 1px solid rgba(218, 193, 186, 0.48);
  border-radius: 8px;
  box-shadow: ${theme.shadow.soft};
  font-size: 15px;
  line-height: 1.6;
`;

const CookbookView = styled.section`
  margin-top: 40px;
`;

const SettingsPage = styled.section`
  margin-top: 40px;
`;

const SettingsCard = styled.article`
  padding: 24px;
  background: ${theme.color.white};
  border: 1px solid rgba(218, 193, 186, 0.48);
  border-radius: 8px;
  box-shadow: ${theme.shadow.soft};

  h2 {
    margin: 0 0 8px;
    font-family: 'Epilogue', system-ui, sans-serif;
    font-size: 20px;
  }

  p {
    max-width: 620px;
    margin: 0 0 18px;
    color: ${theme.color.muted};
    font-size: 14px;
    line-height: 1.6;
  }
`;

const DietGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 440px) {
    grid-template-columns: 1fr;
  }
`;

const DietButton = styled.button`
  min-height: 48px;
  color: ${({ $active }) => ($active ? theme.color.white : theme.color.secondary)};
  background: ${({ $active }) => ($active ? theme.color.secondary : theme.color.surfaceLow)};
  border: 1px solid ${({ $active }) => ($active ? theme.color.secondary : 'rgba(218, 193, 186, 0.85)')};
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
`;

const SavedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 920px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const SavedCard = styled.article`
  overflow: hidden;
  background: ${theme.color.white};
  border: 1px solid rgba(218, 193, 186, 0.48);
  border-radius: 8px;
  box-shadow: ${theme.shadow.soft};

  > button:first-child {
    display: grid;
    width: 100%;
    padding: 0;
    color: inherit;
    text-align: left;
    background: transparent;
    border: 0;
    cursor: pointer;
  }

  img {
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
  }

  span {
    display: grid;
    gap: 5px;
    padding: 14px;
  }

  strong {
    font-family: 'Epilogue', system-ui, sans-serif;
    font-size: 16px;
    line-height: 1.35;
  }

  small {
    color: ${theme.color.muted};
    font-size: 12px;
    font-weight: 700;
  }
`;

const RemoveButton = styled.button`
  width: calc(100% - 28px);
  min-height: 40px;
  margin: 0 14px 14px;
  color: ${theme.color.primary};
  background: ${theme.color.surfaceLow};
  border: 1px solid rgba(218, 193, 186, 0.7);
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const IngredientsPanel = styled.section`
  align-self: start;

  @media (min-width: 821px) {
    position: sticky;
    top: 88px;
  }
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 20px;
  font-family: 'Epilogue', system-ui, sans-serif;
  font-size: clamp(20px, 2.8vw, 25px);
  line-height: 1.3;

  small {
    color: ${theme.color.muted};
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 13px;
    font-weight: 500;
  }
`;

const IngredientList = styled.div`
  display: grid;
  gap: 10px;
`;

const Ingredient = styled.label`
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 70px;
  padding: 14px;
  background: ${theme.color.white};
  border: 1px solid rgba(218, 193, 186, 0.44);
  border-radius: 8px;
  cursor: pointer;
  transition: background 160ms ease, transform 160ms ease;

  &:hover {
    background: ${theme.color.surfaceLow};
    transform: translateY(-1px);
  }

  input {
    appearance: none;
    flex: 0 0 auto;
    width: 18px;
    height: 18px;
    border: 1px solid ${theme.color.outline};
    border-radius: 4px;
    background: ${theme.color.white};
  }

  input:checked {
    background:
      linear-gradient(135deg, transparent 55%, ${theme.color.secondary} 56%),
      ${theme.color.secondary};
    border-color: ${theme.color.secondary};
  }

  span {
    display: grid;
    gap: 2px;
  }

  strong {
    font-size: 14px;
    font-weight: 500;
  }

  small {
    color: ${theme.color.muted};
    font-size: 11px;
    font-weight: 600;
  }

  input:checked + span strong,
  input:checked + span small {
    color: ${theme.color.muted};
    text-decoration: line-through;
  }
`;

const Directions = styled.section``;

const StepList = styled.div`
  display: grid;
  gap: 30px;
`;

const Step = styled.article`
  display: grid;
  grid-template-columns: 38px 1fr;
  gap: 18px;
`;

const StepNumber = styled.span`
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  color: ${theme.color.primaryDark};
  background: ${theme.color.primarySoft};
  border-radius: 999px;
  font-family: 'Epilogue', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 700;
`;

const StepBody = styled.div`
  h3 {
    margin: 2px 0 8px;
    font-size: 14px;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: ${theme.color.muted};
    font-size: 15px;
    line-height: 1.7;
  }
`;

const StepImage = styled.img`
  width: 100%;
  max-height: 260px;
  margin-top: 18px;
  object-fit: cover;
  border: 1px solid rgba(218, 193, 186, 0.5);
  border-radius: 8px;
  box-shadow: ${theme.shadow.soft};
`;

const BottomNav = styled.nav`
  position: fixed;
  inset: auto 0 0;
  z-index: 10;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  height: 76px;
  padding: 8px clamp(10px, 4vw, 28px) max(8px, env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.95);
  border-top: 1px solid rgba(218, 193, 186, 0.42);
  backdrop-filter: blur(8px);
`;

const NavItem = styled.button`
  display: grid;
  place-items: center;
  align-content: center;
  gap: 5px;
  color: ${({ $active }) => ($active ? theme.color.primary : '#8a817b')};
  background: transparent;
  border: 0;
  cursor: pointer;
  font-family: 'Epilogue', system-ui, sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;

  svg {
    width: 21px;
    height: 21px;
  }
`;

function ClockIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  );
}

function ChefIcon() {
  return (
    <Icon>
      <path d="M7 18h10" />
      <path d="M8 18V9" />
      <path d="M16 18V9" />
      <path d="M7 9c-1.7 0-3-1.2-3-2.8C4 4.4 5.5 3 7.3 3c.8 0 1.6.3 2.1.8A4 4 0 0 1 12 3c1 0 1.9.3 2.6.8.6-.5 1.3-.8 2.1-.8C18.5 3 20 4.4 20 6.2 20 7.8 18.7 9 17 9H7z" />
    </Icon>
  );
}

function FlameIcon() {
  return (
    <Icon>
      <path d="M12 22c4 0 7-2.8 7-6.7 0-2.3-1.1-4.2-3.3-5.9.2 1.7-.4 3-1.5 3.8.1-3.5-1.6-6.5-5-9.2.4 3.3-.7 5.2-2.4 7C5.6 12.4 5 13.8 5 15.4 5 19.2 8 22 12 22z" />
    </Icon>
  );
}

function BookIcon() {
  return (
    <Icon>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21.5z" />
      <path d="M5 5.5v16" />
      <path d="M9 7h7" />
    </Icon>
  );
}

function SearchIcon() {
  return (
    <Icon>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5L21 21" />
    </Icon>
  );
}

function CompassIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </Icon>
  );
}

function SettingsIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.5-.2-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V22h-4v-.3a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.2.1-2-3.5.1-.1A1.7 1.7 0 0 0 6 15a1.7 1.7 0 0 0-1.5-1H4v-4h.5A1.7 1.7 0 0 0 6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.5.2.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V2h4v.4a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.2-.1 2 3.5-.1.1A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </Icon>
  );
}

createRoot(document.getElementById('root')).render(<App />);
