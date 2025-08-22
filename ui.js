import * as db from './firestore.js';
import { showToast } from './notifications.js';
import { STORAGE_KEYS, CSS_CLASSES, HIGHLIGHT_COLORS } from './constants.js';

// --- DOM Element References ---
const elements = {
    appView: document.getElementById('app-view'), // Main container
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
    sidebarToggleIcon: document.getElementById('sidebar-toggle-icon'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    sidebarBackdrop: document.getElementById('sidebar-backdrop'),
    progressBar: document.getElementById('progress-bar'),
    addNoteModal: document.getElementById('add-note-modal'),
    noteHighlightContext: document.getElementById('note-highlight-context'),
    noteTextarea: document.getElementById('note-textarea'),
    saveNoteBtn: document.getElementById('save-note-btn'),
    cancelNoteBtn: document.getElementById('cancel-note-btn'),
    searchInput: document.getElementById('search-input'),
    surpriseMeBtn: document.getElementById('surprise-me-btn'),
    imageExportContainer: document.getElementById('image-export-container'),
    confirmModal: document.getElementById('confirm-modal'),
    confirmModalTitle: document.getElementById('confirm-modal-title'),
    confirmModalText: document.getElementById('confirm-modal-text'),
    confirmModalConfirmBtn: document.getElementById('confirm-modal-confirm-btn'),
    confirmModalCancelBtn: document.getElementById('confirm-modal-cancel-btn'),
};

let currentArticleId = null;
let activeTagFilter = null;
let isShowingArchived = false;
let currentSelection = null;
let currentEditingHighlight = null;

// --- General UI Functions ---

function showConfirmation(title, text, confirmButtonClass = `${CSS_CLASSES.CONFIRM_BUTTON_RED} ${CSS_CLASSES.CONFIRM_BUTTON_HOVER_RED}`) {
    return new Promise(resolve => {
        elements.confirmModalTitle.textContent = title;
        elements.confirmModalText.textContent = text;
        elements.confirmModalConfirmBtn.className = `px-4 py-2 rounded text-sm font-semibold text-white ${confirmButtonClass}`;
        
        elements.confirmModal.classList.remove(CSS_CLASSES.HIDDEN);
        elements.confirmModal.classList.add(CSS_CLASSES.FLEX);

        const onConfirm = () => closeAndResolve(true);
        const onCancel = () => closeAndResolve(false);
        
        const closeAndResolve = (value) => {
            elements.confirmModal.classList.add(CSS_CLASSES.HIDDEN);
            elements.confirmModal.classList.remove(CSS_CLASSES.FLEX);
            elements.confirmModalConfirmBtn.removeEventListener('click', onConfirm);
            elements.confirmModalCancelBtn.removeEventListener('click', onCancel);
            resolve(value);
        }
        
        elements.confirmModalConfirmBtn.addEventListener('click', onConfirm);
        elements.confirmModalCancelBtn.addEventListener('click', onCancel);
    });
}

// --- Sidebar Logic ---

export function renderSidebar(allUserArticles) {
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

    renderTagFilters(allUserArticles);

    elements.savedArticlesList.innerHTML = '';
    if (articlesToDisplay.length === 0) {
        let emptyMessage = isShowingArchived ? 'No archived articles.' : 'No active articles.';
        if (searchTerm) emptyMessage = `No results for "${searchTerm}".`;
        else if (activeTagFilter) emptyMessage = `No articles with tag "${activeTagFilter}".`;
        elements.savedArticlesList.innerHTML = `<p class="p-4 text-sm text-slate-400 dark:text-slate-500">${emptyMessage}</p>`;
        return;
    }

    articlesToDisplay.forEach(article => {
        const articleEl = createArticleCard(article);
        elements.savedArticlesList.appendChild(articleEl);
    });
}

function renderTagFilters(allUserArticles) {
    const viewableArticlesForTags = allUserArticles.filter(article => (article.isArchived || false) === isShowingArchived);
    const allTags = new Set(viewableArticlesForTags.flatMap(article => article.tags || []));
    elements.tagFiltersContainer.innerHTML = '';
    
    const allBtn = document.createElement('button');
    allBtn.textContent = 'All';
    allBtn.className = `px-2 py-1 text-xs rounded-md ${!activeTagFilter ? `${CSS_CLASSES.ACTIVE_TAG} ${CSS_CLASSES.INACTIVE_TAG_TEXT}` : 'bg-slate-200 dark:bg-slate-700'}`;
    allBtn.onclick = () => {
        activeTagFilter = null;
        renderSidebar(db.getArticles());
    };
    elements.tagFiltersContainer.appendChild(allBtn);

    allTags.forEach(tag => {
        const tagBtn = document.createElement('button');
        tagBtn.textContent = tag;
        tagBtn.className = `px-2 py-1 text-xs rounded-md ${activeTagFilter === tag ? `${CSS_CLASSES.ACTIVE_TAG} ${CSS_CLASSES.INACTIVE_TAG_TEXT}` : 'bg-slate-200 dark:bg-slate-700'}`;
        tagBtn.onclick = () => {
            activeTagFilter = tag;
            renderSidebar(db.getArticles());
        };
        elements.tagFiltersContainer.appendChild(tagBtn);
    });
}

function createActionButton({ baseClass, iconHTML, onClick }) {
    const button = document.createElement('button');
    button.className = baseClass;
    button.innerHTML = iconHTML;
    button.onclick = (e) => {
        e.stopPropagation();
        onClick();
    };
    return button;
}

function createArticleCard(article) {
    const articleEl = document.createElement('div');
    const isSelected = article.id === currentArticleId;
    const cardClasses = isSelected ? CSS_CLASSES.SELECTED_CARD : CSS_CLASSES.DEFAULT_CARD;
    articleEl.className = `group p-4 m-1 rounded-lg border flex justify-between items-start transition-all duration-200 ${cardClasses.join(' ')}`;
    articleEl.dataset.id = article.id;
    
    const leftColumn = document.createElement('div');
    leftColumn.className = 'flex-grow overflow-hidden mr-2';

    const textContainer = document.createElement('div');
    textContainer.className = 'cursor-pointer';
    const readingTimeInfo = article.readingTime ? ` &bull; ${article.readingTime} min read` : '';
    textContainer.innerHTML = `<h3 class="font-semibold text-slate-800 dark:text-slate-100 truncate">${article.title || 'Untitled Article'}</h3><p class="text-xs text-slate-500 dark:text-slate-400 truncate">${article.url}</p><p class="text-xs text-slate-400 dark:text-slate-500 mt-1">${readingTimeInfo}</p>`;
    textContainer.addEventListener('click', () => loadArticle(article.id));
    
    leftColumn.appendChild(textContainer);

    // ... (rest of the card creation logic is the same)

    const rightColumn = document.createElement('div');
    rightColumn.className = 'flex flex-col items-center flex-shrink-0 space-y-2 opacity-0 group-hover:opacity-100 transition-opacity';

    const favoriteBtn = createActionButton({
        baseClass: `favorite-btn p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 ${article.isFavorite ? 'favorited' : ''}`,
        iconHTML: `<svg class="w-5 h-5 empty-star text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg><svg class="w-5 h-5 filled-star text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>`,
        onClick: () => db.toggleFavorite(article.id, article.isFavorite || false)
    });

    const archiveBtn = createActionButton({
        baseClass: 'p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600',
        iconHTML: isShowingArchived
            ? `<svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>`
            : `<svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h4a2 2 0 002-2V7m-6 0V5a2 2 0 012-2h2a2 2 0 012 2v2m-6 0h6"></path></svg>`,
        onClick: async () => {
            await db.toggleArchive(article.id, article.isArchived || false);
            if (currentArticleId === article.id) {
                currentArticleId = null;
                elements.articleContent.innerHTML = '';
                elements.placeholder.style.display = 'block';
            }
        }
    });
    
    const deleteBtn = createActionButton({
        baseClass: 'text-red-400 hover:text-red-600 font-bold px-2',
        iconHTML: '&#x2715;',
        onClick: () => deleteArticle(article.id)
    });
    
    rightColumn.appendChild(favoriteBtn);
    rightColumn.appendChild(archiveBtn);
    rightColumn.appendChild(deleteBtn);
    
    articleEl.appendChild(leftColumn);
    articleEl.appendChild(rightColumn);
    
    return articleEl;
}

// --- Article View Logic ---

export async function loadArticle(docId) {
    try {
        currentArticleId = docId;
        updateSidebarSelection();
        const article = await db.getArticle(docId);
        if (article) {
            elements.placeholder.style.display = 'none';
            elements.loaderMain.style.display = 'none';
            elements.articleContent.innerHTML = article.content;
            elements.articleContentWrapper.style.display = 'block';
            applyReaderSettings();
            elements.articleView.scrollTop = 0;
        } else {
            currentArticleId = null;
            elements.articleContent.innerHTML = '';
            elements.placeholder.style.display = 'block';
        }
    } catch (error) {
        console.error("Error loading article:", error);
        showToast("Could not load the selected article.", "Load Error");
    }
}

async function deleteArticle(docId) {
    const confirmed = await showConfirmation('Delete Article?', 'This is permanent and cannot be undone.');
    if (!confirmed) return;

    try {
        await db.deleteArticleFromDb(docId);
        if (currentArticleId === docId) {
            currentArticleId = null;
            elements.articleContent.innerHTML = '';
            elements.placeholder.style.display = 'block';
        }
    } catch (error) {
        console.error("Error deleting article:", error);
        showToast("Could not delete the article.", "Delete Error");
    }
}

function updateSidebarSelection() {
    const items = elements.savedArticlesList.querySelectorAll('div[data-id]');
    items.forEach(item => {
        const isSelected = item.dataset.id === currentArticleId;
        item.classList.toggle(CSS_CLASSES.SELECTED_CARD[0], isSelected);
        item.classList.toggle(CSS_CLASSES.SELECTED_CARD[1], isSelected);
        item.classList.toggle(CSS_CLASSES.SELECTED_CARD[2], isSelected);
        item.classList.toggle(CSS_CLASSES.DEFAULT_CARD[0], !isSelected);
        item.classList.toggle(CSS_CLASSES.DEFAULT_CARD[1], !isSelected);
        item.classList.toggle(CSS_CLASSES.DEFAULT_CARD[2], !isSelected);
    });
}

// --- Highlighting Logic ---

async function applyHighlight(color, note = '') {
    if (!currentSelection || !currentArticleId) return;
    
    const mark = document.createElement('mark');
    mark.className = `highlight highlight-${color}`;
    mark.id = `highlight-${Date.now()}`;
    mark.dataset.note = note;
    mark.dataset.color = color;
    
    try {
        mark.appendChild(currentSelection.extractContents());
        currentSelection.insertNode(mark);
        await saveHighlights();
    } catch (error) {
        console.error("Could not create highlight:", error);
        window.getSelection().addRange(currentSelection);
        showToast("Failed to create highlight.", "Highlight Error");
    }
    
    elements.highlightTooltip.style.display = 'none';
    window.getSelection().removeAllRanges();
    currentSelection = null;
}

async function saveHighlights() {
    if (!currentArticleId) return;
    try {
        const highlights = Array.from(elements.articleContent.querySelectorAll('.highlight')).map(h => ({ 
            id: h.id, 
            text: h.textContent,
            note: h.dataset.note || '',
            color: h.dataset.color || HIGHLIGHT_COLORS.YELLOW
        }));
        await db.saveHighlightsToDb(currentArticleId, elements.articleContent.innerHTML, highlights);
    } catch (error) {
        console.error("Error saving highlights:", error);
        showToast("Could not save changes to highlights.", "Save Error");
    }
}

// --- Reader Settings ---
let readerSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.READER_SETTINGS)) || {
    fontSize: 'base',
    fontFamily: 'sans',
    lineHeight: 'relaxed',
    lineWidth: '3xl'
};

