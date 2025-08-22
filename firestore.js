import { doc, getDoc, onSnapshot, collection, query, addDoc, serverTimestamp, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase.js'; // Import the initialized db service
import { renderSidebar } from './ui.js';

let articlesCollectionRef;
let unsubscribe; // This will hold the listener function
let allUserArticles = [];

export const setupFirestoreListeners = (userId) => {
    // If a listener is already active, unsubscribe from it first to prevent memory leaks.
    if (unsubscribe) {
        unsubscribe();
    }
    articlesCollectionRef = collection(db, `artifacts/read-highlight-app/users/${userId}/articles`);
    const q = query(articlesCollectionRef);

    unsubscribe = onSnapshot(q, (snapshot) => {
        allUserArticles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSidebar(allUserArticles);
    }, (error) => {
        console.error("Error fetching articles:", error);
    });
};

// Function to call when user signs out to stop listening to database changes.
export const clearFirestoreListeners = () => {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
    allUserArticles = [];
    articlesCollectionRef = null;
};

export const getArticles = () => allUserArticles;

// Helper function to prevent errors if a DB operation is attempted while logged out.
const checkCollectionRef = () => {
    if (!articlesCollectionRef) {
        console.error("Firestore operation attempted before user was authenticated.");
        return false;
    }
    return true;
}

export const addTag = async (docId, tag) => {
    if (!checkCollectionRef()) return;
    const docRef = doc(articlesCollectionRef, docId);
    await updateDoc(docRef, { tags: arrayUnion(tag) });
};

export const removeTag = async (docId, tag) => {
    if (!checkCollectionRef()) return;
    const docRef = doc(articlesCollectionRef, docId);
    await updateDoc(docRef, { tags: arrayRemove(tag) });
};

export const toggleFavorite = async (docId, currentStatus) => {
    if (!checkCollectionRef()) return;
    const docRef = doc(articlesCollectionRef, docId);
    await updateDoc(docRef, { isFavorite: !currentStatus });
};

export const toggleArchive = async (docId, currentStatus) => {
    if (!checkCollectionRef()) return;
    const docRef = doc(articlesCollectionRef, docId);
    await updateDoc(docRef, { isArchived: !currentStatus });
};

export const getArticle = async (docId) => {
    if (!checkCollectionRef()) return null;
    const docRef = doc(articlesCollectionRef, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
};

export const deleteArticleFromDb = async (docId) => {
    if (!checkCollectionRef()) return;
    await deleteDoc(doc(articlesCollectionRef, docId));
};

export const saveArticle = async (articleData) => {
    if (!checkCollectionRef()) return;
    return await addDoc(articlesCollectionRef, {
        ...articleData,
        highlights: [],
        isFavorite: false,
        isArchived: false,
        tags: [],
        createdAt: serverTimestamp()
    });
};

/**
 * Saves the highlights and the updated content to Firestore.
 * @param {string} docId - The ID of the article document.
 * @param {string} content - The full HTML content of the article with <mark> tags.
 * @param {Array} highlights - An array of highlight objects.
 */
export const saveHighlightsToDb = async (docId, content, highlights) => {
    if (!checkCollectionRef()) return;
    const docRef = doc(articlesCollectionRef, docId);
    await updateDoc(docRef, { content, highlights });
};
