import * as React from 'react';
import {useEffect, useState} from 'react';
import {AsyncLoadableData} from '../api/sharedApi';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {CountdownTimer} from './countdownTimer';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import {LoadingButton} from '@mui/lab';
import OutlinedInput from '@mui/material/OutlinedInput';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {adminApi} from '../api/adminApi';
import {getMessageExpiration} from '../../../shared/lnAuthBrowserSafe';

export const LoginBox = () => {
  const [lnAuthMessageSignature, setLnAuthMessageSignature] = useState('');

  const [unsignedLnAuthMessage, setUnsignedLnAuthMessage] =
    useState<AsyncLoadableData<string>>({state: 'loading'});

  const [authenticatingSignature, setAuthenticatingSignature] = useState(false);

  const getUnsignedLnAuthMessage = () => {
    adminApi.getLnAuthMessage()
      .then((message) => setUnsignedLnAuthMessage({state: 'loaded', data: message}))
      .catch(() => setUnsignedLnAuthMessage({state: 'error'}));
  };

  useEffect(getUnsignedLnAuthMessage, []);

  const tryGetExpirationForMessage = (): Date | undefined => {
    if (unsignedLnAuthMessage.state !== 'loaded') {
      return undefined;
    }

    return getMessageExpiration(unsignedLnAuthMessage.data);
  };

  const messageExpiration = tryGetExpirationForMessage();

  return (
    <Paper style={{padding: '10px', textAlign: 'center', width: 'fit-content', margin: 'auto'}}>
      <Typography variant={'h4'} style={{padding: '10px'}}>
        LightningVend Login
      </Typography>
      <Typography style={{padding: '10px'}}>
        To login, sign the following message using your Lightning Node:
      </Typography>
      {unsignedLnAuthMessage.state === 'error' &&
        <div>
          <Typography>Failed to get unsigned message.</Typography>
          <Button
            onClick={getUnsignedLnAuthMessage}
          >
            Retry
          </Button>
        </div>
      }
      {unsignedLnAuthMessage.state === 'loading' &&
        <OutlinedInput
          disabled
          style={{margin: '10px'}}
          label={'Unsigned Message'}
          endAdornment={
            <InputAdornment position={'end'}>
              <CircularProgress/>
            </InputAdornment>
          }
        />
      }
      {unsignedLnAuthMessage.state === 'loaded' &&
        <OutlinedInput
          disabled
          style={{margin: '10px'}}
          label={'Unsigned Message'}
          value={unsignedLnAuthMessage.data}
          endAdornment={
            <InputAdornment position={'end'}>
              <IconButton
                onClick={() => {
                  navigator.clipboard.writeText(unsignedLnAuthMessage.data);
                }}
              >
                <ContentCopyIcon/>
              </IconButton>
            </InputAdornment>
          }
        />
      }
      <TextField
        value={lnAuthMessageSignature}
        onChange={(e) => setLnAuthMessageSignature(e.target.value)}
        label={'Signature'}
        style={{margin: '10px'}}
      />
      {messageExpiration && <div><CountdownTimer targetDate={messageExpiration}/></div>}
      <div>
        <LoadingButton
          variant={'contained'}
          style={{margin: '10px'}}
          loading={authenticatingSignature}
          disabled={!lnAuthMessageSignature.length || unsignedLnAuthMessage.state !== 'loaded'}
          onClick={() => {
            if (unsignedLnAuthMessage.state === 'loaded') {
              setAuthenticatingSignature(true);
              adminApi.registerAdmin(unsignedLnAuthMessage.data, lnAuthMessageSignature)
                .finally(() => setAuthenticatingSignature(false));
            }
          }}
        >
          Login / Register
        </LoadingButton>
      </div>
    </Paper>
  );
};