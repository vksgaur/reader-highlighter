/**
 * @fileoverview Centralized constants for the application.
 */

// Local Storage Keys
export const STORAGE_KEYS = {
    READER_SETTINGS: 'readerSettings',
    SIDEBAR_COLLAPSED: 'sidebarCollapsed',
    THEME: 'theme',
};

// CSS Classes for UI states and themes
export const CSS_CLASSES = {
    // General
    HIDDEN: 'hidden',
    FLEX: 'flex',

    // Dark Mode
    DARK: 'dark',

    // Sidebar
    SIDEBAR_COLLAPSED: 'sidebar-collapsed',
    SIDEBAR_TRANSLATE_FULL: '-translate-x-full',
    
    // Article Card States
    SELECTED_CARD: ['bg-indigo-50', 'dark:bg-slate-800', 'border-indigo-500'],
    DEFAULT_CARD: ['bg-white', 'dark:bg-slate-800/50', 'border-transparent'],

    // View Toggle Buttons
    ACTIVE_BUTTON: ['bg-white', 'dark:bg-slate-500'],

    // Tag Filter Buttons
    ACTIVE_TAG: 'bg-indigo-600',
    INACTIVE_TAG_TEXT: 'text-white',

    // Reader Settings Buttons
    READER_SETTING_ACTIVE: 'bg-indigo-500',

    // Confirmation Modal Buttons
    CONFIRM_BUTTON_RED: 'bg-red-600',
    CONFIRM_BUTTON_HOVER_RED: 'hover:bg-red-700',
};

// Highlight Colors
export const HIGHLIGHT_COLORS = {
    YELLOW: 'yellow',
    PINK: 'pink',
    SKY: 'sky',
    GREEN: 'green',
};
