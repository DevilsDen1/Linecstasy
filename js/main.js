// Mobile-specific functions
function initializeMobileFunctions() {
    // Add any mobile-specific initialization here
    console.log('Mobile functions initialized');
    
    // Handle back button on mobile
    if (window.history && window.history.pushState) {
        window.addEventListener('popstate', function() {
            // Handle back button press
            if (window.location.pathname.endsWith('chat.html')) {
                // Add any specific behavior for chat page
            }
        });
    }
}

// Export functions to global scope
window.initializeMobileFunctions = initializeMobileFunctions;
