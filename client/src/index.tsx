import * as React from 'react';
import {RouterProvider, createBrowserRouter} from 'react-router-dom';
import {ThemeProvider, createTheme} from '@mui/material/styles';
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
import {blue} from '@mui/material/colors';
import {createRoot} from 'react-dom/client';

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
  const isDarkMode = true; // TODO - Add a way for users to be able to set this.

  const theme = createTheme({
    palette: {
      primary: {main: '#F7931A'},
      secondary: blue,
      mode: isDarkMode ? 'dark' : 'light'
    }
  });

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
