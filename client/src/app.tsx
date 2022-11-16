import * as React from 'react';
import {Theme, ThemeProvider, createTheme} from '@mui/material/styles';
import {greet} from './api';
import {blue} from '@mui/material/colors';
import {makeStyles} from '@mui/styles';
import {Typography} from '@mui/material';
import {LightningNetworkLogo} from './lightningNetworkLogo';
import {StyledQRCode} from './styledQRCode';

const useStyles = makeStyles((theme: Theme) =>
  ({
    root: {
      backgroundColor: theme.palette.background.default,
      minHeight: '100vh'
    }
  })
);

const SubApp = () => {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      {/* This meta tag makes the mobile experience
      much better by preventing text from being tiny. */}
      <meta name='viewport' content='width=device-width, initial-scale=1.0'/>
      <div>
        <div style={{width: 'fit-content', margin: 'auto', padding: '20px'}}>
          <LightningNetworkLogo size={200}/>
        </div>
        <StyledQRCode value={'lightning:lnbc10u1p3hgmlfpp554ufwa2uaa69uz27t9u6hr8yrskju7mxeqksjdmldpa20rh60lnqdqqcqzpgxqr23ssp55u85dejctg2dln8ff94rrtfjxy7xxk4nehzv7v2uetj4kpp2k5vs9qyyssq3zudhexj3x68n4jydplwpyezjxu8au5ydv9zr50l4gccrp7dzw650nve3jgnayc5e0zfu4vzyt2ktvz7tkpmenm9tzk4vtfnvyrzqcqpj53v9k'}/>
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