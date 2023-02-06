import * as React from 'react';
import {Alert, Button, Chip, Paper, TextField, Typography} from '@mui/material';
import {useCallback, useEffect, useRef, useState} from 'react';
import {AsyncLoadableData} from './api/sharedApi';
import {Circle as CircleIcon} from '@mui/icons-material';
import {LightningNetworkLogo} from './lightningNetworkLogo';
import {LoadingButton} from '@mui/lab';
import {SelectionMenu} from './selectionMenu';
import axios from 'axios';
import {deviceApi} from './api/deviceApi';
import {useTheme} from '@mui/material/styles';

// Screensaver appears after one minute of inactivity.
const SCREENSAVER_DELAY_MS = 60000;

const centerSquareSize = 330;

export const DevicePage = () => {
  const theme = useTheme();

  deviceApi.useSocket();
  const connectionStatus = deviceApi.useConnectionStatus();
  const loadableDeviceData = deviceApi.useLoadableDeviceData();

  const [nodeRegistrationPubkey, setNodeRegistrationPubkey] = useState('');
  const [nodeRegistrationDisplayName, setNodeRegistrationDisplayName] = useState('');

  // Whether the screensaver should be displaying.
  const [screensaverActive, setScreensaverActive] = useState(true);
  // This state is used specifically for fading in and out smoothly.
  // Follows the state above, but lags behind during fade-out so that
  // the screensaver actually fades out rather than instantly disappearing.
  const [screensaverRendered, setScreensaverRendered] = useState(true);
  const screensaverTimeout = useRef<NodeJS.Timeout>();

  const [supportedExecutionCommands, setSupportedExecutionCommands] =
    useState<AsyncLoadableData<string[]>>({state: 'loading'});

  // TODO - Any time the page is refreshed, update the discovered execution commands to the backend.
  const loadSupportedExecutionCommands = () => {
    setSupportedExecutionCommands({state: 'loading'});
    axios.get('http://localhost:21000/listCommands')
      .then((res) => {
        let commands = res.data as string[];
        setSupportedExecutionCommands({state: 'loaded', data: commands});
      }).catch(() => {
        setSupportedExecutionCommands({state: 'error'});
      });
  };

  useEffect(loadSupportedExecutionCommands, []);

  const showLightningLogo = false;

  const screensaverClicked = useCallback(() => {
    setScreensaverActive(false);
    startTimeout();
  }, []);

  useEffect(() => {
    if (screensaverActive) {
      setScreensaverRendered(true);
    }
  }, [screensaverActive]);

  const startTimeout = useCallback(() => {
    clearTimeout(screensaverTimeout.current);
    const timeout = setTimeout(() => setScreensaverActive(true), SCREENSAVER_DELAY_MS);
    screensaverTimeout.current = timeout;
  }, []);

  const appTouched = useCallback((ev: any) => {
    if (ev.target.id !== 'screensaver') {
      startTimeout();
    }
  }, []);

  return (
    <div
      style={{display: 'flex', flexWrap: 'wrap', height: '100vh'}}
      onClick={appTouched}
    >
      {
        showLightningLogo && (
          <div style={{width: 'fit-content', margin: 'auto', padding: '20px'}}>
            <LightningNetworkLogo size={200}/>
          </div>
        )
      }
      <div style={{width: 'fit-content', margin: 'auto'}}>
        {loadableDeviceData.state === 'loaded' && (
            <SelectionMenu
              size={centerSquareSize}
              canShowInvoice={connectionStatus === 'connected' && !screensaverActive}
              inventory={loadableDeviceData.data.inventory}
            />
        )}
        {/* TODO - If loadableDeviceData.state === 'loading' then display a loading spinner. */}
        {/* TODO - Make the registration process easier by doing a few things:
            1. Replace the TextField with an Autocomplete component that dynamically fetches node
               pubkeys that match what is typed.
            2. Check for the right text length and possibly even ping LND to make sure the proposed
               node is real and has active channels.
        */}
        {loadableDeviceData.state === 'error' && (
            <Paper style={{height: `${centerSquareSize}px`, width: `${centerSquareSize}px`}}>
              <div style={{padding: '20px', textAlign: 'center'}}>
                <Typography>
                  Device is not setup! Please enter the Lightning Network
                  node pubkey that you would like to pair this device to.
                </Typography>
                <TextField
                  value={nodeRegistrationPubkey}
                  onChange={(e) => setNodeRegistrationPubkey(e.target.value)}
                  label={'LN Node Pubkey'}
                  style={{margin: '20px'}}
                />
                <TextField
                  value={nodeRegistrationDisplayName}
                  onChange={(e) => setNodeRegistrationDisplayName(e.target.value)}
                  label={'Device Name'}
                  style={{marginBottom: '20px'}}
                />
                <LoadingButton
                  variant={'contained'}
                  disabled={!nodeRegistrationPubkey.length || !nodeRegistrationDisplayName.length}
                  loading={supportedExecutionCommands.state === 'loading'}
                  onClick={() => {
                    deviceApi.registerDevice(
                      nodeRegistrationPubkey,
                      nodeRegistrationDisplayName,
                      supportedExecutionCommands.state === 'loaded' ?
                        supportedExecutionCommands.data
                        :
                        []
                    );
                  }}
                >
                  Register
                </LoadingButton>
              </div>
              {supportedExecutionCommands.state === 'error' && (
                  <div style={{marginTop: '20px'}}>
                    <Alert
                      severity={'error'}
                      action={<Button onClick={loadSupportedExecutionCommands}>Retry</Button>}
                    >
                      Failed to load device execution commands!
                    </Alert>
                  </div>
              )}
            </Paper>
        )}
      </div>
      <div style={{position: 'absolute', top: 0, right: 0, padding: '10px'}}>
        <Chip
          icon={<CircleIcon color={connectionStatus === 'connected' ? 'success' : 'error'}/>}
          label={connectionStatus === 'connected' ? 'Online' : 'Offline'}
        />
      </div>
      <div
        id='screensaver'
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.palette.background.default + 'E0',
          fontSize: 32,
          color: 'white',
          cursor: 'pointer',
          transition: 'opacity 0.25s',
          opacity: `${screensaverActive ? 100 : 0}%`,
          transform: screensaverRendered ? undefined : 'translate(0, 100%)',
          zIndex: 100
        }}
        onClick={screensaverClicked}
        onTransitionEnd={() => {
          if (!screensaverActive) {
            setScreensaverRendered(false);
          }
        }}
      >
        <Typography variant={'h3'}>Tap to Continue</Typography>
      </div>
    </div>
  );
};