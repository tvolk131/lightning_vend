import * as React from 'react';
import {
  deviceSetupCodeAllowedCharacters,
  deviceSetupCodeLength
} from '../../../shared/constants';
import AddIcon from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import CircleIcon from '@mui/icons-material/Circle';
import CircularProgress from '@mui/material/CircularProgress';
import {DeviceSettingsPanel} from './deviceSettingsPanel';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Fab from '@mui/material/Fab';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import {LoginBox} from './loginBox';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {adminApi} from '../api/adminApi';
import {useState} from 'react';
import {useTheme} from '@mui/material/styles';

// TODO - Flesh out and clean up admin page.
export const AdminPage = () => {
  adminApi.useSocket();
  const loadableAdminData = adminApi.useLoadableAdminData();

  const theme = useTheme();

  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);

  const [showClaimDeviceDialog, setShowClaimDeviceDialog] = useState(false);
  const [claimedDeviceSetupCode, setClaimedDeviceSetupCode] = useState('');
  const [claimedDeviceDisplayName, setClaimedDeviceDisplayName] = useState('');

  const hideClaimDeviceDialog = () => {
    setShowClaimDeviceDialog(false);
    setClaimedDeviceSetupCode('');
    setClaimedDeviceDisplayName('');
  };

  return (
    <div
      style={{
        padding: theme.spacing(2),
        margin: 'auto',
        maxWidth: '1000px'
      }}
    >
      {loadableAdminData.state === 'loading' && <CircularProgress/>}
      {loadableAdminData.state === 'error' && <LoginBox/>}
      {loadableAdminData.state === 'loaded' && (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Paper>
              <List>
                {loadableAdminData.data.deviceViews.map((deviceView, index) => {
                  return (
                    <ListItemButton
                      selected={selectedDeviceIndex === index}
                      onClick={() => setSelectedDeviceIndex(index)}
                    >
                      <ListItemIcon>
                        <CircleIcon
                          color={deviceView.isOnline ? 'success' : 'error'}
                        />
                      </ListItemIcon>
                      <ListItemText
                        color={''}
                        primary={deviceView.device.displayName}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={8}>
            {
              loadableAdminData.data.deviceViews[selectedDeviceIndex] ?
                <DeviceSettingsPanel
                  device={
                    loadableAdminData
                      .data
                      .deviceViews[selectedDeviceIndex]
                      .device
                  }
                />
                :
                <Paper>
                  <Typography variant={'h2'}>
                    No Device Selected
                  </Typography>
                </Paper>
            }
          </Grid>
        </Grid>
      )}
      {loadableAdminData.state === 'loaded' && (
        <div>
          <Fab
            color={'primary'}
            style={{position: 'fixed', bottom: '20px', right: '20px'}}
            onClick={() => setShowClaimDeviceDialog(true)}
          >
            <AddIcon/>
          </Fab>
          <Dialog
            onClose={() => setShowClaimDeviceDialog(false)}
            open={showClaimDeviceDialog}
          >
            <DialogTitle>Claim a New Device</DialogTitle>
            <DialogContent>
              <DialogContentText>
                To claim a new device, enter the setup code on the device and
                pick a name for the device.
              </DialogContentText>
              <div style={{marginRight: '-10px'}}>
                <TextField
                  label={'Setup Code'}
                  onChange={(e) => setClaimedDeviceSetupCode(
                    e.target.value.toUpperCase().trim().replace(
                      new RegExp(`[^${deviceSetupCodeAllowedCharacters}]`, 'g'),
                      ''
                    ).substring(0, deviceSetupCodeLength))
                  }
                  value={claimedDeviceSetupCode}
                  style={{marginTop: '10px', marginRight: '10px'}}
                />
                <TextField
                  label={'Display Name'}
                  onChange={(e) => setClaimedDeviceDisplayName(e.target.value)}
                  value={claimedDeviceDisplayName}
                  style={{marginTop: '10px', marginRight: '10px'}}
                />
              </div>
            </DialogContent>
            <DialogActions>
              <Button onClick={hideClaimDeviceDialog}>Cancel</Button>
              <Button
                disabled={
                  claimedDeviceSetupCode.length !== deviceSetupCodeLength ||
                  claimedDeviceDisplayName.trim().length === 0
                }
                onClick={() => {
                  adminApi.claimDevice(
                    claimedDeviceSetupCode,
                    claimedDeviceDisplayName.trim()
                  ).then(hideClaimDeviceDialog);
                }}
              >
                Claim Device
              </Button>
            </DialogActions>
          </Dialog>
        </div>
      )}
    </div>
  );
};