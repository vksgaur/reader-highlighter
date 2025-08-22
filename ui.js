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

function renderTagFilters(allUserArticles, tagMetadata) {
    const viewableArticlesForTags = allUserArticles.filter(article => (article.isArchived || false) === isShowingArchived);
    const allTags = new Set(viewableArticlesForTags.flatMap(article => article.tags || []));
    elements.tagFiltersContainer.innerHTML = '';
    
    const allBtn = document.createElement('button');
    allBtn.textContent = 'All';
    allBtn.className = `px-2 py-1 text-xs rounded-md ${!activeTagFilter ? `bg-indigo-600 text-white` : 'bg-slate-200 dark:bg-slate-700'}`;
    allBtn.onclick = () => {
        activeTagFilter = null;
        renderSidebar(db.getArticles(), db.getTagMetadata());
    };
    elements.tagFiltersContainer.appendChild(allBtn);

    allTags.forEach(tag => {
        const tagBtn = document.createElement('button');
        const tagColor = tagMetadata[tag]?.color || '#e2e8f0'; // default slate-200
        tagBtn.className = `flex items-center px-2 py-1 text-xs rounded-md ${activeTagFilter === tag ? `bg-indigo-600 text-white` : 'bg-slate-200 dark:bg-slate-700'}`;
        tagBtn.innerHTML = `<span class="w-3 h-3 rounded-full mr-2" style="background-color: ${tagColor}; display: inline-block;"></span>${tag}`;
        tagBtn.onclick = () => {
            activeTagFilter = tag;
            renderSidebar(db.getArticles(), db.getTagMetadata());
        };
        elements.tagFiltersContainer.appendChild(tagBtn);
    });
}

function createArticleCard(article, tagMetadata) {
    const articleEl = document.createElement('div');
    const isSelected = article.id === currentArticleId;
    articleEl.className = `group p-4 m-1 rounded-lg border flex flex-col justify-between items-start transition-all duration-200 ${isSelected ? 'bg-indigo-50 dark:bg-slate-800 border-indigo-500' : 'bg-white dark:bg-slate-800/50 border-transparent'}`;
    articleEl.dataset.id = article.id;
    
    const topRow = document.createElement('div');
    topRow.className = 'w-full flex justify-between items-start';

    const leftColumn = document.createElement('div');
    leftColumn.className = 'flex-grow overflow-hidden mr-2';

    const textContainer = document.createElement('div');
    textContainer.className = 'cursor-pointer';
    const readingTimeInfo = article.readingTime ? ` &bull; ${article.readingTime} min read` : '';
    textContainer.innerHTML = `<h3 class="font-semibold text-slate-800 dark:text-slate-100 truncate">${article.title || 'Untitled Article'}</h3><p class="text-xs text-slate-500 dark:text-slate-400 truncate">${article.url}</p><p class="text-xs text-slate-400 dark:text-slate-500 mt-1">${readingTimeInfo}</p>`;
    textContainer.addEventListener('click', () => loadArticle(article.id));
    
    leftColumn.appendChild(textContainer);

    const rightColumn = document.createElement('div');
    rightColumn.className = 'flex flex-col items-center flex-shrink-0 space-y-2 opacity-0 group-hover:opacity-100 transition-opacity';

    // ... (action buttons logic remains the same)

    topRow.appendChild(leftColumn);
    topRow.appendChild(rightColumn);
    articleEl.appendChild(topRow);

    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'mt-2 w-full flex items-center flex-wrap gap-2';
    
    (article.tags || []).forEach(tag => {
        const tagEl = document.createElement('span');
        const tagColor = tagMetadata[tag]?.color || '#94a3b8';
        tagEl.className = 'flex items-center text-xs text-slate-600 dark:text-slate-300';
        tagEl.innerHTML = `<span class="w-2 h-2 rounded-full mr-1.5" style="background-color: ${tagColor};"></span>${tag}`;
        tagsContainer.appendChild(tagEl);
    });

    const addTagBtn = document.createElement('button');
    addTagBtn.innerHTML = `<svg class="w-4 h-4 text-slate-400 hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>`;
    addTagBtn.title = 'Add Tag';
    addTagBtn.onclick = (e) => {
        e.stopPropagation();
        const input = e.currentTarget.nextElementSibling;
        input.classList.toggle('hidden');
        if (!input.classList.contains('hidden')) input.focus();
    };

    const addTagInput = document.createElement('input');
    addTagInput.type = 'text';
    addTagInput.placeholder = 'New tag...';
    addTagInput.className = 'hidden ml-2 text-xs p-1 rounded bg-slate-200 dark:bg-slate-700';
    addTagInput.onclick = e => e.stopPropagation();
    addTagInput.onkeydown = async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.target.value.trim()) {
                await db.addTag(article.id, e.target.value);
            }
            e.target.value = '';
            e.target.classList.add('hidden');
        } else if (e.key === 'Escape') {
            e.target.classList.add('hidden');
        }
    };

    tagsContainer.appendChild(addTagBtn);
    tagsContainer.appendChild(addTagInput);
    articleEl.appendChild(tagsContainer);
    
    return articleEl;
}

// --- ADDED THIS FUNCTION BACK AND EXPORTED IT ---
export const clearUIForSignOut = () => {
    if (!elements.savedArticlesList) return; // Guard in case this is called before UI is ready
    elements.savedArticlesList.innerHTML = '<p class="p-4 text-sm text-slate-400 dark:text-slate-500">Please sign in to see your articles.</p>';
    if (elements.articleContent) elements.articleContent.innerHTML = '';
    if (elements.placeholder) elements.placeholder.style.display = 'block';
    if (elements.loaderMain) elements.loaderMain.style.display = 'none';
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

// ... All other functions like handleUrlFormSubmit, setupDarkMode, setupHighlighting, etc., go here ...
// (Make sure the rest of your functions from the previous version are included below)


