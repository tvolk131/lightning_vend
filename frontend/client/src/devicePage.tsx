import * as React from 'react';
import {AsyncLoadableData, getAsyncLoadableDataStats} from './api/sharedApi';
import {
  ExecutionCommands,
  executionCommandsAreEqual
} from '../../shared/commandExecutor';
import {useCallback, useEffect, useRef, useState} from 'react';
import Alert from '@mui/material/Alert';
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

  const [executionCommands, setExecutionCommands] =
    useState<AsyncLoadableData<ExecutionCommands>>({state: 'loading'});

  const loadAndSaveExecutionCommands = async () => {
    setExecutionCommands({state: 'loading'});
    try {
      const res = await axios.get('http://localhost:21000/listCommands');

      const {
        nullCommands,
        boolCommands
      } = res.data as ExecutionCommands;

      await deviceApi.setDeviceExecutionCommands({nullCommands, boolCommands});
      setExecutionCommands({
        state: 'loaded',
        data: {
          nullCommands,
          boolCommands
        }
      });
    } catch (err) {
      setExecutionCommands({state: 'error'});
    }
  };

  // Load execution commands from the device if the device is already claimed
  // and setup, and the previously loaded commands differ from the current ones.
  useEffect(() => {
    if (loadableDevice.state === 'loaded' &&
        loadableDevice.data &&
        'device' in loadableDevice.data) {
      const device = loadableDevice.data.device;
      const savedExecutionCommands: ExecutionCommands = {
        nullCommands: device.nullExecutionCommands,
        boolCommands: device.boolExecutionCommands
      };
      if (executionCommands.state !== 'loaded' || (
            executionCommands.state === 'loaded' &&
            !executionCommandsAreEqual(
              savedExecutionCommands,
              executionCommands.data
            )
          )) {
        loadAndSaveExecutionCommands();
      }
    }
  }, [loadableDevice]);

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

  const loadableDeviceStats = getAsyncLoadableDataStats(loadableDevice);

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
        {/* TODO - Indicate whether we're still loading the device and/or using
            cached data. And if we're in an error state, indicate that the
            device failed to load, and allow retry. */}
        {loadableDeviceStats.data && 'device' in loadableDeviceStats.data && (
          <SelectionMenu
            size={centerSquareSize}
            // TODO - Only hide the invoice if it has expired or is manually
            // cancelled. This will provide the best user experience since an
            // invoice will only be hidden if it is no longer usable or the
            // user explicitly indicates they don't want to pay it.
            canShowInvoice={!screensaverActive}
            inventory={loadableDeviceStats.data.device.inventory}
          />
        )}
        {loadableDeviceStats.data &&
         'unclaimedDevice' in loadableDeviceStats.data && (
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
                <Typography variant={'h3'}>
                  {loadableDeviceStats.data.unclaimedDevice.setupCode}
                </Typography>
              </div>
            </Paper>
            {executionCommands.state === 'error' && (
                <div style={{position: 'absolute', marginTop: '20px'}}>
                  <Alert
                    severity={'error'}
                    action={
                      <Button onClick={loadAndSaveExecutionCommands}>
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
        {!loadableDeviceStats.data && (() => {
          if (loadableDeviceStats.state === 'loading') {
            return (
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
            );
          }

          if (loadableDeviceStats.state === 'error') {
            return (
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
            );
          }
        })()}
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
        <Typography
          color={theme.palette.text.primary}
          variant={'h3'}
        >
          Tap Me!
        </Typography>
      </div>
    </div>
  );
};