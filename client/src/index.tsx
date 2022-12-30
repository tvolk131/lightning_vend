import * as React from 'react';
import {render} from 'react-dom';
import {ThemeProvider, createTheme} from '@mui/material/styles';
import {blue} from '@mui/material/colors';
import {DevicePage} from './devicePage';
import {createBrowserRouter, RouterProvider} from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/device',
    element: <DevicePage/>
  },
  {
    // TODO - Make an actual 404 page.
    errorElement: <div>Error!</div>
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
      <RouterProvider router={router}/>
    </ThemeProvider>
  );
};

render((
  <React.StrictMode>
    <App/>
  </React.StrictMode>
), document.getElementById('app'));
