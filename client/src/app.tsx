import * as React from 'react';
import {useState} from 'react';
import {Theme, ThemeProvider, createTheme} from '@mui/material/styles';
import {getInvoice} from './api';
import {blue} from '@mui/material/colors';
import {makeStyles} from '@mui/styles';
import {LightningNetworkLogo} from './lightningNetworkLogo';
import {StyledQRCode} from './styledQRCode';
import {CircularProgress, Button} from '@mui/material';

const useStyles = makeStyles((theme: Theme) =>
  ({
    root: {
      backgroundColor: theme.palette.background.default,
      minHeight: '100vh'
    }
  })
);

const SubApp = () => {
  const [invoice, setInvoice] = useState<string>();
  const [loadingInvoice, setLoadingInvoice] = useState(false);

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
        <div style={{width: 'fit-content', margin: 'auto'}}>
          {
            invoice ?
              <StyledQRCode value={invoice}/>
              :
              (
                loadingInvoice ?
                  <CircularProgress/>
                  :
                  <Button
                    variant={'contained'}
                    onClick={() => {
                      setLoadingInvoice(true);
                      getInvoice().then((invoice) => {
                        setInvoice(invoice);
                        setLoadingInvoice(false);
                      });
                    }}
                  >
                    Purchase
                  </Button>
              )
          }
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