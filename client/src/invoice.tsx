import * as React from 'react';
import {ThemeProvider, createTheme} from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import {Paper} from '@mui/material';
import QRCode from 'react-qr-code';

interface InvoiceProps {
  size: number,
  invoice: string,
  invoiceIsPaid: boolean
}

export const Invoice = (props: InvoiceProps) => {
  const lightTheme = createTheme({
    palette: {
      mode: 'light'
    }
  });

  const padding = 15;
  const size = props.size - (padding * 2);

  const transitionTimeSecs = 0.5;

  const greenCheckSizePx = 200;

  return (
    <ThemeProvider theme={lightTheme}>
      <Paper
        style={{
          padding: `${padding}px`,
          height: `${size}px`,
          width: `${size}px`
        }}
      >
        <div style={{position: 'relative'}}>
          <div
            style={{
              position: 'absolute',
              opacity: props.invoiceIsPaid ? 0 : 100,
              transition: `opacity ${transitionTimeSecs}s`
            }}
          >
            <QRCode size={size} value={props.invoice}/>
          </div>
          <div
            style={{
              position: 'absolute',
              opacity: props.invoiceIsPaid ? 100 : 0,
              transition: `opacity ${transitionTimeSecs}s`
            }}
          >
            <div style={{padding: `${(size - greenCheckSizePx) / 2}px`}}>
              <CheckCircleIcon
                color={'success'}
                style={{
                  height: `${greenCheckSizePx}px`,
                  width: `${greenCheckSizePx}px`
                }}
              />
            </div>
          </div>
        </div>
      </Paper>
    </ThemeProvider>
  );
};