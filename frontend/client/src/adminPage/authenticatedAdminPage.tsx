import * as React from 'react';
import {
  deviceSetupCodeAllowedCharacters,
  deviceSetupCodeLength
} from '../../../shared/constants';
import AddIcon from '@mui/icons-material/Add';
import {AdminData} from '../../../shared/adminSocketTypes';
import Button from '@mui/material/Button';
import CircleIcon from '@mui/icons-material/Circle';
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
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {adminApi} from '../api/adminApi';
import {useState} from 'react';

interface AuthenticatedAdminPageProps {
  adminData: AdminData
}

export const AuthenticatedAdminPage = (props: AuthenticatedAdminPageProps) => {
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
    <div>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Paper>
            <List>
              {props.adminData.deviceViews.map((deviceView, index) => {
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
            props.adminData.deviceViews[selectedDeviceIndex] ?
              <DeviceSettingsPanel
                device={
                  props.adminData
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
  );
};
