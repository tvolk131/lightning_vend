import {Paper} from '@mui/material';
import {ThemeProvider, createTheme} from '@mui/material/styles';
import {CheckCircleOutline} from '@mui/icons-material';
import * as React from 'react';
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
  const height = props.size - (padding * 2);

  const transitionTimeSecs = 0.5;

  const greenCheckSizePx = 200;

  return (
    <ThemeProvider theme={lightTheme}>
      <Paper
        style={{
          padding: `${padding}px`,
          height: `${height}px`
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
            <QRCode size={height} value={props.invoice}/>
          </div>
          <div
            style={{
              position: 'absolute',
              opacity: props.invoiceIsPaid ? 100 : 0,
              transition: `opacity ${transitionTimeSecs}s`
            }}
          >
            <div style={{padding: `${(height - greenCheckSizePx) / 2}px`}}>
              <CheckCircleOutline
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