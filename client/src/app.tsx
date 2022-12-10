import * as React from 'react';
import {useState, useRef, useCallback} from 'react';
import {ThemeProvider, createTheme, useTheme} from '@mui/material/styles';
import {blue} from '@mui/material/colors';
import {LightningNetworkLogo} from './lightningNetworkLogo';
import {SelectionMenu} from './selectionMenu';
import {Helmet} from 'react-helmet';
import {Typography} from '@mui/material';

// Screensaver appears after one minute of inactivity.
const SCREENSAVER_DELAY_MS = 60000;

const SubApp = () => {
  const theme = useTheme();
  
  const [screensaverActive, setScreensaverActive] = useState(true);
  const screensaverTimeout = useRef<NodeJS.Timeout>();

  const screensaverClicked = useCallback(() => {
    setScreensaverActive(false);
    startTimeout();
  }, []);

  const startTimeout = useCallback(() => {
    clearTimeout(screensaverTimeout.current);
    const timeout = setTimeout(() => setScreensaverActive(true), SCREENSAVER_DELAY_MS);
    screensaverTimeout.current = timeout;
  }, []);

  const appTouched = useCallback(ev => {
    if (ev.target.id !== 'screensaver') {
      startTimeout();
    }
  }, []);

  return (
    <div>
      {/* This meta tag makes the mobile experience
      much better by preventing text from being tiny. */}
      <meta name='viewport' content='width=device-width, initial-scale=1.0'/>
      <Helmet>
          <style>{`body { background-color: ${theme.palette.background.default}; }`}</style>
      </Helmet>
      <div
        style={{display: 'flex', flexWrap: 'wrap', height: '100vh'}}
        onClick={appTouched}
      >
        <div style={{width: 'fit-content', margin: 'auto', padding: '20px'}}>
          <LightningNetworkLogo size={200}/>
        </div>
        <div style={{width: 'fit-content', margin: 'auto'}}>
          <SelectionMenu size={330}/>
        </div>
        {screensaverActive && (
          <div
            id='screensaver'
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: theme.palette.background.default + 'E0',
              fontSize: 32,
              color: 'white',
              cursor: 'pointer'
            }}
            onClick={screensaverClicked}
          >
            <Typography variant={'h3'}>Tap to Continue</Typography>
          </div>
        )}
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