function applyReaderSettings() {
    const { fontSize, fontFamily, lineHeight, lineWidth } = readerSettings;
    elements.articleContentWrapper.classList.remove('text-sm', 'text-base', 'text-lg', 'font-sans', 'font-serif');
    elements.articleContentWrapper.classList.add(`text-${fontSize}`, `font-${fontFamily}`);
    elements.articleContent.classList.remove('leading-normal', 'leading-relaxed', 'leading-loose');
    elements.articleContent.classList.add(`leading-${lineHeight}`);
    elements.articleContentWrapper.classList.remove('max-w-2xl', 'max-w-3xl', 'max-w-5xl');
    elements.articleContentWrapper.classList.add(`max-w-${lineWidth}`);
}

// --- Initial Setup for UI components ---

export function initializeUI() {
    elements.urlForm.addEventListener('submit', handleUrlFormSubmit);
    elements.searchInput.addEventListener('input', () => renderSidebar(db.getArticles()));
    elements.surpriseMeBtn.addEventListener('click', handleSurpriseMe);
    
    setupDarkMode();
    setupViewToggle();
    setupReaderSettings();
    setupSidebarToggle();
    setupProgressBar();
    setupHighlighting();
    setupModals();
}

export const clearUIForSignOut = () => {
    elements.savedArticlesList.innerHTML = '<p class="p-4 text-sm text-slate-400 dark:text-slate-500">Please sign in to see your articles.</p>';
    elements.articleContent.innerHTML = '';
    elements.placeholder.style.display = 'block';
    elements.loaderMain.style.display = 'none';
    currentArticleId = null;
    activeTagFilter = null;
    isShowingArchived = false;
};

