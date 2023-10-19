import * as React from 'react';
import {RouterProvider, createBrowserRouter} from 'react-router-dom';
import {
  adminPagePath,
  devicePagePath,
  learnMorePagePath
} from '../../shared/constants';
import {AdminPage} from './adminPage';
import Box from '@mui/material/Box';
import {DevicePage} from './devicePage';
import {LandingPage} from './landingPage';
import {LearnMorePage} from './learnMorePage';
import {NotFoundPage} from './notFoundPage';
import {ThemeProvider} from '@mui/material/styles';
import {createRoot} from 'react-dom/client';
import {useLightningVendTheme} from './themes';

// Install the service worker. This allows the app to work offline by caching
// the app's files and serving them from the cache when the user is offline.
if ('serviceWorker' in navigator) {
  // Load the service worker after the page has finished loading. This ensures
  // that the service worker doesn't slow down the page's initial loading.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js');
  });
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage/>,
    errorElement: <NotFoundPage/>
  },
  {
    path: adminPagePath,
    element: <AdminPage/>,
    errorElement: <NotFoundPage/>
  },
  {
    path: devicePagePath,
    element: <DevicePage/>,
    errorElement: <NotFoundPage/>
  },
  {
    path: learnMorePagePath,
    element: <LearnMorePage/>,
    errorElement: <NotFoundPage/>
  }
]);

const App = () => {
  const theme = useLightningVendTheme();

  return (
    <ThemeProvider theme={theme}>
      {/* This meta tag makes the mobile experience
      much better by preventing text from being tiny. */}
      <meta name='viewport' content='width=device-width, initial-scale=1.0'/>
      <Box sx={{
        color: theme.palette.text.primary,
        background: theme.palette.background.default,
        minHeight: '100vh'
      }}>
        <RouterProvider router={router}/>
      </Box>
    </ThemeProvider>
  );
};

const root = createRoot(document.getElementById('app')!);
root.render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
);
