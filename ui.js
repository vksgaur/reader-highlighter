import * as db from './firestore.js';
import { showToast } from './notifications.js';
import { STORAGE_KEYS, CSS_CLASSES, HIGHLIGHT_COLORS } from './constants.js';

// --- DOM Element References ---
// We will populate this object once the DOM is ready.
let elements = {};

// --- State Variables ---
let currentArticleId = null;
let activeTagFilter = null;
let isShowingArchived = false;
let currentSelection = null;
let currentEditingHighlight = null;


/**
 * Caches all the DOM elements needed for the UI.
 * This should be called once the DOM is fully loaded.
 */
function cacheDOMElements() {
    elements = {
        appView: document.getElementById('app-view'),
        urlForm: document.getElementById('url-form'),
        articleUrlInput: document.getElementById('article-url'),
        articleView: document.getElementById('article-view'),
        articleContentWrapper: document.getElementById('article-content-wrapper'),
        articleContent: document.getElementById('article-content'),
        placeholder: document.getElementById('placeholder'),
        loaderMain: document.getElementById('loader-main'),
        loaderSidebar: document.getElementById('loader-sidebar'),
        savedArticlesList: document.getElementById('saved-articles-list'),
        highlightTooltip: document.getElementById('highlight-tooltip'),
        editHighlightTooltip: document.getElementById('edit-highlight-tooltip'),
        highlightsModal: document.getElementById('highlights-modal'),
        highlightsList: document.getElementById('highlights-list'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        themeToggleBtn: document.getElementById('theme-toggle'),
        lightIcon: document.getElementById('theme-toggle-light-icon'),
        darkIcon: document.getElementById('theme-toggle-dark-icon'),
        tagFiltersContainer: document.getElementById('tag-filters'),
        viewActiveBtn: document.getElementById('view-active-btn'),
        viewArchivedBtn: document.getElementById('view-archived-btn'),
        highlightsModalTitle: document.getElementById('highlights-modal-title'),
        readerSettingsBtn: document.getElementById('reader-settings-btn'),
        readerSettingsMenu: document.getElementById('reader-settings-menu'),
        sidebar: document.getElementById('sidebar'),
        sidebarToggle: document.getElementById('sidebar-toggle'),
        mobileMenuBtn: document.getElementById('mobile-menu-btn'),
        sidebarBackdrop: document.getElementById('sidebar-backdrop'),
        addNoteModal: document.getElementById('add-note-modal'),
        noteHighlightContext: document.getElementById('note-highlight-context'),
        noteTextarea: document.getElementById('note-textarea'),
        saveNoteBtn: document.getElementById('save-note-btn'),
        cancelNoteBtn: document.getElementById('cancel-note-btn'),
        searchInput: document.getElementById('search-input'),
        surpriseMeBtn: document.getElementById('surprise-me-btn'),
        confirmModal: document.getElementById('confirm-modal'),
        confirmModalTitle: document.getElementById('confirm-modal-title'),
        confirmModalText: document.getElementById('confirm-modal-text'),
        confirmModalConfirmBtn: document.getElementById('confirm-modal-confirm-btn'),
        confirmModalCancelBtn: document.getElementById('confirm-modal-cancel-btn'),
        manageTagsBtn: document.getElementById('manage-tags-btn'),
        tagManagementModal: document.getElementById('tag-management-modal'),
        tagManagementList: document.getElementById('tag-management-list'),
        closeTagModalBtn: document.getElementById('close-tag-modal-btn'),
    };
}

// --- Main UI Rendering ---

export function renderSidebar(allUserArticles, tagMetadata) {
    if (!elements.loaderSidebar) return; // Guard against premature calls
    elements.loaderSidebar.style.display = 'none';
    let articlesToDisplay = [...allUserArticles];
    articlesToDisplay = articlesToDisplay.filter(article => (article.isArchived || false) === isShowingArchived);
    const searchTerm = elements.searchInput.value.toLowerCase().trim();
    if (searchTerm) {
        articlesToDisplay = articlesToDisplay.filter(article => {
            const titleMatch = (article.title || '').toLowerCase().includes(searchTerm);
            const contentMatch = (article.content || '').toLowerCase().includes(searchTerm);
            return titleMatch || contentMatch;
        });
    }
    if (activeTagFilter) {
        articlesToDisplay = articlesToDisplay.filter(article => (article.tags || []).includes(activeTagFilter));
    }
    articlesToDisplay.sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
        return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
    });

    renderTagFilters(allUserArticles, tagMetadata);

    elements.savedArticlesList.innerHTML = '';
    if (articlesToDisplay.length === 0) {
        let emptyMessage = isShowingArchived ? 'No archived articles.' : 'No active articles.';
        if (searchTerm) emptyMessage = `No results for "${searchTerm}".`;
        else if (activeTagFilter) emptyMessage = `No articles with tag "${activeTagFilter}".`;
        elements.savedArticlesList.innerHTML = `<p class="p-4 text-sm text-slate-400 dark:text-slate-500">${emptyMessage}</p>`;
        return;
    }

    articlesToDisplay.forEach(article => {
        const articleEl = createArticleCard(article, tagMetadata);
        elements.savedArticlesList.appendChild(articleEl);
    });
}

// ... other functions like renderTagFilters, createArticleCard, etc. ...

// --- ADDED THIS FUNCTION BACK ---
export const clearUIForSignOut = () => {
    if (!elements.savedArticlesList) return; // Guard in case this is called before UI is ready
    elements.savedArticlesList.innerHTML = '<p class="p-4 text-sm text-slate-400 dark:text-slate-500">Please sign in to see your articles.</p>';
    elements.articleContent.innerHTML = '';
    elements.placeholder.style.display = 'block';
    elements.loaderMain.style.display = 'none';
    currentArticleId = null;
    activeTagFilter = null;
    isShowingArchived = false;
};


// --- Initial Setup ---

export function initializeUI() {
    cacheDOMElements(); 
    
    elements.urlForm.addEventListener('submit', handleUrlFormSubmit);
    elements.searchInput.addEventListener('input', () => renderSidebar(db.getArticles(), db.getTagMetadata()));
    elements.surpriseMeBtn.addEventListener('click', handleSurpriseMe);
    
    setupDarkMode();
    setupViewToggle();
    setupReaderSettings();
    setupSidebarToggle();
    setupHighlighting();
    setupModals();
    setupTagManagement();
}

// ... rest of the file remains the same ...
