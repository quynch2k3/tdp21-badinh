const firebaseConfig = {
    apiKey: "AIzaSyCa6BGDX8B8BWAoqixANsNjtUF6IMwxAsE",
    authDomain: "tdp21-cms.firebaseapp.com",
    projectId: "tdp21-cms",
    storageBucket: "tdp21-cms.firebasestorage.app",
    messagingSenderId: "165023456018",
    appId: "1:165023456018:web:fe4b5ac1bd6d51f534f1cb"
};

// Initialize Firebase (Compat)
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);

    // Enable Long Polling to bypass Firewall/Proxy/WebSocket issues
    var db = firebase.firestore();
    window.db = db; // Expose globally

    // Default settings (Long Polling removed due to conflict)
    db.settings({ merge: true });

    console.log("Firebase Firestore initialized.");

    // ENABLE OFFLINE PERSISTENCE (Fast Loading)
    // ENABLE OFFLINE PERSISTENCE
    // Note: enableMultiTabIndexedDbPersistence is deprecated in newer SDKs.
    // We use standard enablePersistence here.
    // ENABLE OFFLINE PERSISTENCE (Fast Loading)
    // Note: Disabling persistence to prevent 'hanging' issues reported by user.
    // db.enablePersistence()
    //     .catch((err) => {
    //         if (err.code == 'failed-precondition') {
    //             console.warn("Persistence failed: Multiple tabs open.");
    //         } else if (err.code == 'unimplemented') {
    //             console.warn("Persistence not yet available.");
    //         }
    //     });

    // Persistence disabled to prevent hanging issues
} else {
    console.error("Firebase SDK not loaded!");
}

