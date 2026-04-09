
try {
    console.log('typeof localStorage:', typeof localStorage);
    if (typeof localStorage !== 'undefined') {
        console.log('localStorage keys:', Object.keys(localStorage));
        console.log('localStorage.getItem type:', typeof localStorage.getItem);
        console.log('localStorage content:', localStorage);
    } else {
        console.log('localStorage is undefined');
    }
} catch (e) {
    console.error('Error accessing localStorage:', e);
}
