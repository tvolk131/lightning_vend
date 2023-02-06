import * as React from 'react';
import {RouterProvider, createBrowserRouter} from 'react-router-dom';
import {ThemeProvider, createTheme} from '@mui/material/styles';
import {adminPagePath, devicePagePath} from '../../shared/constants';
import {AdminPage} from './adminPage';
import {DevicePage} from './devicePage';
import {Helmet} from 'react-helmet';
import {LandingPage} from './landingPage';
import {NotFoundPage} from './notFoundPage';
import {blue} from '@mui/material/colors';
import {render} from 'react-dom';

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
      <Helmet>
        <style>{`body { background-color: ${theme.palette.background.default}; }`}</style>
      </Helmet>
      <RouterProvider router={router}/>
    </ThemeProvider>
  );
};

render((
  <React.StrictMode>
    <App/>
  </React.StrictMode>
), document.getElementById('app'));
