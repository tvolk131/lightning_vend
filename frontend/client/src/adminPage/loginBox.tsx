import * as React from 'react';
import {useEffect, useState} from 'react';
import {AsyncLoadableData} from '../api/sharedApi';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';
import OutlinedInput from '@mui/material/OutlinedInput';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {adminApi} from '../api/adminApi';
import {getMessageExpiration} from '../../../shared/lnAuthBrowserSafe';
import {styled} from '@mui/material/styles';
import {useCountdown} from './countdownReactHook';

const CssTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0
    }
  }
});

export const LoginBox = () => {
  const [lnAuthMessageSignature, setLnAuthMessageSignature] = useState('');

  const [unsignedLnAuthMessage, setUnsignedLnAuthMessage] =
    useState<AsyncLoadableData<string>>({state: 'loading'});

  const [authenticatingSignature, setAuthenticatingSignature] = useState(false);

  const getUnsignedLnAuthMessage = () => {
    adminApi.getLnAuthMessage()
      .then((message) => {
        setUnsignedLnAuthMessage({state: 'loaded', data: message});
      })
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

  const countdown = useCountdown(messageExpiration);

  let timerString;
  if (countdown) {
    timerString =
      `${countdown.minutes.toString().padStart(2, '0')}:` +
      `${countdown.seconds.toString().padStart(2, '0')}`;
  } else {
    timerString = 'Expiration unknown';
  }

  return (
    <div
      style={{
        textAlign: 'center',
        maxWidth: 'max-content',
        width: '100%',
        margin: 0,
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }}
    >
      <Paper
        style={{
          padding: '15px',
          margin: '10px'
        }}
      >
        <Typography variant={'h4'} style={{padding: '10px'}}>
          LightningVend Login
        </Typography>
        <Typography style={{padding: '10px', maxWidth: '300px'}}>
          To login, sign the following message using your Lightning Node:
        </Typography>
        <div style={{width: 'fit-content', margin: 'auto'}}>
          <div>
            <OutlinedInput
              disabled
              label={'Unsigned Message'}
              style={{
                width: '100%',
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0
              }}
              value={
                unsignedLnAuthMessage.state === 'loaded' ?
                  unsignedLnAuthMessage.data
                  :
                  undefined
              }
              endAdornment={
                <InputAdornment position={'end'}>
                  {
                    unsignedLnAuthMessage.state === 'loaded' ?
                      (
                        <IconButton
                          onClick={() => {
                            navigator
                              .clipboard
                              .writeText(unsignedLnAuthMessage.data);
                          }}
                        >
                          <ContentCopyIcon/>
                        </IconButton>
                      )
                      :
                      (
                        <InputAdornment position={'end'}>
                          <CircularProgress/>
                        </InputAdornment>
                      )
                  }
                </InputAdornment>
              }
            />
            {(unsignedLnAuthMessage.state !== 'error' && messageExpiration &&
              countdown && !countdown.hasExpired) ?
              (
                <Paper
                  elevation={6}
                  style={{
                    // Set to the exact value so that the height matches the
                    // height of the <Button/> below it.
                    padding: '6.25px',
                    borderTopLeftRadius: '0px',
                    borderTopRightRadius: '0px'
                  }}
                >
                  <Typography>
                    {timerString}
                  </Typography>
                </Paper>
              )
              :
              (
                <Button
                  variant={'contained'}
                  onClick={getUnsignedLnAuthMessage}
                  style={{
                    width: '100%',
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0
                  }}
                >
                  Retry
                </Button>
              )
            }
          </div>
          <div style={{paddingTop: '20px'}}>
            <CssTextField
              value={lnAuthMessageSignature}
              style={{width: '100%'}}
              onChange={(e) => setLnAuthMessageSignature(e.target.value)}
              label={'Signature'}
            />
            <LoadingButton
              variant={'contained'}
              style={{
                width: '100%',
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0
              }}
              loading={authenticatingSignature}
              disabled={
                !lnAuthMessageSignature.length ||
                unsignedLnAuthMessage.state !== 'loaded' ||
                !messageExpiration ||
                messageExpiration < new Date()
              }
              onClick={() => {
                if (unsignedLnAuthMessage.state === 'loaded') {
                  setAuthenticatingSignature(true);
                  adminApi.registerAdmin(
                    unsignedLnAuthMessage.data,
                    lnAuthMessageSignature
                  ).finally(() => setAuthenticatingSignature(false));
                }
              }}
            >
              Login / Register
            </LoadingButton>
          </div>
        </div>
      </Paper>
    </div>
  );
};