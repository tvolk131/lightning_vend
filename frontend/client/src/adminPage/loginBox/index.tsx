import * as React from 'react';
import {useEffect, useState} from 'react';
import {AsyncLoadableData} from '../../api/sharedApi';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import {TextFieldWithButton} from './textFieldWithButton';
import Typography from '@mui/material/Typography';
import {adminApi} from '../../api/adminApi';
import {getMessageExpiration} from '../../../../shared/lnAuthBrowserSafe';
import {useCountdown} from '../countdownReactHook';

export const LoginBox = () => {
  const [lnAuthMessageSignature, setLnAuthMessageSignature] = useState('');

  const [unsignedLnAuthMessage, setUnsignedLnAuthMessage] =
    useState<AsyncLoadableData<string>>({state: 'loading'});

  const [authenticatingSignature, setAuthenticatingSignature] = useState(false);

  const getUnsignedLnAuthMessage = () => {
    setUnsignedLnAuthMessage({state: 'loading'});

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

  useEffect(() => {
    if (countdown?.hasExpired) {
      setLnAuthMessageSignature('');
    }
  }, [countdown?.hasExpired]);

  const showTimer: boolean = unsignedLnAuthMessage.state === 'loaded' &&
                             !!messageExpiration && !!countdown &&
                             !countdown.hasExpired;

  const canTypeSignature = unsignedLnAuthMessage.state === 'loaded' &&
                           messageExpiration && messageExpiration >= new Date();

  const canSubmitSignature = lnAuthMessageSignature.length && canTypeSignature;

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
        <Typography
          style={{
            padding: '10px',
            maxWidth: '300px',
            margin: 'auto'
          }}
        >
          To login, sign the following message using your Lightning Node:
        </Typography>
        <div>
          <TextFieldWithButton
            textFieldValue={
              unsignedLnAuthMessage.state === 'loaded' ?
                unsignedLnAuthMessage.data
                :
                'Loading...'
            }
            textFieldDisabled={true}
            textFieldEndAdornment={
              <InputAdornment position={'end'}>
                {
                  unsignedLnAuthMessage.state === 'loaded' && (
                      <IconButton
                        disabled={!canTypeSignature}
                        onClick={() => {
                          navigator
                            .clipboard
                            .writeText(unsignedLnAuthMessage.data);
                        }}
                      >
                        <ContentCopyIcon/>
                      </IconButton>
                    )
                }
              </InputAdornment>
            }
            textFieldLabel={'Unsigned Message'}
            buttonValue={showTimer ? timerString : 'Get New Message'}
            buttonIsLoading={unsignedLnAuthMessage.state === 'loading'}
            onButtonClick={getUnsignedLnAuthMessage}
            showPaperInsteadOfButton={showTimer}
          />
          <TextFieldWithButton
            rootStyle={{paddingTop: '20px'}}
            textFieldValue={lnAuthMessageSignature}
            textFieldDisabled={!canTypeSignature}
            textFieldLabel={'Signed Message'}
            onTextFieldChange={
              (e) => setLnAuthMessageSignature(e.target.value)
            }
            buttonValue={'Login / Register'}
            buttonIsLoading={authenticatingSignature}
            buttonIsDisabled={!canSubmitSignature}
            onButtonClick={
              () => {
                if (unsignedLnAuthMessage.state === 'loaded') {
                  setAuthenticatingSignature(true);
                  adminApi.registerAdmin(
                    unsignedLnAuthMessage.data,
                    lnAuthMessageSignature
                  ).finally(() => setAuthenticatingSignature(false));
                }
              }
            }
          />
        </div>
      </Paper>
    </div>
  );
};