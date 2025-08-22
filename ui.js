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

export function renderSidebar(allUserArticles, tagMetadata = {}) {
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
        renderSidebar(db.getArticles(), {});
    };
    elements.tagFiltersContainer.appendChild(allBtn);

    allTags.forEach(tag => {
        const tagBtn = document.createElement('button');
        const tagColor = tagMetadata[tag]?.color || '#e2e8f0'; // default slate-200
        tagBtn.className = `flex items-center px-2 py-1 text-xs rounded-md ${activeTagFilter === tag ? `bg-indigo-600 text-white` : 'bg-slate-200 dark:bg-slate-700'}`;
        tagBtn.innerHTML = `<span class="w-3 h-3 rounded-full mr-2" style="background-color: ${tagColor}; display: inline-block;"></span>${tag}`;
        tagBtn.onclick = () => {
            activeTagFilter = tag;
            renderSidebar(db.getArticles(), {});
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

    // Favorite button
    const favoriteBtn = document.createElement('button');
    favoriteBtn.className = `favorite-btn p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${article.isFavorite ? 'favorited' : ''}`;
    favoriteBtn.innerHTML = `
        <svg class="w-4 h-4 text-yellow-500 empty-star" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
        </svg>
        <svg class="w-4 h-4 text-yellow-500 filled-star" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
        </svg>
    `;
    favoriteBtn.onclick = (e) => {
        e.stopPropagation();
        db.toggleFavorite(article.id, article.isFavorite);
    };

    // Archive button
    const archiveBtn = document.createElement('button');
    archiveBtn.className = 'p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700';
    const archiveIcon = article.isArchived 
        ? `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l3-3m0 0l3 3m-3-3v6m0-6V5a2 2 0 012-2h4a2 2 0 012 2v6.5"></path></svg>`
        : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8l6 6 6-6"></path></svg>`;
    archiveBtn.innerHTML = archiveIcon;
    archiveBtn.title = article.isArchived ? 'Unarchive' : 'Archive';
    archiveBtn.onclick = (e) => {
        e.stopPropagation();
        db.toggleArchive(article.id, article.isArchived);
    };

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'p-1 rounded hover:bg-red-200 dark:hover:bg-red-800 text-red-600';
    deleteBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
    deleteBtn.title = 'Delete';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        showConfirmModal(
            'Delete Article',
            'Are you sure you want to delete this article? This action cannot be undone.',
            () => db.deleteArticleFromDb(article.id)
        );
    };

    rightColumn.appendChild(favoriteBtn);
    rightColumn.appendChild(archiveBtn);
    rightColumn.appendChild(deleteBtn);

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

// --- EXPORTED clearUIForSignOut function ---
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

// --- Helper Functions ---
async function loadArticle(articleId) {
    if (currentArticleId === articleId) return;
    
    currentArticleId = articleId;
    elements.placeholder.style.display = 'none';
    elements.loaderMain.style.display = 'block';
    elements.articleContent.innerHTML = '';
    
    try {
        const article = await db.getArticle(articleId);
        if (!article) {
            showToast('Article not found', 'Error');
            return;
        }
        
        elements.loaderMain.style.display = 'none';
        elements.articleContent.innerHTML = article.content;
        
        // Update URL without page reload
        const url = new URL(window.location);
        url.searchParams.set('article', articleId);
        window.history.replaceState({}, '', url);
        
        // Re-render sidebar to update selection
        renderSidebar(db.getArticles(), {});
    } catch (error) {
        console.error('Error loading article:', error);
        elements.loaderMain.style.display = 'none';
        showToast('Failed to load article', 'Error');
    }
}

function showConfirmModal(title, text, onConfirm) {
    if (!elements.confirmModal) return;
    
    elements.confirmModalTitle.textContent = title;
    elements.confirmModalText.textContent = text;
    
    elements.confirmModal.classList.remove('hidden');
    elements.confirmModal.classList.add('flex');
    
    const handleConfirm = () => {
        onConfirm();
        hideConfirmModal();
        elements.confirmModalConfirmBtn.removeEventListener('click', handleConfirm);
    };
    
    const handleCancel = () => {
        hideConfirmModal();
        elements.confirmModalCancelBtn.removeEventListener('click', handleCancel);
    };
    
    elements.confirmModalConfirmBtn.addEventListener('click', handleConfirm);
    elements.confirmModalCancelBtn.addEventListener('click', handleCancel);
}

function hideConfirmModal() {
    if (!elements.confirmModal) return;
    elements.confirmModal.classList.add('hidden');
    elements.confirmModal.classList.remove('flex');
}

// --- Event Handlers ---
async function handleUrlFormSubmit(e) {
    e.preventDefault();
    const url = elements.articleUrlInput.value.trim();
    if (!url) return;

    elements.placeholder.style.display = 'none';
    elements.loaderMain.style.display = 'block';
    elements.articleContent.innerHTML = '';

    try {
        // Fetch the webpage
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        if (!response.ok || !data.contents) {
            throw new Error('Failed to fetch the article');
        }

        // Parse the HTML and extract article content using Readability
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');
        const reader = new Readability(doc);
        const article = reader.parse();

        if (!article) {
            throw new Error('Could not extract article content from this URL');
        }

        // Save to database
        const articleData = {
            title: article.title,
            content: article.content,
            url: url,
            readingTime: Math.ceil(article.length / 1000) // Rough estimate: 1000 chars per minute
        };

        const docRef = await db.saveArticle(articleData);
        currentArticleId = docRef.id;

        // Display the article
        elements.loaderMain.style.display = 'none';
        elements.articleContent.innerHTML = article.content;
        elements.articleUrlInput.value = '';

        showToast('Article saved successfully!', 'Success', 'success');

    } catch (error) {
        console.error('Error fetching article:', error);
        elements.loaderMain.style.display = 'none';
        elements.placeholder.style.display = 'block';
        showToast(error.message, 'Error');
    }
}

function handleSurpriseMe() {
    const articles = db.getArticles().filter(article => !article.isArchived);
    if (articles.length === 0) {
        showToast('No articles available', 'Info', 'info');
        return;
    }
    
    const randomArticle = articles[Math.floor(Math.random() * articles.length)];
    loadArticle(randomArticle.id);
}

// --- Setup Functions ---
function setupDarkMode() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add(CSS_CLASSES.DARK);
        elements.lightIcon.classList.add(CSS_CLASSES.HIDDEN);
        elements.darkIcon.classList.remove(CSS_CLASSES.HIDDEN);
    } else {
        elements.darkIcon.classList.add(CSS_CLASSES.HIDDEN);
        elements.lightIcon.classList.remove(CSS_CLASSES.HIDDEN);
    }

    elements.themeToggleBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle(CSS_CLASSES.DARK);
        elements.lightIcon.classList.toggle(CSS_CLASSES.HIDDEN);
        elements.darkIcon.classList.toggle(CSS_CLASSES.HIDDEN);
        
        const currentTheme = document.documentElement.classList.contains(CSS_CLASSES.DARK) ? 'dark' : 'light';
        localStorage.setItem(STORAGE_KEYS.THEME, currentTheme);
    });
}

