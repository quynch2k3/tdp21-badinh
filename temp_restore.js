function restoreStateForAdmin() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const id = params.get('id');

    if (view) {
        if (view === 'view-editor') {
            if (id) {
                // Remove potential hash or trailing garbage
                const cleanId = id.replace('#', '');
                openEditor(cleanId, false); // false = don't push state again
            } else {
                openEditor(null, false);
            }
        } else {
            switchView(view);
        }
    } else {
        // Default
        switchView('view-dashboard');
    }
}

