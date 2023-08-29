import * as React from 'react';
import {AuthenticatedAdminPage} from './authenticatedAdminPage';
import CircularProgress from '@mui/material/CircularProgress';
import {LoginBox} from './loginBox';
import {adminApi} from '../api/adminApi';
import {useTheme} from '@mui/material/styles';

export const AdminPage = () => {
  adminApi.useSocket();
  const loadableAdminData = adminApi.useLoadableAdminData();
  const theme = useTheme();

  return (
    <div
      style={{
        padding: theme.spacing(2),
        margin: 'auto',
        maxWidth: '1000px'
      }}
    >
      {loadableAdminData.state === 'loading' && (
        <div
          style={{
            margin: 0,
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <CircularProgress size={150}/>
        </div>
      )}
      {loadableAdminData.state === 'error' && <LoginBox/>}
      {loadableAdminData.state === 'loaded' && (
        <AuthenticatedAdminPage adminData={loadableAdminData.data}/>
      )}
    </div>
  );
};