function setupViewToggle() {
    elements.viewActiveBtn.classList.add(...CSS_CLASSES.ACTIVE_BUTTON);
    
    elements.viewActiveBtn.addEventListener('click', () => {
        if (isShowingArchived) {
            isShowingArchived = false;
            elements.viewActiveBtn.classList.add(...CSS_CLASSES.ACTIVE_BUTTON);
            elements.viewArchivedBtn.classList.remove(...CSS_CLASSES.ACTIVE_BUTTON);
            renderSidebar(db.getArticles(), {});
        }
    });

    elements.viewArchivedBtn.addEventListener('click', () => {
        if (!isShowingArchived) {
            isShowingArchived = true;
            elements.viewArchivedBtn.classList.add(...CSS_CLASSES.ACTIVE_BUTTON);
            elements.viewActiveBtn.classList.remove(...CSS_CLASSES.ACTIVE_BUTTON);
            renderSidebar(db.getArticles(), {});
        }
    });
}

function setupReaderSettings() {
    // Create reader settings menu content
    elements.readerSettingsMenu.innerHTML = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-2">Theme</label>
                <div class="flex gap-2">
                    <button class="theme-btn px-3 py-2 text-sm rounded border-2" data-theme="light">Light</button>
                    <button class="theme-btn px-3 py-2 text-sm rounded border-2" data-theme="sepia">Sepia</button>
                    <button class="theme-btn px-3 py-2 text-sm rounded border-2" data-theme="dark">Dark</button>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Font Size</label>
                <div class="flex gap-2">
                    <button class="font-size-btn px-3 py-2 text-sm rounded bg-slate-200 dark:bg-slate-600" data-size="small">Small</button>
                    <button class="font-size-btn px-3 py-2 text-sm rounded bg-slate-200 dark:bg-slate-600" data-size="medium">Medium</button>
                    <button class="font-size-btn px-3 py-2 text-sm rounded bg-slate-200 dark:bg-slate-600" data-size="large">Large</button>
                </div>
            </div>
        </div>
    `;

    // Load saved settings
    const savedSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.READER_SETTINGS) || '{"theme": "light", "fontSize": "medium"}');
    applyReaderSettings(savedSettings);

    // Setup event listeners
    elements.readerSettingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.readerSettingsMenu.classList.toggle('hidden');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!elements.readerSettingsMenu.contains(e.target) && !elements.readerSettingsBtn.contains(e.target)) {
            elements.readerSettingsMenu.classList.add('hidden');
        }
    });

    // Theme buttons
    elements.readerSettingsMenu.addEventListener('click', (e) => {
        if (e.target.matches('.theme-btn')) {
            const theme = e.target.dataset.theme;
            savedSettings.theme = theme;
            applyReaderSettings(savedSettings);
            localStorage.setItem(STORAGE_KEYS.READER_SETTINGS, JSON.stringify(savedSettings));
        }

        if (e.target.matches('.font-size-btn')) {
            const fontSize = e.target.dataset.size;
            savedSettings.fontSize = fontSize;
            applyReaderSettings(savedSettings);
            localStorage.setItem(STORAGE_KEYS.READER_SETTINGS, JSON.stringify(savedSettings));
        }
    });
}

function applyReaderSettings(settings) {
    // Apply theme
    elements.articleContentWrapper.className = elements.articleContentWrapper.className.replace(/theme-\w+/g, '');
    elements.articleContentWrapper.classList.add(`theme-${settings.theme}`);

    // Apply font size
    elements.articleContentWrapper.className = elements.articleContentWrapper.className.replace(/text-(sm|base|lg|xl)/g, '');
    const fontSizeClass = {
        small: 'text-sm',
        medium: 'text-base',
        large: 'text-lg'
    }[settings.fontSize] || 'text-base';
    elements.articleContentWrapper.classList.add(fontSizeClass);

    // Update active buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === settings.theme);
    });

    document.querySelectorAll('.font-size-btn').forEach(btn => {
        const isActive = btn.dataset.size === settings.fontSize;
        btn.classList.toggle(CSS_CLASSES.READER_SETTING_ACTIVE, isActive);
        btn.classList.toggle('bg-slate-200', !isActive);
        btn.classList.toggle('dark:bg-slate-600', !isActive);
    });
}

function setupSidebarToggle() {
    const savedCollapsed = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true';
    if (savedCollapsed) {
        elements.appView.classList.add(CSS_CLASSES.SIDEBAR_COLLAPSED);
    }

    elements.sidebarToggle.addEventListener('click', () => {
        elements.appView.classList.toggle(CSS_CLASSES.SIDEBAR_COLLAPSED);
        const isCollapsed = elements.appView.classList.contains(CSS_CLASSES.SIDEBAR_COLLAPSED);
        localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, isCollapsed.toString());
    });

    // Mobile menu
    elements.mobileMenuBtn.addEventListener('click', () => {
        elements.sidebar.classList.toggle(CSS_CLASSES.SIDEBAR_TRANSLATE_FULL);
        elements.sidebarBackdrop.classList.toggle(CSS_CLASSES.HIDDEN);
    });

    elements.sidebarBackdrop.addEventListener('click', () => {
        elements.sidebar.classList.add(CSS_CLASSES.SIDEBAR_TRANSLATE_FULL);
        elements.sidebarBackdrop.classList.add(CSS_CLASSES.HIDDEN);
    });
}

function setupHighlighting() {
    // Text selection and highlighting logic would go here
    // This is a placeholder for the highlighting functionality
}

function setupModals() {
    // Setup for various modals would go here
    // This is a placeholder for modal functionality
}

function setupTagManagement() {
    if (elements.manageTagsBtn) {
        elements.manageTagsBtn.addEventListener('click', () => {
            elements.tagManagementModal.classList.remove('hidden');
            elements.tagManagementModal.classList.add('flex');
        });
    }

    if (elements.closeTagModalBtn) {
        elements.closeTagModalBtn.addEventListener('click', () => {
            elements.tagManagementModal.classList.add('hidden');
            elements.tagManagementModal.classList.remove('flex');
        });
    }
}

// --- Initial Setup ---
export function initializeUI() {
    cacheDOMElements(); 
    
    elements.urlForm.addEventListener('submit', handleUrlFormSubmit);
    elements.searchInput.addEventListener('input', () => renderSidebar(db.getArticles(), {}));
    elements.surpriseMeBtn.addEventListener('click', handleSurpriseMe);
    
    setupDarkMode();
    setupViewToggle();
    setupReaderSettings();
    setupSidebarToggle();
    setupHighlighting();
    setupModals();
    setupTagManagement();
}
