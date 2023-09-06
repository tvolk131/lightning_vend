import * as React from 'react';
import {ThemeProvider, createTheme} from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import Paper from '@mui/material/Paper';
import QRCode from 'react-qr-code';
import {deviceApi} from './api/deviceApi';

interface InvoiceProps {
  size: number,
  invoice: string,
  invoiceIsPaid: boolean
}

export const Invoice = (props: InvoiceProps) => {
  const connectionStatus = deviceApi.useConnectionStatus();

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
              opacity: (connectionStatus === 'connected' &&
                        !props.invoiceIsPaid) ? 100 : 0,
              transition: `opacity ${transitionTimeSecs}s`
            }}
          >
            <QRCode size={size} value={props.invoice}/>
          </div>
          <div
            style={{
              position: 'absolute',
              opacity: (connectionStatus === 'connected' &&
                        props.invoiceIsPaid) ? 100 : 0,
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
          <div
            style={{
              position: 'absolute',
              opacity: connectionStatus === 'disconnected' ? 100 : 0,
              transition: `opacity ${transitionTimeSecs}s`,
              height: `${size + (padding * 2)}px`,
              width: `${size + (padding * 2)}px`,
              transform: 'translate(-15px, -15px)'
            }}
          >
            <Alert
              severity={'warning'}
              style={{
                height: '100%',
                boxSizing: 'border-box'
              }}
            >
              <AlertTitle>Device is Offline</AlertTitle>
              This device requires an internet connection to know if a payment
              has been received. Please wait until a connection has been
              reestablished before paying the invoice. If you have already paid
              the invoice, you will need to wait until the device is online
              again to receive your product - our apologies for the
              inconvenience!
            </Alert>
          </div>
        </div>
      </Paper>
    </ThemeProvider>
  );
};