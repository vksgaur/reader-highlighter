import * as db from './firestore.js';
import { showToast } from './notifications.js';
import { STORAGE_KEYS, CSS_CLASSES, HIGHLIGHT_COLORS } from './constants.js';

// --- DOM Element References ---
let elements = {};

// --- State Variables ---
let currentArticleId = null;
let activeTagFilter = null;
let isShowingArchived = false;
let currentSelection = null; // To store the current text selection Range object
let currentEditingHighlight = null; // To store the <mark> element being edited

/**
 * Caches all the DOM elements needed for the UI.
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
        
        // Highlighting elements
        highlightTooltip: document.getElementById('highlight-tooltip'),
        editHighlightTooltip: document.getElementById('edit-highlight-tooltip'),
        addNoteBtn: document.getElementById('add-note-btn'),
        deleteHighlightBtn: document.getElementById('delete-highlight-btn'),
        
        // Note Modal elements
        addNoteModal: document.getElementById('add-note-modal'),
        noteHighlightContext: document.getElementById('note-highlight-context'),
        noteTextarea: document.getElementById('note-textarea'),
        saveNoteBtn: document.getElementById('save-note-btn'),
        cancelNoteBtn: document.getElementById('cancel-note-btn'),

        themeToggleBtn: document.getElementById('theme-toggle'),
        lightIcon: document.getElementById('theme-toggle-light-icon'),
        darkIcon: document.getElementById('theme-toggle-dark-icon'),
        tagFiltersContainer: document.getElementById('tag-filters'),
        viewActiveBtn: document.getElementById('view-active-btn'),
        viewArchivedBtn: document.getElementById('view-archived-btn'),
        readerSettingsBtn: document.getElementById('reader-settings-btn'),
        readerSettingsMenu: document.getElementById('reader-settings-menu'),
        sidebar: document.getElementById('sidebar'),
        sidebarToggle: document.getElementById('sidebar-toggle'),
        mobileMenuBtn: document.getElementById('mobile-menu-btn'),
        sidebarBackdrop: document.getElementById('sidebar-backdrop'),
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
    if (!elements.loaderSidebar) return;
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
        const tagColor = tagMetadata[tag]?.color || '#e2e8f0';
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
    textContainer.innerHTML = `<h3 class="font-semibold text-slate-800 dark:text-slate-100 truncate">${article.title || 'Untitled Article'}</h3><p class="text-xs text-slate-500 dark:text-slate-400 truncate">${article.url}</p><p class="text-xs text-slate-400 dark:text-slate-500 mt-1">${(article.highlights?.length || 0)} highlights${readingTimeInfo}</p>`;
    textContainer.addEventListener('click', () => loadArticle(article.id));
    
    leftColumn.appendChild(textContainer);

    const rightColumn = document.createElement('div');
    rightColumn.className = 'flex flex-col items-center flex-shrink-0 space-y-2 opacity-0 group-hover:opacity-100 transition-opacity';

    const favoriteBtn = document.createElement('button');
    favoriteBtn.className = `favorite-btn p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${article.isFavorite ? 'favorited' : ''}`;
    favoriteBtn.innerHTML = `<svg class="w-4 h-4 text-yellow-500 empty-star" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg><svg class="w-4 h-4 text-yellow-500 filled-star" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>`;
    favoriteBtn.onclick = (e) => { e.stopPropagation(); db.toggleFavorite(article.id, article.isFavorite); };
    const archiveBtn = document.createElement('button');
    archiveBtn.className = 'p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700';
    archiveBtn.innerHTML = article.isArchived ? `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l3-3m0 0l3 3m-3-3v6m0-6V5a2 2 0 012-2h4a2 2 0 012 2v6.5"></path></svg>` : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8l6 6 6-6"></path></svg>`;
    archiveBtn.title = article.isArchived ? 'Unarchive' : 'Archive';
    archiveBtn.onclick = (e) => { e.stopPropagation(); db.toggleArchive(article.id, article.isArchived); };
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'p-1 rounded hover:bg-red-200 dark:hover:bg-red-800 text-red-600';
    deleteBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
    deleteBtn.title = 'Delete';
    deleteBtn.onclick = (e) => { e.stopPropagation(); showConfirmModal('Delete Article', 'Are you sure you want to delete this article? This action cannot be undone.', () => db.deleteArticleFromDb(article.id)); };
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
    addTagBtn.onclick = (e) => { e.stopPropagation(); const input = e.currentTarget.nextElementSibling; input.classList.toggle('hidden'); if (!input.classList.contains('hidden')) input.focus(); };
    const addTagInput = document.createElement('input');
    addTagInput.type = 'text';
    addTagInput.placeholder = 'New tag...';
    addTagInput.className = 'hidden ml-2 text-xs p-1 rounded bg-slate-200 dark:bg-slate-700';
    addTagInput.onclick = e => e.stopPropagation();
    addTagInput.onkeydown = async (e) => { if (e.key === 'Enter') { e.preventDefault(); if (e.target.value.trim()) { await db.addTag(article.id, e.target.value); } e.target.value = ''; e.target.classList.add('hidden'); } else if (e.key === 'Escape') { e.target.classList.add('hidden'); } };
    tagsContainer.appendChild(addTagBtn);
    tagsContainer.appendChild(addTagInput);
    articleEl.appendChild(tagsContainer);
    
    return articleEl;
}

export const clearUIForSignOut = () => {
    if (!elements.savedArticlesList) return;
    elements.savedArticlesList.innerHTML = '<p class="p-4 text-sm text-slate-400 dark:text-slate-500">Please sign in to see your articles.</p>';
    if (elements.articleContent) elements.articleContent.innerHTML = '';
    if (elements.placeholder) elements.placeholder.style.display = 'block';
    if (elements.loaderMain) elements.loaderMain.style.display = 'none';
    currentArticleId = null;
    activeTagFilter = null;
    isShowingArchived = false;
};

async function loadArticle(articleId) {
    if (currentArticleId === articleId) return;
    
    hideTooltips();
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
        
        const url = new URL(window.location);
        url.searchParams.set('article', articleId);
        window.history.replaceState({}, '', url);
        
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

/**
 * Shows the highlight creation tooltip positioned relative to the selected text.
 * @param {Range} range - The user's text selection range.
 */
