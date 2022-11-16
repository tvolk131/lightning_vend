import {Paper} from '@mui/material';
import {ThemeProvider, createTheme} from '@mui/material/styles';
import * as React from 'react';
import QRCode from 'react-qr-code';

interface StyledQRCodeProps {
  size?: number,
  value: string
}

export const StyledQRCode = (props: StyledQRCodeProps) => {
  const lightTheme = createTheme({
    palette: {
      mode: 'light'
    }
  });

  const size = props.size || 256;

  return (
    <ThemeProvider theme={lightTheme}>
      <Paper
        style={{
          padding: '15px',
          height: `${size}px`
        }}
      >
        <QRCode size={size} value={props.value}/>
      </Paper>
    </ThemeProvider>
  );
};