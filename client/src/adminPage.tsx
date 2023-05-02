import * as React from 'react';
import {
  CircularProgress,
  Grid,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  useTheme
} from '@mui/material';
import {Circle as CircleIcon} from '@mui/icons-material';
import {DeviceSettingsPanel} from './adminPage/deviceSettingsPanel';
import {LoginBox} from './adminPage/loginBox';
import {adminApi} from './api/adminApi';
import {useState} from 'react';

// TODO - Flesh out and clean up admin page.
export const AdminPage = () => {
  adminApi.useSocket();
  const loadableAdminData = adminApi.useLoadableAdminData();

  const theme = useTheme();

  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);

  return (
    <div style={{padding: theme.spacing(2), margin: 'auto', maxWidth: '1000px'}}>
      {loadableAdminData.state === 'loading' && <CircularProgress/>}
      {loadableAdminData.state === 'error' && <LoginBox/>}
      {loadableAdminData.state === 'loaded' && (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Paper>
              <List>
                {loadableAdminData.data.devices.map((device, index) => {
                  return (
                    <ListItemButton
                      selected={selectedDeviceIndex === index}
                      onClick={() => setSelectedDeviceIndex(index)}
                    >
                      <ListItemIcon>
                        <CircleIcon color={device.isOnline ? 'success' : 'error'}/>
                      </ListItemIcon>
                      <ListItemText color={''} primary={device.deviceData.displayName}/>
                    </ListItemButton>
                  );
                })}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={8}>
            {
              loadableAdminData.data.devices[selectedDeviceIndex] ?
                <DeviceSettingsPanel
                  adminDeviceView={loadableAdminData.data.devices[selectedDeviceIndex]}
                />
                :
                <Paper><Typography variant={'h2'}>No Device Selected</Typography></Paper>
            }
          </Grid>
        </Grid>
      )}
    </div>
  );
};