function showHighlightTooltip(range) {
    const rect = range.getBoundingClientRect();
    elements.highlightTooltip.style.display = 'flex';
    elements.highlightTooltip.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (elements.highlightTooltip.offsetWidth / 2)}px`;
    elements.highlightTooltip.style.top = `${rect.top + window.scrollY - elements.highlightTooltip.offsetHeight - 8}px`;
}

/**
 * Shows the highlight editing tooltip positioned relative to the clicked highlight.
 * @param {HTMLElement} highlightEl - The <mark> element that was clicked.
 */
function showEditHighlightTooltip(highlightEl) {
    const rect = highlightEl.getBoundingClientRect();
    elements.editHighlightTooltip.style.display = 'flex';
    elements.editHighlightTooltip.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (elements.editHighlightTooltip.offsetWidth / 2)}px`;
    elements.editHighlightTooltip.style.top = `${rect.bottom + window.scrollY + 4}px`;
}

/**
 * Hides both highlight tooltips.
 */
function hideTooltips() {
    if (elements.highlightTooltip) elements.highlightTooltip.style.display = 'none';
    if (elements.editHighlightTooltip) elements.editHighlightTooltip.style.display = 'none';
    currentSelection = null;
    currentEditingHighlight = null;
}

/**
 * Wraps the current text selection in a <mark> tag with the specified color.
 * This is a more robust version that can handle selections spanning multiple elements.
 * @param {string} colorName - The name of the color (e.g., 'yellow').
 */
