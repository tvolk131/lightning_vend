import {createTheme, useMediaQuery} from '@mui/material';
import {blue} from '@mui/material/colors';
import {Device_ColorScheme} from '../../proto_out/lightning_vend/model';

export const useLightningVendTheme = (colorScheme?: Device_ColorScheme) => {
  const systemDefaultIsDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  let isDarkMode = systemDefaultIsDarkMode;

  if (colorScheme === Device_ColorScheme.DEFAULT_DARK) {
    isDarkMode = true;
  } else if (colorScheme === Device_ColorScheme.DEFAULT_LIGHT) {
    isDarkMode = false;
  }

  return createTheme({
    palette: {
      primary: {main: '#F7931A'},
      secondary: blue,
      mode: isDarkMode ? 'dark' : 'light',
      background: isDarkMode ? undefined : {default: '#E7EBF0'}
    }
  });
};
