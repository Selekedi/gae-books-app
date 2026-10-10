import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// Automatically clean up any old caches left over from previous builds
cleanupOutdatedCaches();

// This is the injection point where Vite-plugin-PWA will automatically 
// inject the array list of all your static HTML, JS, and CSS files to be cached.
precacheAndRoute(self.__WB_MANIFEST || []);

// Allows the newly updated service worker to take control of the webpage 
// immediately without making the user wait or restart the tab.
self.skipWaiting();
clientsClaim();
