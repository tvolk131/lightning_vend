import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import Alert from '@mui/material/Alert';
import {AsyncLoadableData} from './api/sharedApi';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircleIcon from '@mui/icons-material/Circle';
import CircularProgress from '@mui/material/CircularProgress';
import {LightningNetworkLogo} from './lightningNetworkLogo';
import Paper from '@mui/material/Paper';
import {SelectionMenu} from './selectionMenu';
import Typography from '@mui/material/Typography';
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
  const loadableDevice = deviceApi.useLoadableDevice();

  const [deviceSetupCode, setDeviceSetupCode] =
    useState<AsyncLoadableData<string>>({state: 'loading'});

  useEffect(() => {
    deviceApi.getDeviceSetupCode().then((code) => {
      setDeviceSetupCode({state: 'loaded', data: code});
    });
  }, []);

  const renderDeviceSetupCode = () => {
    if (deviceSetupCode.state === 'loaded') {
      return (
        <Typography variant={'h3'}>
          {deviceSetupCode.data}
        </Typography>
      );
    } else if (deviceSetupCode.state === 'error') {
      return (
        <Typography variant={'h3'}>
          Error loading setup code!
        </Typography>
      );
    } else {
      return <CircularProgress/>;
    }
  };

  const [supportedExecutionCommands, setSupportedExecutionCommands] =
    useState<AsyncLoadableData<string[]>>({state: 'loading'});

  // TODO - Any time the page is refreshed, update the discovered execution
  // commands to the backend.
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

  // Whether the screensaver should be displaying.
  const [screensaverActive, setScreensaverActive] = useState(false);
  // This state is used specifically for fading in and out smoothly.
  // Follows the state above, but lags behind during fade-out so that
  // the screensaver actually fades out rather than instantly disappearing.
  const [screensaverRendered, setScreensaverRendered] = useState(false);
  const screensaverTimeout = useRef<NodeJS.Timeout>();
  const startTimeout = useCallback(() => {
    clearTimeout(screensaverTimeout.current);
    const timeout = setTimeout(
      () => setScreensaverActive(true), SCREENSAVER_DELAY_MS
    );
    screensaverTimeout.current = timeout;
  }, []);

  // Start the screensaver timeout when the page loads.
  useEffect(() => {
    startTimeout();
  }, []);

  const screensaverClicked = useCallback(() => {
    setScreensaverActive(false);
    startTimeout();
  }, []);

  useEffect(() => {
    if (screensaverActive) {
      setScreensaverRendered(true);
    }
  }, [screensaverActive]);

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
        {/* TODO - Indicate that we're still loading the device. */}
        {loadableDevice.state === 'loading' && loadableDevice.cachedData && (
            <SelectionMenu
              size={centerSquareSize}
              canShowInvoice={
                connectionStatus === 'connected' && !screensaverActive
              }
              inventory={loadableDevice.cachedData.inventory}
            />
        )}
        {loadableDevice.state === 'loading' && !loadableDevice.cachedData && (
            <Paper
              style={{
                height: `${centerSquareSize}px`,
                width: `${centerSquareSize}px`
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <CircularProgress size={100}/>
              </div>
            </Paper>
        )}
        {/* TODO - Indicate that the device failed to load, and allow retry. */}
        {loadableDevice.state === 'error' && loadableDevice.cachedData && (
            <SelectionMenu
              size={centerSquareSize}
              canShowInvoice={
                connectionStatus === 'connected' && !screensaverActive
              }
              inventory={loadableDevice.cachedData.inventory}
            />
        )}
        {loadableDevice.state === 'error' && !loadableDevice.cachedData && (
            <div style={{position: 'relative'}}>
              <Paper
                style={{
                  height: `${centerSquareSize}px`,
                  width: `${centerSquareSize}px`
                }}
              >
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    position: 'absolute',
                    top: '50%',
                    transform: 'translate(0, -50%)'
                  }}
                >
                  <Typography variant={'h4'}>
                    Error loading device data!
                  </Typography>
                  <Button
                    style={{marginTop: '10px'}}
                    variant={'contained'}
                    onClick={() => {
                      deviceApi.getDevice();
                    }}
                  >
                    Retry
                  </Button>
                </div>
              </Paper>
            </div>
        )}
        {loadableDevice.state === 'loaded' && loadableDevice.data && (
            <SelectionMenu
              size={centerSquareSize}
              // TODO - Only hide the invoice if it has expired or is manually
              // cancelled. This will provide the best user experience since an
              // invoice will only be hidden if it is no longer usable or the
              // user explicitly indicates they don't want to pay it.
              canShowInvoice={!screensaverActive}
              inventory={loadableDevice.data.inventory}
            />
        )}
        {loadableDevice.state === 'loaded' && !loadableDevice.data && (
            <div style={{position: 'relative'}}>
              <Paper
                style={{
                  height: `${centerSquareSize}px`,
                  width: `${centerSquareSize}px`
                }}
              >
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    position: 'absolute',
                    top: '50%',
                    transform: 'translate(0, -50%)'
                  }}
                >
                  <Typography style={{paddingBottom: '20px'}}>
                    Device is not setup! Please login to an admin account on
                    another device and enter the following setup code:
                  </Typography>
                  {renderDeviceSetupCode()}
                </div>
              </Paper>
              {supportedExecutionCommands.state === 'error' && (
                  <div style={{position: 'absolute', marginTop: '20px'}}>
                    <Alert
                      severity={'error'}
                      action={
                        <Button onClick={loadSupportedExecutionCommands}>
                          Retry
                        </Button>
                      }
                    >
                      Failed to load device execution commands!
                    </Alert>
                  </div>
              )}
            </div>
        )}
      </div>
      <div style={{position: 'absolute', top: 0, right: 0, padding: '10px'}}>
        <Chip
          icon={
            <CircleIcon
              color={connectionStatus === 'connected' ? 'success' : 'error'}
            />
          }
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