async function handleUrlFormSubmit(e) {
    e.preventDefault();
    const url = elements.articleUrlInput.value.trim();
    if (!url) return;

    elements.placeholder.style.display = 'none';
    elements.articleContent.innerHTML = '';
    elements.loaderMain.style.display = 'block';
    elements.articleContentWrapper.style.display = 'block';

    try {
        const response = await fetch(`https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        if (typeof Readability === 'undefined') {
            throw new Error("Readability.js library is not loaded.");
        }
        const reader = new Readability(doc.cloneNode(true));
        const article = reader.parse();

        if (!article) {
            throw new Error("Could not parse the article content with Readability.");
        }

        const { title, content, textContent } = article;
        const wordCount = (textContent || "").trim().split(/\s+/).length;
        const readingTime = Math.ceil(wordCount / 200);

        const newArticleRef = await db.saveArticle({ 
            url, 
            title: title || 'Untitled Article', 
            content: content || '<p>Content could not be extracted.</p>', 
            readingTime 
        });
        loadArticle(newArticleRef.id);

    } catch (error) {
        console.error("Failed to fetch or parse article:", error);
        showToast("Could not fetch the article. Please check the URL or try another one.", "Fetch Error");
        elements.articleContent.innerHTML = '';
        elements.placeholder.style.display = 'block';
    } finally {
        elements.loaderMain.style.display = 'none';
        elements.urlForm.reset();
    }
}


function handleSurpriseMe() {
    const activeArticles = db.getArticles().filter(article => !article.isArchived);
    if (activeArticles.length > 0) {
        const randomIndex = Math.floor(Math.random() * activeArticles.length);
        loadArticle(activeArticles[randomIndex].id);
    } else {
        showConfirmation('No Articles Found', 'There are no active articles to choose from.', 'bg-indigo-600');
    }
}

function setupDarkMode() {
    const applyTheme = () => {
        const theme = localStorage.getItem(STORAGE_KEYS.THEME);
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = theme === 'dark' || (theme === null && systemPrefersDark);

        document.documentElement.classList.toggle(CSS_CLASSES.DARK, isDark);
        elements.darkIcon.classList.toggle(CSS_CLASSES.HIDDEN, !isDark);
        elements.lightIcon.classList.toggle(CSS_CLASSES.HIDDEN, isDark);
    };

    elements.themeToggleBtn.addEventListener('click', () => {
        const isDark = document.documentElement.classList.contains(CSS_CLASSES.DARK);
        localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'light' : 'dark');
        applyTheme();
    });

    applyTheme();
}


function setupViewToggle() {
    const updateButtons = () => {
        elements.viewArchivedBtn.classList.toggle(CSS_CLASSES.ACTIVE_BUTTON[0], isShowingArchived);
        elements.viewArchivedBtn.classList.toggle(CSS_CLASSES.ACTIVE_BUTTON[1], isShowingArchived);
        elements.viewActiveBtn.classList.toggle(CSS_CLASSES.ACTIVE_BUTTON[0], !isShowingArchived);
        elements.viewActiveBtn.classList.toggle(CSS_CLASSES.ACTIVE_BUTTON[1], !isShowingArchived);
    };
    elements.viewActiveBtn.addEventListener('click', () => {
        if (isShowingArchived) {
            isShowingArchived = false;
            renderSidebar(db.getArticles());
            updateButtons();
        }
    });
    elements.viewArchivedBtn.addEventListener('click', () => {
        if (!isShowingArchived) {
            isShowingArchived = true;
            renderSidebar(db.getArticles());
            updateButtons();
        }
    });
    updateButtons();
}

function setupReaderSettings() {
    function updateReaderButtons() {
        document.querySelectorAll('.font-size-btn').forEach(btn => btn.classList.toggle(CSS_CLASSES.READER_SETTING_ACTIVE, btn.dataset.size === readerSettings.fontSize));
        document.querySelectorAll('.font-family-btn').forEach(btn => btn.classList.toggle(CSS_CLASSES.READER_SETTING_ACTIVE, btn.dataset.font === readerSettings.fontFamily));
        document.querySelectorAll('.line-height-btn').forEach(btn => btn.classList.toggle(CSS_CLASSES.READER_SETTING_ACTIVE, btn.dataset.leading === readerSettings.lineHeight));
        document.querySelectorAll('.line-width-btn').forEach(btn => btn.classList.toggle(CSS_CLASSES.READER_SETTING_ACTIVE, btn.dataset.width === readerSettings.lineWidth));
    }

    elements.readerSettingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.readerSettingsMenu.classList.toggle(CSS_CLASSES.HIDDEN);
    });

    document.addEventListener('click', (e) => {
        if (!elements.readerSettingsMenu.contains(e.target) && !elements.readerSettingsBtn.contains(e.target)) {
            elements.readerSettingsMenu.classList.add(CSS_CLASSES.HIDDEN);
        }
    });

    elements.readerSettingsMenu.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        if (target.dataset.size) readerSettings.fontSize = target.dataset.size;
        if (target.dataset.font) readerSettings.fontFamily = target.dataset.font;
        if (target.dataset.leading) readerSettings.lineHeight = target.dataset.leading;
        if (target.dataset.width) readerSettings.lineWidth = target.dataset.width;
        
        localStorage.setItem(STORAGE_KEYS.READER_SETTINGS, JSON.stringify(readerSettings));
        applyReaderSettings();
        updateReaderButtons();
    });

    applyReaderSettings();
    updateReaderButtons();
}

function setupSidebarToggle() {
    const toggleMobileSidebar = () => {
        elements.sidebar.classList.toggle(CSS_CLASSES.SIDEBAR_TRANSLATE_FULL);
        elements.sidebarBackdrop.classList.toggle(CSS_CLASSES.HIDDEN);
    };

    elements.mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
    elements.sidebarBackdrop.addEventListener('click', toggleMobileSidebar);

    elements.savedArticlesList.addEventListener('click', (e) => {
        const articleCard = e.target.closest('div[data-id]');
        const isMobile = window.getComputedStyle(elements.sidebarBackdrop).display !== 'none';
        if (articleCard && isMobile) {
            toggleMobileSidebar();
        }
    });

    let isDesktopCollapsed = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true';

    const applyDesktopState = () => {
        elements.appView.classList.toggle(CSS_CLASSES.SIDEBAR_COLLAPSED, isDesktopCollapsed);
    };

    elements.sidebarToggle.addEventListener('click', () => {
        isDesktopCollapsed = !isDesktopCollapsed;
        localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, isDesktopCollapsed);
        applyDesktopState();
    });

    if (window.innerWidth >= 768) {
        applyDesktopState();
    }
}


function setupProgressBar() {
    elements.articleView.addEventListener('scroll', () => {
        const scrollableHeight = elements.articleView.scrollHeight - elements.articleView.clientHeight;
        const progress = scrollableHeight > 0 ? (elements.articleView.scrollTop / scrollableHeight) * 100 : 0;
        elements.progressBar.style.width = `${progress}%`;
    });
}

function setupHighlighting() {
    elements.articleContent.addEventListener('mouseup', (e) => {
        if (e.target.closest('.highlight')) {
            elements.highlightTooltip.style.display = 'none';
            return;
        }
        const selection = window.getSelection();
        if (selection.toString().trim().length > 0) {
            currentSelection = selection.getRangeAt(0);
            const rect = currentSelection.getBoundingClientRect();
            elements.highlightTooltip.style.display = 'block';
            const tooltipWidth = elements.highlightTooltip.offsetWidth;
            const tooltipHeight = elements.highlightTooltip.offsetHeight;
            elements.highlightTooltip.style.left = `${rect.left + rect.width / 2 - tooltipWidth / 2}px`;
            elements.highlightTooltip.style.top = `${rect.top - tooltipHeight - 10}px`;
        } else {
            elements.highlightTooltip.style.display = 'none';
        }
    });

    elements.articleContent.addEventListener('click', (e) => {
        const clickedHighlight = e.target.closest('.highlight');
        if (clickedHighlight) {
            window.getSelection().removeAllRanges();
            elements.highlightTooltip.style.display = 'none';
            showEditHighlightTooltip(clickedHighlight);
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (!elements.highlightTooltip.contains(e.target) && elements.highlightTooltip.style.display === 'block') {
            elements.highlightTooltip.style.display = 'none';
        }
        if (!elements.editHighlightTooltip.contains(e.target) && elements.editHighlightTooltip.style.display === 'block') {
            elements.editHighlightTooltip.style.display = 'none';
            currentEditingHighlight = null;
        }
    });
    
    elements.highlightTooltip.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        if (target.classList.contains('highlight-color-btn')) {
            applyHighlight(target.dataset.color);
        } else if (target.id === 'add-note-btn') {
            showNoteModal();
        }
    });

    elements.editHighlightTooltip.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target || !currentEditingHighlight) return;

        if (target.classList.contains('edit-highlight-color-btn')) {
            const newColor = target.dataset.color;
            currentEditingHighlight.className = `highlight highlight-${newColor}`;
            currentEditingHighlight.dataset.color = newColor;
            await saveHighlights();
        } else if (target.id === 'edit-note-btn') {
            showNoteModal(currentEditingHighlight);
        } else if (target.id === 'delete-highlight-btn') {
            const parent = currentEditingHighlight.parentNode;
            while (currentEditingHighlight.firstChild) {
                parent.insertBefore(currentEditingHighlight.firstChild, currentEditingHighlight);
            }
            parent.removeChild(currentEditingHighlight);
            await saveHighlights();
        }
        elements.editHighlightTooltip.style.display = 'none';
        currentEditingHighlight = null;
    });
}

function showEditHighlightTooltip(highlightEl) {
    currentEditingHighlight = highlightEl;
    const rect = highlightEl.getBoundingClientRect();
    elements.editHighlightTooltip.style.display = 'block';
    const tooltipWidth = elements.editHighlightTooltip.offsetWidth;
    const tooltipHeight = elements.editHighlightTooltip.offsetHeight;
    elements.editHighlightTooltip.style.left = `${rect.left + rect.width / 2 - tooltipWidth / 2}px`;
    elements.editHighlightTooltip.style.top = `${rect.top - tooltipHeight - 10}px`;
}

function showNoteModal(existingHighlight = null) {
    if (existingHighlight) {
        elements.noteHighlightContext.textContent = existingHighlight.textContent;
        elements.noteTextarea.value = existingHighlight.dataset.note || '';
    } else if (currentSelection) {
        elements.noteHighlightContext.textContent = currentSelection.toString();
        elements.noteTextarea.value = '';
    } else {
        return;
    }

    elements.addNoteModal.classList.remove(CSS_CLASSES.HIDDEN);
    elements.addNoteModal.classList.add(CSS_CLASSES.FLEX);
    elements.noteTextarea.focus();
    elements.highlightTooltip.style.display = 'none';
    elements.editHighlightTooltip.style.display = 'none';
}

function setupModals() {
    elements.closeModalBtn.addEventListener('click', () => elements.highlightsModal.classList.add(CSS_CLASSES.HIDDEN));
    elements.highlightsModal.addEventListener('click', (e) => {
        if (e.target === elements.highlightsModal) elements.highlightsModal.classList.add(CSS_CLASSES.HIDDEN);
    });

    elements.cancelNoteBtn.addEventListener('click', () => {
        elements.addNoteModal.classList.add(CSS_CLASSES.HIDDEN);
        elements.noteTextarea.value = '';
        currentEditingHighlight = null;
    });

    elements.saveNoteBtn.addEventListener('click', async () => {
        const noteText = elements.noteTextarea.value.trim();
        if (currentEditingHighlight) {
            currentEditingHighlight.dataset.note = noteText;
            await saveHighlights();
        } else if (currentSelection) {
            await applyHighlight(HIGHLIGHT_COLORS.YELLOW, noteText);
        }
        
        elements.addNoteModal.classList.add(CSS_CLASSES.HIDDEN);
        elements.noteTextarea.value = '';
        currentEditingHighlight = null;
    });
}
