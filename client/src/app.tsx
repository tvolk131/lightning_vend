import * as React from 'react';
import {ThemeProvider, createTheme, useTheme} from '@mui/material/styles';
import {blue} from '@mui/material/colors';
import {LightningNetworkLogo} from './lightningNetworkLogo';
import {SelectionMenu} from './selectionMenu';
import {Helmet} from 'react-helmet';

const SubApp = () => {
  const theme = useTheme();

  return (
    <div>
      {/* This meta tag makes the mobile experience
      much better by preventing text from being tiny. */}
      <meta name='viewport' content='width=device-width, initial-scale=1.0'/>
      <Helmet>
          <style>{`body { background-color: ${theme.palette.background.default}; }`}</style>
      </Helmet>
      <div style={{display: 'flex', flexWrap: 'wrap', height: '100vh'}}>
        <div style={{width: 'fit-content', margin: 'auto', padding: '20px'}}>
          <LightningNetworkLogo size={200}/>
        </div>
        <div style={{width: 'fit-content', margin: 'auto'}}>
          <SelectionMenu size={330}/>
        </div>
      </div>
    </div>
  );
};

const ThemedSubApp = () => {
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
      <SubApp/>
    </ThemeProvider>
  );
};

export const App = () => (
  <ThemedSubApp/>
);