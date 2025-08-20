import { getFirestore, doc, getDoc, onSnapshot, collection, query, addDoc, serverTimestamp, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { renderSidebar } from './ui.js';

let db; // Will be initialized later
let articlesCollectionRef;
let unsubscribe;
let allUserArticles = [];

export const setupFirestoreListeners = (app, userId) => {
    db = getFirestore(app); // Initialize Firestore here
    articlesCollectionRef = collection(db, `artifacts/read-highlight-app/users/${userId}/articles`);
    const q = query(articlesCollectionRef);
    
    if (unsubscribe) unsubscribe();

    unsubscribe = onSnapshot(q, (snapshot) => {
        allUserArticles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSidebar(allUserArticles);
    }, (error) => {
        console.error("Error fetching articles:", error);
        // You could pass this error to a UI function to display it
    });
};

export const getArticles = () => allUserArticles;

export const addTag = async (docId, tag) => {
    const docRef = doc(articlesCollectionRef, docId);
    await updateDoc(docRef, { tags: arrayUnion(tag) });
};

export const removeTag = async (docId, tag) => {
    const docRef = doc(articlesCollectionRef, docId);
    await updateDoc(docRef, { tags: arrayRemove(tag) });
};

export const toggleFavorite = async (docId, currentStatus) => {
    const docRef = doc(articlesCollectionRef, docId);
    await updateDoc(docRef, { isFavorite: !currentStatus });
};

export const toggleArchive = async (docId, currentStatus) => {
    const docRef = doc(articlesCollectionRef, docId);
    await updateDoc(docRef, { isArchived: !currentStatus });
};

export const getArticle = async (docId) => {
    const docRef = doc(articlesCollectionRef, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
};

export const deleteArticleFromDb = async (docId) => {
    await deleteDoc(doc(articlesCollectionRef, docId));
};

export const saveArticle = async (articleData) => {
    return await addDoc(articlesCollectionRef, {
        ...articleData,
        highlights: [],
        isFavorite: false,
        isArchived: false,
        tags: [],
        createdAt: serverTimestamp()
    });
};

export const saveHighlightsToDb = async (docId, content, highlights) => {
    const docRef = doc(articlesCollectionRef, docId);
    await updateDoc(docRef, { content, highlights });
};