function createHighlight(colorName) {
    if (!currentSelection || currentSelection.isCollapsed) return;

    const color = HIGHLIGHT_COLORS[colorName.toUpperCase()];
    if (!color) return;

    const uniqueId = `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // The selection might span multiple nodes. We need to wrap each text node part.
    const fragment = currentSelection.extractContents();
    const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
        if (node.nodeValue.trim() !== '') {
            const mark = document.createElement('mark');
            mark.className = `highlight ${color.class}`;
            mark.dataset.highlightId = uniqueId;
            mark.dataset.color = color.name;
            mark.textContent = node.nodeValue;
            node.parentNode.replaceChild(mark, node);
        }
    }

    currentSelection.insertNode(fragment);
    
    // After creating, we might have adjacent <mark> tags with the same ID. Let's merge them.
    normalizeHighlights(uniqueId);

    saveHighlights();
    hideTooltips();
}

/**
 * Merges adjacent <mark> elements with the same highlight ID.
 * This cleans up the DOM after creating a highlight that spans multiple nodes.
 * @param {string} highlightId - The ID of the highlight to normalize.
 */
function normalizeHighlights(highlightId) {
    const highlights = elements.articleContent.querySelectorAll(`mark[data-highlight-id="${highlightId}"]`);
    if (highlights.length <= 1) return;

    for (let i = highlights.length - 1; i > 0; i--) {
        const current = highlights[i];
        const prev = highlights[i - 1];

        // Check if they are siblings and adjacent
        if (prev.nextSibling === current) {
            prev.textContent += current.textContent;
            current.parentNode.removeChild(current);
        }
    }
}


/**
 * Gathers all highlight data from the DOM and saves it to Firestore.
 * This version correctly groups fragmented highlights into single objects.
 */
async function saveHighlights() {
    if (!currentArticleId) return;

    const highlightElements = elements.articleContent.querySelectorAll('mark.highlight');
    const highlightsMap = new Map();

    // Group highlight fragments by their shared ID
    highlightElements.forEach(el => {
        const id = el.dataset.highlightId;
        if (!highlightsMap.has(id)) {
            highlightsMap.set(id, {
                id: id,
                color: el.dataset.color,
                note: el.dataset.note || '',
                text: el.textContent,
            });
        } else {
            // This handles cases where a logical highlight consists of multiple <mark> tags.
            // We append the text to maintain the full context of the highlight.
            const existing = highlightsMap.get(id);
            existing.text += el.textContent;
        }
    });

    const highlightsData = Array.from(highlightsMap.values());
    const updatedContent = elements.articleContent.innerHTML;
    await db.saveHighlightsToDb(currentArticleId, updatedContent, highlightsData);
}


/**
 * Deletes a highlight element from the DOM and saves the changes.
 */
function deleteHighlight() {
    if (!currentEditingHighlight) return;
    
    const highlightId = currentEditingHighlight.dataset.highlightId;
    const allParts = elements.articleContent.querySelectorAll(`mark[data-highlight-id="${highlightId}"]`);

    allParts.forEach(part => {
        const parent = part.parentNode;
        while (part.firstChild) {
            parent.insertBefore(part.firstChild, part);
        }
        parent.removeChild(part);
    });
    
    saveHighlights();
    hideTooltips();
}

/**
 * Shows the modal for adding or editing a note for a highlight.
 */
function showNoteModal() {
    if (!currentEditingHighlight) return;

    elements.noteHighlightContext.textContent = currentEditingHighlight.textContent;
    elements.noteTextarea.value = currentEditingHighlight.dataset.note || '';
    elements.addNoteModal.classList.remove('hidden');
    elements.addNoteModal.classList.add('flex');
    elements.noteTextarea.focus();
}

function hideNoteModal() {
    elements.addNoteModal.classList.add('hidden');
    elements.addNoteModal.classList.remove('flex');
    currentEditingHighlight = null;
}

function saveNote() {
    if (!currentEditingHighlight) return;
    const noteText = elements.noteTextarea.value.trim();
    const highlightId = currentEditingHighlight.dataset.highlightId;
    const allParts = elements.articleContent.querySelectorAll(`mark[data-highlight-id="${highlightId}"]`);

    allParts.forEach(part => {
        if (noteText) {
            part.dataset.note = noteText;
        } else {
            delete part.dataset.note;
        }
    });

    saveHighlights();
    hideNoteModal();
}

async function handleUrlFormSubmit(e) {
    e.preventDefault();
    const url = elements.articleUrlInput.value.trim();
    if (!url) return;
    elements.placeholder.style.display = 'none';
    elements.loaderMain.style.display = 'block';
    elements.articleContent.innerHTML = '';
    try {
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        if (!response.ok || !data.contents) throw new Error('Failed to fetch the article');
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');
        const reader = new Readability(doc);
        const article = reader.parse();
        if (!article) throw new Error('Could not extract article content from this URL');
        const articleData = { title: article.title, content: article.content, url: url, readingTime: Math.ceil(article.length / 1000) };
        const docRef = await db.saveArticle(articleData);
        currentArticleId = docRef.id;
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
    elements.readerSettingsMenu.innerHTML = `
        <div class="space-y-4">
            <div><label class="block text-sm font-medium mb-2">Theme</label><div class="flex gap-2"><button class="theme-btn px-3 py-2 text-sm rounded border-2" data-theme="light">Light</button><button class="theme-btn px-3 py-2 text-sm rounded border-2" data-theme="sepia">Sepia</button><button class="theme-btn px-3 py-2 text-sm rounded border-2" data-theme="dark">Dark</button></div></div>
            <div><label class="block text-sm font-medium mb-2">Font Size</label><div class="flex gap-2"><button class="font-size-btn px-3 py-2 text-sm rounded bg-slate-200 dark:bg-slate-600" data-size="small">Small</button><button class="font-size-btn px-3 py-2 text-sm rounded bg-slate-200 dark:bg-slate-600" data-size="medium">Medium</button><button class="font-size-btn px-3 py-2 text-sm rounded bg-slate-200 dark:bg-slate-600" data-size="large">Large</button></div></div>
        </div>
    `;
    const savedSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.READER_SETTINGS) || '{"theme": "light", "fontSize": "medium"}');
    applyReaderSettings(savedSettings);
    elements.readerSettingsBtn.addEventListener('click', (e) => { e.stopPropagation(); elements.readerSettingsMenu.classList.toggle('hidden'); });
    document.addEventListener('click', (e) => { if (!elements.readerSettingsMenu.contains(e.target) && !elements.readerSettingsBtn.contains(e.target)) { elements.readerSettingsMenu.classList.add('hidden'); } });
    elements.readerSettingsMenu.addEventListener('click', (e) => {
        if (e.target.matches('.theme-btn')) {
            savedSettings.theme = e.target.dataset.theme;
            applyReaderSettings(savedSettings);
            localStorage.setItem(STORAGE_KEYS.READER_SETTINGS, JSON.stringify(savedSettings));
        }
        if (e.target.matches('.font-size-btn')) {
            savedSettings.fontSize = e.target.dataset.size;
            applyReaderSettings(savedSettings);
            localStorage.setItem(STORAGE_KEYS.READER_SETTINGS, JSON.stringify(savedSettings));
        }
    });
}

function applyReaderSettings(settings) {
    elements.articleContentWrapper.className = elements.articleContentWrapper.className.replace(/theme-\w+/g, '');
    elements.articleContentWrapper.classList.add(`theme-${settings.theme}`);
    elements.articleContentWrapper.className = elements.articleContentWrapper.className.replace(/text-(sm|base|lg|xl)/g, '');
    const fontSizeClass = { small: 'text-sm', medium: 'text-base', large: 'text-lg' }[settings.fontSize] || 'text-base';
    elements.articleContentWrapper.classList.add(fontSizeClass);
    document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.theme === settings.theme));
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
    // Show creation tooltip on text selection
    elements.articleContent.addEventListener('mouseup', (e) => {
        // Don't show tooltip if we are clicking on an existing highlight or a button
        if (e.target.closest('mark.highlight') || e.target.closest('button')) {
            return;
        }
        
        const selection = window.getSelection();
        if (selection.toString().trim().length > 0) {
            currentSelection = selection.getRangeAt(0).cloneRange();
            showHighlightTooltip(currentSelection);
        } else {
            hideTooltips();
        }
    });

    // Hide tooltips when clicking away
    document.addEventListener('mousedown', (e) => {
        if (!elements.highlightTooltip.contains(e.target) && !elements.editHighlightTooltip.contains(e.target) && !e.target.closest('mark.highlight')) {
            hideTooltips();
        }
    });

    // Prevent the tooltip buttons from stealing focus and collapsing the selection
    elements.highlightTooltip.addEventListener('mousedown', (e) => {
        e.preventDefault();
    });

    // Handle clicks on the color buttons in the creation tooltip
    elements.highlightTooltip.addEventListener('click', (e) => {
        if (e.target.matches('.highlight-color-btn')) {
            const color = e.target.dataset.color;
            createHighlight(color);
        }
    });

    // Show edit tooltip when clicking an existing highlight
    elements.articleContent.addEventListener('click', (e) => {
        const highlightEl = e.target.closest('mark.highlight');
        if (highlightEl) {
            hideTooltips();
            currentEditingHighlight = highlightEl;
            showEditHighlightTooltip(highlightEl);
        }
    });

    elements.deleteHighlightBtn.addEventListener('click', deleteHighlight);
    elements.addNoteBtn.addEventListener('click', showNoteModal);
}

function setupModals() {
    elements.saveNoteBtn.addEventListener('click', saveNote);
    elements.cancelNoteBtn.addEventListener('click', hideNoteModal);
    elements.addNoteModal.addEventListener('click', (e) => {
        if (e.target === elements.addNoteModal) {
            hideNoteModal();
        }
    });
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
