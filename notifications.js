// Get references to the toast elements
const toast = document.getElementById('toast-notification');
const toastTitle = document.getElementById('toast-title');
const toastMessage = document.getElementById('toast-message');

let toastTimeout;

/**
 * Shows a toast notification.
 * @param {string} message - The main message to display.
 * @param {string} [title='Error'] - The title of the notification.
 * @param {string} [type='error'] - The type of notification ('error', 'success', etc.).
 * @param {number} [duration=5000] - How long the toast stays visible in ms.
 */
export function showToast(message, title = 'Error', type = 'error', duration = 5000) {
    // Clear any existing timeout to prevent the toast from hiding prematurely
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    // Set the title and message
    toastTitle.textContent = title;
    toastMessage.textContent = message;

    // Customize colors based on type (optional, but good for UX)
    // For now, we'll stick with the red error style.
    // You could expand this with a switch statement for different colors.
    toast.className = toast.className.replace(/bg-\w+-\d+/, 'bg-red-500');

    // Show the toast
    toast.classList.remove('opacity-0', '-translate-y-20');
    toast.classList.add('opacity-100', 'translate-y-0');

    // Set a timeout to hide the toast after the specified duration
    toastTimeout = setTimeout(() => {
        hideToast();
    }, duration);
}

/**
 * Hides the currently visible toast notification.
 */
function hideToast() {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', '-translate-y-20');
}

// Optional: Allow the user to dismiss the toast by clicking on it
toast.addEventListener('click', hideToast);
