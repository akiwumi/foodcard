import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import styled, { createGlobalStyle } from 'styled-components';
import splashMobile from './assets/splash-mobile.png';
import splashDesktop from './assets/splash-desktop.png';

const theme = {
  color: {
    background: '#f7efe9',
    surface: '#fffaf7',
    surfaceLow: '#f3e8e1',
    surfaceHigh: '#ead8cb',
    white: '#ffffff',
    text: '#211a16',
    muted: '#68534a',
    outline: '#d9bfb1',
    primary: '#a55837',
    primaryDark: '#7f3f22',
    primarySoft: '#f7d8ca',
    secondary: '#355e57',
    secondarySoft: '#d5ebe4',
    accent: '#f1c15d',
    danger: '#9d3b31',
    success: '#2b7a5f',
    heroShade: 'rgba(17, 13, 10, 0.38)',
    dark: '#12110f',
  },
  shadow: {
    soft: '0 16px 38px rgba(64, 34, 23, 0.08)',
    lift: '0 26px 70px rgba(39, 29, 24, 0.14)',
  },
};

const API_ROOT = 'https://www.themealdb.com/api/json/v1/1';
const SPLASH_KEY = 'recipe-card-app:last-splash-dismissed-at';
const WELCOME_PATH = '/welcome';
const RECOVERY_PATH = '/reset-password';
const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
      <rect width="160" height="160" rx="80" fill="#f7d8ca"/>
      <circle cx="80" cy="62" r="28" fill="#a55837"/>
      <path d="M32 136c9-25 28-38 48-38s39 13 48 38" fill="#a55837"/>
    </svg>
  `);

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

const categoryOptions = [
  ['all', 'Any course'],
  ['main', 'Main'],
  ['starter', 'Starter'],
  ['dessert', 'Dessert'],
];

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

function getDietLabel(value) {
  return dietOptions.find(([key]) => key === value)?.[1] || 'Eat everything';
}

function getCategoryLabel(value) {
  return categoryOptions.find(([key]) => key === value)?.[1] || 'Any course';
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

function mealMatchesCategory(meal, category) {
  if (!meal || category === 'all') return true;

  const mealCategory = meal.strCategory?.toLowerCase() || '';

  if (category === 'main') {
    return !['starter', 'dessert', 'side'].includes(mealCategory);
  }

  return mealCategory === category;
}

async function lookupMeal(idMeal) {
  const detailResponse = await fetch(`${API_ROOT}/lookup.php?i=${idMeal}`);
  if (!detailResponse.ok) throw new Error('Could not load recipe details.');

  const detailData = await detailResponse.json();
  return detailData.meals?.[0] || null;
}

async function fetchRecipe(searchMode, query, diet, category) {
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
    if (mealMatchesDiet(meal, diet) && mealMatchesCategory(meal, category)) return meal;
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

async function fetchProfile(userId) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

async function upsertProfile(payload) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function fetchCookbook(userId) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('recipe_cookbook')
    .select('recipe')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map((row) => row.recipe);
}

async function saveCookbookRecipe(userId, recipe) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase.from('recipe_cookbook').upsert(
    {
      user_id: userId,
      meal_id: recipe.idMeal,
      recipe,
    },
    { onConflict: 'user_id,meal_id' }
  );

  if (error) throw error;
}

async function removeCookbookRecipe(userId, mealId) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase
    .from('recipe_cookbook')
    .delete()
    .eq('user_id', userId)
    .eq('meal_id', mealId);

  if (error) throw error;
}

function getRedirectUrl(path = '') {
  const baseUrl = import.meta.env.VITE_SUPABASE_REDIRECT_URL || window.location.origin;
  return new URL(path, baseUrl).toString();
}

function getAvatarUrl(path) {
  if (!supabase || !path) return '';
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function getRecoveryTypeFromHash() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  return params.get('type');
}

function getAuthCallbackType() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const searchParams = new URLSearchParams(window.location.search);

  return (
    hashParams.get('type') ||
    searchParams.get('type') ||
    (hashParams.get('access_token') ? 'authenticated' : null) ||
    (searchParams.get('code') ? 'authenticated' : null)
  );
}

function getInitialAuthUIState() {
  const pathname = window.location.pathname;
  const callbackType = getAuthCallbackType();

  if (callbackType === 'recovery' || pathname === RECOVERY_PATH) {
    return {
      appStage: 'main',
      view: 'settings',
      authMode: 'reset',
      authMessage: 'Set a new password for your account.',
      welcomeMessage: 'Your account is ready.',
    };
  }

  if (callbackType || pathname === WELCOME_PATH) {
    return {
      appStage: 'welcome',
      view: 'discover',
      authMode: 'login',
      authMessage: '',
      welcomeMessage:
        callbackType === 'signup'
          ? 'Welcome to Food Card. Your email has been confirmed.'
          : 'Welcome back. Your authentication link worked.',
    };
  }

  return {
    appStage: 'splash',
    view: 'discover',
    authMode: 'login',
    authMessage: '',
    welcomeMessage: 'Your account is ready.',
  };
}

function clearAuthCallbackUrl() {
  const url = new URL(window.location.href);
  const authKeys = [
    'access_token',
    'refresh_token',
    'expires_at',
    'expires_in',
    'token_type',
    'type',
    'code',
    'error',
    'error_code',
    'error_description',
    'provider_token',
    'provider_refresh_token',
    'sb',
  ];

  for (const key of authKeys) {
    url.searchParams.delete(key);
  }

  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(hash);

  for (const key of authKeys) {
    hashParams.delete(key);
  }

  const nextHash = hashParams.toString();
  const nextUrl = `${url.pathname}${url.search}${nextHash ? `#${nextHash}` : ''}`;
  window.history.replaceState({}, document.title, nextUrl);
}

function rememberSplashDismissed() {
  window.localStorage.setItem(SPLASH_KEY, String(Date.now()));
}

function Icon({ children, filled = false }) {
  return (
    <Svg aria-hidden="true" data-filled={filled} viewBox="0 0 24 24">
      {children}
    </Svg>
  );
}

function App() {
  const initialAuthUIState = getInitialAuthUIState();
  const [appStage, setAppStage] = useState(initialAuthUIState.appStage);
  const [view, setView] = useState(initialAuthUIState.view);
  const [searchMode, setSearchMode] = useState('ingredient');
  const [searchInput, setSearchInput] = useState('salmon');
  const [searchCategory, setSearchCategory] = useState('all');
  const [activeSearch, setActiveSearch] = useState({
    mode: 'ingredient',
    query: 'salmon',
    category: 'all',
  });
  const [diet, setDiet] = useState('everything');
  const [meal, setMeal] = useState(null);
  const [cookbook, setCookbook] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cookbookLoading, setCookbookLoading] = useState(false);
  const [error, setError] = useState('');
  const [cookbookError, setCookbookError] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState(initialAuthUIState.authMessage);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState(initialAuthUIState.authMode);
  const [welcomeMessage, setWelcomeMessage] = useState(initialAuthUIState.welcomeMessage);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState({
    displayName: '',
    diet: 'everything',
  });
  const [settingsStatus, setSettingsStatus] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState('');
  const [authForm, setAuthForm] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const viewContentRef = useRef(null);

  const user = session?.user || null;
  const ingredientItems = useMemo(() => getIngredients(meal), [meal]);
  const directionSteps = useMemo(() => getSteps(meal), [meal]);
  const heroImage = meal?.strMealThumb;
  const title = meal?.strMeal || 'Search for a recipe';
  const category = meal?.strCategory || 'Live recipe';
  const cuisine = meal?.strArea || 'TheMealDB';
  const avatarPreview = profile?.avatar_path ? getAvatarUrl(profile.avatar_path) : DEFAULT_AVATAR;
  const isSaved = meal ? cookbook.some((recipe) => recipe.idMeal === meal.idMeal) : false;
  const settingsDirty =
    settingsDraft.displayName !== (profile?.display_name || '') ||
    settingsDraft.diet !== (profile?.diet_preference || 'everything');

  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuth() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const callbackType = getAuthCallbackType();
      if (callbackType === 'recovery') {
        setAppStage('main');
        setView('settings');
        setAuthMode('reset');
        setAuthMessage('Set a new password for your account.');
      } else if (callbackType) {
        setAppStage('welcome');
        setView('discover');
        setWelcomeMessage(
          callbackType === 'signup'
            ? 'Welcome to Food Card. Your email has been confirmed.'
            : 'Welcome back. Your authentication link worked.'
        );
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (sessionError) {
        setAuthError(sessionError.message);
      } else {
        setSession(data.session);
        if (callbackType) {
          clearAuthCallbackUrl();
        }
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
      });

      return () => {
        subscription.unsubscribe();
      };
    }

    let cleanup;
    bootstrapAuth().then((nextCleanup) => {
      cleanup = nextCleanup;
    });

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadProfileAndCookbook() {
      if (!user) {
        setProfile(null);
        setCookbook([]);
        setDiet('everything');
        setSettingsDraft({ displayName: '', diet: 'everything' });
        setCookbookLoading(false);
        return;
      }

      setProfileLoading(true);
      setCookbookLoading(true);
      setCookbookError('');

      try {
        let nextProfile;

        try {
          nextProfile = await fetchProfile(user.id);
        } catch (fetchError) {
          if (fetchError.code === 'PGRST116') {
            nextProfile = await upsertProfile({
              id: user.id,
              email: user.email,
              display_name:
                user.user_metadata?.display_name ||
                user.email?.split('@')[0] ||
                'Food Card cook',
              diet_preference: 'everything',
            });
          } else {
            throw fetchError;
          }
        }

        const savedRecipes = await fetchCookbook(user.id);

        if (!isCurrent) return;

        setProfile(nextProfile);
        setDiet(nextProfile?.diet_preference || 'everything');
        setSettingsDraft({
          displayName: nextProfile?.display_name || '',
          diet: nextProfile?.diet_preference || 'everything',
        });
        setCookbook(savedRecipes);
      } catch (storageError) {
        if (!isCurrent) return;
        setCookbookError(storageError.message || 'Could not load your cookbook.');
        setProfile(null);
      } finally {
        if (!isCurrent) return;
        setProfileLoading(false);
        setCookbookLoading(false);
      }
    }

    loadProfileAndCookbook();

    return () => {
      isCurrent = false;
    };
  }, [user]);

  useEffect(() => {
    let isCurrent = true;

    async function loadRecipe() {
      setLoading(true);
      setError('');

      try {
        const data = await fetchRecipe(
          activeSearch.mode,
          activeSearch.query,
          diet,
          activeSearch.category
        );
        if (!isCurrent) return;

        if (!data) {
          setMeal(null);
          const courseText =
            activeSearch.category === 'all'
              ? ''
              : ` in ${getCategoryLabel(activeSearch.category).toLowerCase()}`;
          setError(
            `No${courseText} recipes found for "${activeSearch.query}" with your ${getDietLabel(diet).toLowerCase()} setting. Try ${
              activeSearch.mode === 'ingredient'
                ? 'chicken, beef, avocado, or pasta'
                : 'Italian, Mexican, Indian, or Canadian'
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

  function scrollToContent() {
    window.requestAnimationFrame(() => {
      viewContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function handleEnterApp() {
    rememberSplashDismissed();
    setAppStage('main');
  }

  function handleContinueFromWelcome() {
    window.history.replaceState({}, document.title, '/');
    setView('discover');
    setAppStage('main');
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextQuery = searchInput.trim();
    if (!nextQuery) return;

    setActiveSearch({ mode: searchMode, query: nextQuery, category: searchCategory });
    setView('discover');
  }

  async function handleDiscoverRandom() {
    setView('discover');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setLoading(true);
    setError('');

    try {
      const randomMeal = await fetchRandomRecipe(diet);
      if (!randomMeal) {
        setMeal(null);
        setError(
          `No random recipes matched your ${getDietLabel(diet).toLowerCase()} setting. Try another preference.`
        );
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
    if (!meal || isSaved || !user) return;

    try {
      await saveCookbookRecipe(user.id, meal);
      setCookbook((currentCookbook) => [meal, ...currentCookbook]);
      setCookbookError('');
    } catch (storageError) {
      setCookbookError(storageError.message || 'Could not save recipe to Supabase.');
    }
  }

  async function handleRemoveSavedRecipe(idMeal) {
    if (!user) return;

    try {
      await removeCookbookRecipe(user.id, idMeal);
      setCookbook((currentCookbook) =>
        currentCookbook.filter((recipe) => recipe.idMeal !== idMeal)
      );
      setCookbookError('');
    } catch (storageError) {
      setCookbookError(storageError.message || 'Could not remove recipe from Supabase.');
    }
  }

  function handleOpenSavedRecipe(recipe) {
    setMeal(recipe);
    setView('discover');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleViewChange(nextView) {
    setView(nextView);
    setSettingsStatus('');
    setAvatarMessage('');
    if (nextView === 'settings' && !user) {
      setAuthMode((currentMode) => (currentMode === 'reset' ? currentMode : 'login'));
    }
    scrollToContent();
  }

  function handleAuthFieldChange(field, value) {
    setAuthForm((currentForm) => ({ ...currentForm, [field]: value }));
    setAuthError('');
    setAuthMessage('');
  }

  function resetAuthForm() {
    setAuthForm({
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
  }

  function switchAuthMode(nextMode) {
    setAuthMode(nextMode);
    setAuthError('');
    setAuthMessage('');
    resetAuthForm();
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    if (!supabase) {
      setAuthError('Add your Supabase environment variables first.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthMessage('');

    try {
      if (authMode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password,
        });

        if (signInError) throw signInError;
        setAuthMessage('Welcome back.');
        setView('settings');
      }

      if (authMode === 'register') {
        if (authForm.password !== authForm.confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: {
            data: {
              display_name: authForm.displayName.trim(),
            },
            emailRedirectTo: getRedirectUrl(WELCOME_PATH),
          },
        });

        if (signUpError) throw signUpError;

        if (data.user && data.session) {
          await upsertProfile({
            id: data.user.id,
            email: data.user.email,
            display_name: authForm.displayName.trim() || data.user.email?.split('@')[0],
            diet_preference: 'everything',
          });
        }

        if (data.session) {
          setAuthMessage('Account created.');
        } else {
          setAuthMessage('Account created. Check your email to confirm your registration.');
        }
        resetAuthForm();
      }

      if (authMode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(authForm.email, {
          redirectTo: getRedirectUrl(RECOVERY_PATH),
        });

        if (resetError) throw resetError;
        setAuthMessage('Password recovery email sent.');
      }

      if (authMode === 'reset') {
        if (authForm.password !== authForm.confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        const { error: updateError } = await supabase.auth.updateUser({
          password: authForm.password,
        });

        if (updateError) throw updateError;

        resetAuthForm();
        setAuthError('');
        setAuthMessage('Password updated. You can now sign in.');
        setAuthMode('login');
        window.history.replaceState({}, document.title, '/');
      }
    } catch (submitError) {
      setAuthError(submitError.message || 'Could not complete authentication.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) return;

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setAuthError(signOutError.message || 'Could not sign out.');
      return;
    }

    setView('discover');
    setSettingsStatus('');
    setAvatarMessage('');
  }

  function handleSettingsDraftChange(field, value) {
    setSettingsDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
    setSettingsStatus('');
  }

  async function handleSaveSettings() {
    if (!user || !supabase) return;

    setSettingsLoading(true);
    setSettingsStatus('');

    try {
      const payload = {
        id: user.id,
        email: user.email,
        display_name: settingsDraft.displayName.trim() || user.email?.split('@')[0] || 'Food Card cook',
        diet_preference: settingsDraft.diet,
        avatar_path: profile?.avatar_path || null,
      };

      const [profileResult, authResult] = await Promise.all([
        upsertProfile(payload),
        supabase.auth.updateUser({
          data: {
            display_name: payload.display_name,
          },
        }),
      ]);

      if (authResult.error) throw authResult.error;

      setProfile(profileResult);
      setDiet(profileResult.diet_preference || 'everything');
      setSettingsDraft({
        displayName: profileResult.display_name || '',
        diet: profileResult.diet_preference || 'everything',
      });
      setSettingsStatus('Settings saved.');
    } catch (saveError) {
      setSettingsStatus(saveError.message || 'Could not save settings.');
    } finally {
      setSettingsLoading(false);
    }
  }

  async function handleAvatarUpload() {
    if (!user || !supabase || !avatarFile) return;

    setAvatarUploading(true);
    setAvatarMessage('');

    try {
      const extension = avatarFile.name.split('.').pop() || 'png';
      const nextPath = `${user.id}/${Date.now()}-${sanitizeFileName(
        avatarFile.name.replace(new RegExp(`\\.${extension}$`), '')
      )}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(nextPath, avatarFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const nextProfile = await upsertProfile({
        id: user.id,
        email: user.email,
        display_name: profile?.display_name || user.user_metadata?.display_name || user.email,
        diet_preference: profile?.diet_preference || 'everything',
        avatar_path: nextPath,
      });

      setProfile(nextProfile);
      setAvatarFile(null);
      setAvatarMessage('Avatar updated.');
    } catch (uploadError) {
      setAvatarMessage(uploadError.message || 'Could not upload avatar.');
    } finally {
      setAvatarUploading(false);
    }
  }

  function renderDiscoverPage() {
    return (
      <>
        <Hero>{heroImage ? <HeroImage src={heroImage} alt={title} /> : <HeroEmpty />}</Hero>

        <Content>
          <TitleCard>
            <TitleMeta>
              <Pill>{getDietLabel(diet)}</Pill>
              <Rating aria-label="Recipe source">
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
                <SearchSelect
                  aria-label="Course category"
                  value={searchCategory}
                  onChange={(event) => setSearchCategory(event.target.value)}
                >
                  {categoryOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
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
            {!user ? (
              <InfoBanner>
                Create an account in Settings to save your cookbook, preferences, and avatar in Supabase.
              </InfoBanner>
            ) : null}
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
            <ActionRow>
              <PrimaryButton
                type="button"
                onClick={handleSaveRecipe}
                disabled={!meal || isSaved || !user}
              >
                <BookIcon />
                {!user
                  ? 'Sign in to save'
                  : isSaved
                    ? 'Saved to cookbook'
                    : 'Save to cookbook'}
              </PrimaryButton>
              <SecondaryButton type="button" onClick={handleDiscoverRandom} disabled={loading}>
                <CompassIcon />
                Surprise me
              </SecondaryButton>
            </ActionRow>
          </TitleCard>

          <ViewContent ref={viewContentRef}>
            {meal ? (
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
          </ViewContent>
        </Content>
      </>
    );
  }

  function renderCookbookPage() {
    return (
      <StandaloneContent ref={viewContentRef}>
        <StandaloneHeader>
          <SectionTitle>
            Cookbook <small>({cookbook.length} saved)</small>
          </SectionTitle>
          <StandaloneIntro>
            Every signed-in user gets their own Supabase-backed cookbook storage.
          </StandaloneIntro>
        </StandaloneHeader>

        {!user ? (
          <EmptyState>
            Sign in or register in Settings to create a personal cookbook synced to your account.
          </EmptyState>
        ) : cookbookLoading || profileLoading ? (
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
                <RemoveButton type="button" onClick={() => handleRemoveSavedRecipe(recipe.idMeal)}>
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
      </StandaloneContent>
    );
  }

  function renderAuthCard() {
    const titleByMode = {
      login: 'Welcome back',
      register: 'Create your account',
      forgot: 'Password recovery',
      reset: 'Set a new password',
    };

    return (
      <SettingsCard>
        <h2>{titleByMode[authMode]}</h2>
        <p>
          Sign in to save your cookbook, preferences, and avatar in your own Supabase-backed
          account.
        </p>
        <AuthForm onSubmit={handleAuthSubmit}>
          {authMode === 'register' ? (
            <Field>
              <span>Display name</span>
              <TextInput
                value={authForm.displayName}
                onChange={(event) => handleAuthFieldChange('displayName', event.target.value)}
                placeholder="Chef Eugene"
              />
            </Field>
          ) : null}

          {authMode !== 'reset' ? (
            <Field>
              <span>Email</span>
              <TextInput
                type="email"
                value={authForm.email}
                onChange={(event) => handleAuthFieldChange('email', event.target.value)}
                placeholder="you@example.com"
                required
              />
            </Field>
          ) : null}

          {authMode !== 'forgot' ? (
            <Field>
              <span>{authMode === 'reset' ? 'New password' : 'Password'}</span>
              <TextInput
                type="password"
                value={authForm.password}
                onChange={(event) => handleAuthFieldChange('password', event.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>
          ) : null}

          {authMode === 'register' || authMode === 'reset' ? (
            <Field>
              <span>Confirm password</span>
              <TextInput
                type="password"
                value={authForm.confirmPassword}
                onChange={(event) => handleAuthFieldChange('confirmPassword', event.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>
          ) : null}

          {authError ? <InlineError role="alert">{authError}</InlineError> : null}
          {authMessage ? <InlineSuccess role="status">{authMessage}</InlineSuccess> : null}

          <PrimaryButton type="submit" disabled={authLoading}>
            <UserIcon />
            {authLoading
              ? 'Working...'
              : authMode === 'login'
                ? 'Sign in'
                : authMode === 'register'
                  ? 'Register'
                  : authMode === 'forgot'
                    ? 'Send recovery email'
                    : 'Save new password'}
          </PrimaryButton>
        </AuthForm>

        <LinkRow>
          {authMode !== 'login' ? (
            <InlineLinkButton type="button" onClick={() => switchAuthMode('login')}>
              Back to sign in
            </InlineLinkButton>
          ) : null}
          {authMode === 'login' ? (
            <>
              <InlineLinkButton type="button" onClick={() => switchAuthMode('register')}>
                Create account
              </InlineLinkButton>
              <InlineLinkButton type="button" onClick={() => switchAuthMode('forgot')}>
                Forgot password?
              </InlineLinkButton>
            </>
          ) : null}
        </LinkRow>
      </SettingsCard>
    );
  }

  function renderSettingsPage() {
    return (
      <StandaloneContent ref={viewContentRef}>
        <StandaloneHeader>
          <SectionTitle>Settings</SectionTitle>
          <StandaloneIntro>
            Manage account access, save your preferences, and personalize your avatar here.
          </StandaloneIntro>
        </StandaloneHeader>

        {!supabase ? (
          <EmptyState>
            Add your Supabase environment variables to enable login, password recovery, and user
            storage.
          </EmptyState>
        ) : !user ? (
          renderAuthCard()
        ) : (
          <SettingsStack>
            <SettingsCard>
              <SettingsHeader>
                <AvatarPreview src={avatarPreview} alt={profile?.display_name || user.email} />
                <div>
                  <h2>{profile?.display_name || user.user_metadata?.display_name || 'Your profile'}</h2>
                  <p>{user.email}</p>
                </div>
              </SettingsHeader>

              <Field>
                <span>Display name</span>
                <TextInput
                  value={settingsDraft.displayName}
                  onChange={(event) =>
                    handleSettingsDraftChange('displayName', event.target.value)
                  }
                  placeholder="Chef Eugene"
                />
              </Field>

              <Field>
                <span>Diet preference</span>
                <DietGrid>
                  {dietOptions.map(([value, label]) => (
                    <DietButton
                      key={value}
                      type="button"
                      onClick={() => handleSettingsDraftChange('diet', value)}
                      $active={settingsDraft.diet === value}
                    >
                      {label}
                    </DietButton>
                  ))}
                </DietGrid>
              </Field>

              <SettingsActions>
                <PrimaryButton
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={settingsLoading || !settingsDirty}
                >
                  <SettingsIcon />
                  {settingsLoading ? 'Saving...' : 'Save settings'}
                </PrimaryButton>
                {settingsStatus ? <InlineSuccess role="status">{settingsStatus}</InlineSuccess> : null}
              </SettingsActions>
            </SettingsCard>

            <SettingsCard>
              <h2>Editable avatar</h2>
              <p>Upload a profile image to personalize your Food Card account.</p>
              <Field>
                <span>Avatar image</span>
                <TextInput
                  as="input"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
                />
              </Field>
              <SettingsActions>
                <SecondaryButton
                  type="button"
                  onClick={handleAvatarUpload}
                  disabled={!avatarFile || avatarUploading}
                >
                  <UploadIcon />
                  {avatarUploading ? 'Uploading...' : 'Upload avatar'}
                </SecondaryButton>
                {avatarMessage ? <InlineSuccess role="status">{avatarMessage}</InlineSuccess> : null}
              </SettingsActions>
            </SettingsCard>

            <SettingsCard>
              <h2>Account</h2>
              <p>
                Password recovery is available from the sign-in form if you ever need to regain
                access to your account.
              </p>
              <SecondaryButton type="button" onClick={handleSignOut}>
                <LogoutIcon />
                Sign out
              </SecondaryButton>
            </SettingsCard>
          </SettingsStack>
        )}
      </StandaloneContent>
    );
  }

  if (appStage === 'splash') {
    return (
      <ThemeProviderWrapper>
        <GlobalStyle />
        <SplashScreen onEnter={handleEnterApp} />
      </ThemeProviderWrapper>
    );
  }

  if (appStage === 'welcome') {
    return (
      <ThemeProviderWrapper>
        <GlobalStyle />
        <WelcomeScreen
          userName={profile?.display_name || user?.user_metadata?.display_name || user?.email}
          message={welcomeMessage}
          onContinue={handleContinueFromWelcome}
        />
      </ThemeProviderWrapper>
    );
  }

  return (
    <ThemeProviderWrapper>
      <GlobalStyle />
      <AppShell>
        <TopBar>
          <BrandBlock>
            <BrandDot />
            <div>
              <BrandName>Food Card</BrandName>
              <BrandMeta>Recipes, settings, and cookbook sync</BrandMeta>
            </div>
          </BrandBlock>
          <TopActions>
            <ProfilePill type="button" onClick={() => handleViewChange('settings')}>
              <img src={avatarPreview} alt="" />
              <span>{user ? profile?.display_name || user.email : 'Sign in'}</span>
            </ProfilePill>
          </TopActions>
        </TopBar>

        {view === 'cookbook'
          ? renderCookbookPage()
          : view === 'settings'
            ? renderSettingsPage()
            : renderDiscoverPage()}

        <BottomNav aria-label="Primary">
          <NavItem type="button" onClick={() => handleViewChange('discover')} $active={view === 'discover'}>
            <CompassIcon />
            Discover
          </NavItem>
          <NavItem type="button" onClick={() => handleViewChange('cookbook')} $active={view === 'cookbook'}>
            <BookIcon />
            Cookbook
          </NavItem>
          <NavItem type="button" onClick={() => handleViewChange('settings')} $active={view === 'settings'}>
            <SettingsIcon />
            Settings
          </NavItem>
        </BottomNav>
      </AppShell>
    </ThemeProviderWrapper>
  );
}

function SplashScreen({ onEnter }) {
  return (
    <SplashShell onClick={onEnter}>
      <SplashVisual aria-hidden="true" />
      <SplashOverlay />
      <SplashContent>
        <MobileSplashLockup>
          <SplashCircle>
            <SplashLogoBadge>Food Card</SplashLogoBadge>
          </SplashCircle>
          <SplashWordmark>FOOD CARD</SplashWordmark>
          <SplashRule />
          <SplashTagline>Elevate your everyday cooking</SplashTagline>
          <SplashDots>
            <span />
            <span />
            <span />
          </SplashDots>
        </MobileSplashLockup>

        <DesktopSplashLockup>
          <DesktopIconCard>
            <UtensilsIcon />
          </DesktopIconCard>
          <DesktopTitle>Food Card</DesktopTitle>
          <DesktopSubtitle>
            Your thoughtfully curated digital cookbook for every modern kitchen.
          </DesktopSubtitle>
          <SplashCta type="button" onClick={onEnter}>
            Get Started
            <ArrowRightIcon />
          </SplashCta>
          <SyncStatus>
            <span />
            Syncing recipes
          </SyncStatus>
          <DesktopFootnote>
            <small>Featured dish</small>
            <strong>Rustic Heirloom Vegetable Roast</strong>
          </DesktopFootnote>
        </DesktopSplashLockup>

        <MobileSplashHint>Tap anywhere to continue</MobileSplashHint>
      </SplashContent>
    </SplashShell>
  );
}

function WelcomeScreen({ userName, message, onContinue }) {
  return (
    <WelcomeShell>
      <SplashVisual aria-hidden="true" />
      <SplashOverlay />
      <WelcomeCard>
        <WelcomeEyebrow>Welcome</WelcomeEyebrow>
        <WelcomeTitle>{userName ? `Hi, ${userName}` : 'You are signed in'}</WelcomeTitle>
        <WelcomeText>{message}</WelcomeText>
        <SplashCta type="button" onClick={onContinue}>
          Continue to Food Card
          <ArrowRightIcon />
        </SplashCta>
      </WelcomeCard>
    </WelcomeShell>
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
      radial-gradient(circle at top left, rgba(213, 235, 228, 0.35), transparent 30rem),
      ${theme.color.background};
  }

  button, input, select {
    font: inherit;
  }

  button {
    -webkit-tap-highlight-color: transparent;
  }

  img {
    display: block;
    max-width: 100%;
  }

  a {
    color: inherit;
  }
`;

const AppShell = styled.div`
  min-height: 100vh;
  padding-bottom: 90px;
`;

const TopBar = styled.header`
  position: fixed;
  inset: 0 0 auto;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 72px;
  padding: 12px clamp(16px, 4vw, 40px);
  background: rgba(255, 250, 247, 0.82);
  border-bottom: 1px solid rgba(217, 191, 177, 0.35);
  backdrop-filter: blur(12px);
`;

const BrandBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

const BrandDot = styled.span`
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, ${theme.color.accent}, ${theme.color.primary});
  box-shadow: 0 0 0 6px rgba(165, 88, 55, 0.12);
`;

const BrandName = styled.div`
  font-family: 'Epilogue', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 800;
`;

const BrandMeta = styled.div`
  color: ${theme.color.muted};
  font-size: 12px;
`;

const TopActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ProfilePill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  max-width: min(54vw, 280px);
  padding: 8px 10px 8px 8px;
  color: ${theme.color.text};
  background: ${theme.color.white};
  border: 1px solid rgba(217, 191, 177, 0.62);
  border-radius: 999px;
  box-shadow: ${theme.shadow.soft};
  cursor: pointer;

  img {
    width: 32px;
    height: 32px;
    border-radius: 999px;
    object-fit: cover;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 700;
  }
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

const Hero = styled.section`
  height: clamp(360px, 52vw, 620px);
  overflow: hidden;
  background: ${theme.color.dark};
`;

const HeroImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(1.04);
`;

const HeroEmpty = styled.div`
  width: 100%;
  height: 100%;
  background:
    linear-gradient(135deg, rgba(18, 17, 15, 0.9), rgba(53, 94, 87, 0.55)),
    ${theme.color.dark};
`;

const Content = styled.main`
  position: relative;
  z-index: 1;
  width: min(1140px, calc(100% - clamp(32px, 8vw, 96px)));
  margin: -72px auto 0;

  @media (max-width: 640px) {
    width: calc(100% - 24px);
    margin-top: -56px;
  }
`;

const StandaloneContent = styled.main`
  width: min(1080px, calc(100% - clamp(32px, 8vw, 96px)));
  margin: 108px auto 0;

  @media (max-width: 640px) {
    width: calc(100% - 24px);
    margin-top: 92px;
  }
`;

const StandaloneHeader = styled.div`
  margin-bottom: 22px;
`;

const StandaloneIntro = styled.p`
  max-width: 660px;
  margin: 0;
  color: ${theme.color.muted};
  font-size: 15px;
  line-height: 1.6;
`;

const TitleCard = styled.article`
  padding: clamp(18px, 3vw, 30px);
  background: ${theme.color.white};
  border: 1px solid rgba(217, 191, 177, 0.45);
  border-radius: 10px;
  box-shadow: ${theme.shadow.soft};

  h1 {
    max-width: 760px;
    margin: 12px 0 24px;
    font-family: 'Epilogue', system-ui, sans-serif;
    font-size: clamp(32px, 5vw, 54px);
    line-height: 1.08;
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
  color: ${theme.color.accent};
  font-size: 14px;

  small {
    color: ${theme.color.muted};
    font-size: 12px;
  }
`;

const SearchPanel = styled.form`
  display: grid;
  gap: 10px;
  margin: 0 0 18px;
  padding: 16px;
  background: ${theme.color.surfaceLow};
  border: 1px solid rgba(217, 191, 177, 0.44);
  border-radius: 10px;

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
  grid-template-columns: minmax(130px, 170px) minmax(120px, 150px) 1fr auto;
  gap: 10px;

  @media (max-width: 860px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    input,
    button {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 560px) {
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
  border: 1px solid rgba(217, 191, 177, 0.85);
  border-radius: 10px;
  outline: none;
  appearance: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;

  &:focus {
    border-color: ${theme.color.secondary};
    box-shadow: 0 0 0 3px rgba(53, 94, 87, 0.16);
  }
`;

const SearchInput = styled.input`
  width: 100%;
  min-height: 48px;
  padding: 0 15px;
  color: ${theme.color.text};
  background: ${theme.color.white};
  border: 1px solid rgba(217, 191, 177, 0.85);
  border-radius: 10px;
  outline: none;

  &:focus {
    border-color: ${theme.color.secondary};
    box-shadow: 0 0 0 3px rgba(53, 94, 87, 0.16);
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
  border-radius: 10px;
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

const InfoBanner = styled.div`
  margin-bottom: 18px;
  padding: 13px 14px;
  color: ${theme.color.secondary};
  background: ${theme.color.secondarySoft};
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.5;
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 16px 0 20px;
  border-block: 1px solid rgba(217, 191, 177, 0.42);

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
  border-radius: 10px;

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

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 54px;
  padding: 0 22px;
  color: ${theme.color.white};
  background: ${theme.color.primary};
  border: 1px solid ${theme.color.primaryDark};
  border-radius: 999px;
  box-shadow: 0 10px 24px rgba(165, 88, 55, 0.24);
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
    opacity: 0.72;
    transform: none;
  }
`;

const SecondaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 54px;
  padding: 0 22px;
  color: ${theme.color.secondary};
  background: ${theme.color.white};
  border: 1px solid rgba(53, 94, 87, 0.3);
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;

  &:disabled {
    cursor: default;
    opacity: 0.72;
  }
`;

const ViewContent = styled.div`
  scroll-margin-top: 96px;
`;

const RecipeGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 0.82fr) minmax(0, 1.18fr);
  gap: clamp(28px, 5vw, 56px);
  margin-top: 40px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const EmptyState = styled.div`
  margin-top: 24px;
  padding: 28px;
  color: ${theme.color.muted};
  background: ${theme.color.white};
  border: 1px solid rgba(217, 191, 177, 0.42);
  border-radius: 12px;
  box-shadow: ${theme.shadow.soft};
  font-size: 15px;
  line-height: 1.6;
`;

const SavedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const SavedCard = styled.article`
  overflow: hidden;
  background: ${theme.color.white};
  border: 1px solid rgba(217, 191, 177, 0.44);
  border-radius: 12px;
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
  border: 1px solid rgba(217, 191, 177, 0.7);
  border-radius: 10px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const IngredientsPanel = styled.section`
  align-self: start;

  @media (min-width: 861px) {
    position: sticky;
    top: 92px;
  }
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 20px;
  font-family: 'Epilogue', system-ui, sans-serif;
  font-size: clamp(22px, 2.8vw, 28px);
  line-height: 1.25;

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
  border: 1px solid rgba(217, 191, 177, 0.42);
  border-radius: 12px;
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
  border: 1px solid rgba(217, 191, 177, 0.46);
  border-radius: 12px;
  box-shadow: ${theme.shadow.soft};
`;

const SettingsStack = styled.div`
  display: grid;
  gap: 18px;
`;

const SettingsCard = styled.article`
  padding: 24px;
  background: ${theme.color.white};
  border: 1px solid rgba(217, 191, 177, 0.44);
  border-radius: 14px;
  box-shadow: ${theme.shadow.soft};

  h2 {
    margin: 0 0 8px;
    font-family: 'Epilogue', system-ui, sans-serif;
    font-size: 22px;
  }

  p {
    max-width: 680px;
    margin: 0 0 18px;
    color: ${theme.color.muted};
    font-size: 14px;
    line-height: 1.6;
  }
`;

const SettingsHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 22px;

  p {
    margin-bottom: 0;
  }
`;

const AvatarPreview = styled.img`
  width: 78px;
  height: 78px;
  border-radius: 999px;
  object-fit: cover;
  border: 3px solid ${theme.color.surfaceLow};
  box-shadow: ${theme.shadow.soft};
`;

const Field = styled.label`
  display: grid;
  gap: 8px;
  margin-bottom: 18px;

  span {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: ${theme.color.muted};
  }
`;

const TextInput = styled.input`
  width: 100%;
  min-height: 50px;
  padding: 12px 14px;
  color: ${theme.color.text};
  background: ${theme.color.white};
  border: 1px solid rgba(217, 191, 177, 0.82);
  border-radius: 10px;
  outline: none;

  &:focus {
    border-color: ${theme.color.secondary};
    box-shadow: 0 0 0 3px rgba(53, 94, 87, 0.16);
  }
`;

const DietGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 820px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const DietButton = styled.button`
  min-height: 48px;
  color: ${({ $active }) => ($active ? theme.color.white : theme.color.secondary)};
  background: ${({ $active }) => ($active ? theme.color.secondary : theme.color.surfaceLow)};
  border: 1px solid
    ${({ $active }) => ($active ? theme.color.secondary : 'rgba(217, 191, 177, 0.82)')};
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
`;

const SettingsActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
`;

const AuthForm = styled.form`
  display: grid;
  gap: 2px;
`;

const InlineError = styled.p`
  margin: 0 0 12px;
  color: ${theme.color.danger};
  font-size: 13px;
  font-weight: 600;
`;

const InlineSuccess = styled.p`
  margin: 0;
  color: ${theme.color.success};
  font-size: 13px;
  font-weight: 700;
`;

const LinkRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
`;

const InlineLinkButton = styled.button`
  padding: 0;
  color: ${theme.color.primary};
  background: transparent;
  border: 0;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
`;

const BottomNav = styled.nav`
  position: fixed;
  inset: auto 0 0;
  z-index: 20;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  height: 78px;
  padding: 8px clamp(10px, 4vw, 28px) max(8px, env(safe-area-inset-bottom));
  background: rgba(255, 250, 247, 0.96);
  border-top: 1px solid rgba(217, 191, 177, 0.44);
  backdrop-filter: blur(12px);
`;

const NavItem = styled.button`
  display: grid;
  place-items: center;
  align-content: center;
  gap: 5px;
  color: ${({ $active }) => ($active ? theme.color.primary : '#8d8177')};
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

const SplashShell = styled.div`
  position: relative;
  width: 100%;
  min-height: 100vh;
  color: ${theme.color.white};
  background: ${theme.color.dark};
  cursor: pointer;
  overflow: hidden;
`;

const WelcomeShell = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: 24px;
  overflow: hidden;
`;

const SplashVisual = styled.div`
  position: absolute;
  inset: 0;
  background-image: url(${splashMobile});
  background-size: cover;
  background-position: center;
  transform: scale(1.02);
  filter: saturate(0.98);

  @media (min-width: 900px) {
    background-image: url(${splashDesktop});
  }
`;

const SplashOverlay = styled.div`
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.38)),
    ${theme.color.heroShade};

  @media (min-width: 900px) {
    background: rgba(11, 10, 9, 0.2);
  }
`;

const SplashContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100vh;
  padding: 32px 24px 36px;
`;

const WelcomeCard = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: start;
  gap: 14px;
  width: min(100%, 560px);
  padding: clamp(26px, 5vw, 44px);
  color: ${theme.color.white};
  background: rgba(24, 18, 14, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 24px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(16px);
`;

const WelcomeEyebrow = styled.span`
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const WelcomeTitle = styled.h1`
  margin: 0;
  font-family: 'Epilogue', system-ui, sans-serif;
  font-size: clamp(34px, 5vw, 54px);
  line-height: 1.05;
`;

const WelcomeText = styled.p`
  margin: 0 0 8px;
  color: rgba(255, 255, 255, 0.88);
  font-size: 18px;
  line-height: 1.55;
`;

const MobileSplashLockup = styled.div`
  display: grid;
  justify-items: center;
  margin-top: auto;

  @media (min-width: 900px) {
    display: none;
  }
`;

const SplashCircle = styled.div`
  display: grid;
  place-items: center;
  width: 196px;
  height: 196px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 999px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.24);
`;

const SplashLogoBadge = styled.div`
  display: grid;
  place-items: center;
  width: 100px;
  height: 100px;
  color: ${theme.color.primaryDark};
  font-family: 'Epilogue', system-ui, sans-serif;
  font-size: 18px;
  font-weight: 800;
`;

const SplashWordmark = styled.h1`
  margin: 34px 0 14px;
  color: ${theme.color.white};
  font-family: 'Epilogue', system-ui, sans-serif;
  font-size: clamp(44px, 10vw, 72px);
  letter-spacing: 0.22em;
  text-indent: 0.22em;
  text-shadow: 0 8px 30px rgba(0, 0, 0, 0.34);
`;

const SplashRule = styled.span`
  width: 86px;
  height: 3px;
  background: rgba(255, 255, 255, 0.86);
  border-radius: 999px;
`;

const SplashTagline = styled.p`
  margin: 250px 0 42px;
  color: rgba(255, 255, 255, 0.9);
  font-size: clamp(20px, 5vw, 28px);
  font-style: italic;
  text-align: center;
  text-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
`;

const SplashDots = styled.div`
  display: flex;
  gap: 10px;

  span {
    width: 11px;
    height: 11px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.75);
  }

  span:nth-child(2),
  span:nth-child(3) {
    opacity: 0.55;
  }
`;

const MobileSplashHint = styled.div`
  margin-top: 26px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  @media (min-width: 900px) {
    display: none;
  }
`;

const DesktopSplashLockup = styled.div`
  display: none;

  @media (min-width: 900px) {
    display: grid;
    justify-items: center;
    align-content: center;
    min-height: calc(100vh - 64px);
    padding-top: 40px;
  }
`;

const DesktopIconCard = styled.div`
  display: grid;
  place-items: center;
  width: 140px;
  height: 140px;
  margin-bottom: 18px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 28px;
  backdrop-filter: blur(10px);
`;

const DesktopTitle = styled.h1`
  margin: 0;
  font-family: 'Epilogue', system-ui, sans-serif;
  font-size: clamp(64px, 7vw, 104px);
  font-weight: 800;
  letter-spacing: -0.05em;
  text-shadow: 0 12px 36px rgba(0, 0, 0, 0.24);
`;

const DesktopSubtitle = styled.p`
  max-width: 620px;
  margin: 14px 0 26px;
  color: rgba(255, 255, 255, 0.9);
  font-size: clamp(26px, 2vw, 32px);
  line-height: 1.22;
  text-align: center;
`;

const SplashCta = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-width: 286px;
  min-height: 84px;
  padding: 0 36px;
  color: ${theme.color.white};
  background: ${theme.color.primary};
  border: 0;
  border-radius: 18px;
  box-shadow: 0 24px 64px rgba(77, 37, 20, 0.34);
  cursor: pointer;
  font-size: 24px;
  font-weight: 800;

  &:hover {
    background: ${theme.color.primaryDark};
  }
`;

const SyncStatus = styled.div`
  display: grid;
  justify-items: center;
  gap: 12px;
  margin-top: 34px;
  color: rgba(255, 255, 255, 0.74);
  font-size: 15px;
  letter-spacing: 0.16em;
  text-transform: uppercase;

  span {
    width: 82px;
    height: 6px;
    border-radius: 999px;
    background:
      linear-gradient(90deg, rgba(255, 255, 255, 0.92) 0 42%, rgba(255, 255, 255, 0.34) 42% 100%);
  }
`;

const DesktopFootnote = styled.div`
  position: absolute;
  inset: auto auto 52px 60px;
  display: grid;
  gap: 8px;
  text-align: left;

  small {
    color: rgba(255, 255, 255, 0.54);
    font-size: 14px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  strong {
    font-size: 18px;
    font-weight: 700;
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

function UserIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19c1.4-3.2 3.7-4.8 6.5-4.8s5.1 1.6 6.5 4.8" />
    </Icon>
  );
}

function UploadIcon() {
  return (
    <Icon>
      <path d="M12 16V5" />
      <path d="M8 9l4-4 4 4" />
      <path d="M5 19h14" />
    </Icon>
  );
}

function LogoutIcon() {
  return (
    <Icon>
      <path d="M10 17l-5-5 5-5" />
      <path d="M5 12h11" />
      <path d="M14 5h4v14h-4" />
    </Icon>
  );
}

function UtensilsIcon() {
  return (
    <Icon>
      <path d="M7 4v7" />
      <path d="M10 4v7" />
      <path d="M7 7h3" />
      <path d="M8.5 11v9" />
      <path d="M15 4c0 3-1.5 4.5-3 5v11" />
    </Icon>
  );
}

function ArrowRightIcon() {
  return (
    <Icon>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </Icon>
  );
}

createRoot(document.getElementById('root')).render(<App />);
